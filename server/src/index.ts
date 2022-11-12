import "reflect-metadata";
import { TMDB } from "./lib/tmdb";
import { Indexer } from "./lib/indexer";
import Ffmpeg from "fluent-ffmpeg";
import path from "path";
import { getLogger, Logger } from "log4js";
import * as fs from "fs/promises";
import Fastify, { FastifyBaseLogger, FastifyInstance, RawReplyDefaultExpression, RawRequestDefaultExpression, RawServerDefault } from "fastify";
import { DataSource } from "typeorm";
import CastMember from "./entities/castMember";
import Episode from "./entities/episode";
import Genre from "./entities/genre";
import Image from "./entities/image";
import Movie from "./entities/movie";
import Profile from "./entities/profile";
import Progress from "./entities/progress";
import Season from "./entities/season";
import Show from "./entities/show";
import Stream from "./entities/stream";
import StreamPart from "./entities/streamPart";
import Watchable from "./entities/watchable";
import Thumbnail from "./entities/thumbnail";
import routes from "./routes";
import { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import ContentRating from "./entities/contentRating";
import { Static, Type } from "@sinclair/typebox";
import Ajv from "ajv";
import IndexLog from "./entities/indexLog";
import { readFileSync } from "fs";

declare module "fastify" {
    export interface FastifyInstance {
        mediaServer: { server: MediaServer };
    }
}

const MediaServerConfig = Type.Object({
    database: Type.Object({
        host: Type.String(),
        port: Type.Number(),
        username: Type.String(),
        password: Type.String(),
        database: Type.String(),
    }),
    saveDirectory: Type.String(),
    port: Type.Number(),
    host: Type.String(),
    ffmpeg: Type.Optional(Type.String()),
    hardwareAcceleration: Type.Boolean(),
    tmdb: Type.Object({
        apiKey: Type.String(),
    }),
    autoIndex: Type.Object({
        enabled: Type.Boolean(),
        directory: Type.String(),
        removeAfterIndexing: Type.Boolean(),
    }),
    media: Type.Object({
        generateThumbnails: Type.Boolean(),
        qualityLevels: Type.Array(
            Type.Object(
                {
                    height: Type.Number({ minimum: 1 }),
                    bitrate: Type.Number({ minimum: 1 }),
                    audioBitrate: Type.Number({ minimum: 1 }),
                    crf: Type.Number({ minimum: 0, maximum: 51 }),
                },
                { minProperties: 1 },
            ),
        ),
    }),
});

export type FastifyInstanceType = FastifyInstance<
    RawServerDefault,
    RawRequestDefaultExpression<RawServerDefault>,
    RawReplyDefaultExpression<RawServerDefault>,
    FastifyBaseLogger,
    TypeBoxTypeProvider
>;

export class MediaServer {
    public indexer: Indexer;
    public tmdb: TMDB;
    public dataSource: DataSource;
    public logger: Logger;
    public mediaToolLogger: Logger;
    public webServer: FastifyInstanceType;
    public hardwareAcceleration: boolean;

    private saveDirectory: string;
    private port: number;
    private host: string;

    constructor(config: Static<typeof MediaServerConfig>) {
        this.logger = getLogger("mediaserver");
        this.logger.level = "debug";
        this.mediaToolLogger = getLogger("mediatool");
        this.mediaToolLogger.level = "debug";

        // Validate config
        const configValidator = new Ajv().compile(MediaServerConfig);
        if (!configValidator(config)) {
            this.logger.error("Invalid config:", configValidator.errors);
            process.exit(1);
        }

        this.saveDirectory = config.saveDirectory;
        this.indexer = new Indexer(this, {
            autoIndex: config.autoIndex,
            generateThumbnails: config.media.generateThumbnails,
            qualityLevels: config.media.qualityLevels,
        });
        this.tmdb = new TMDB(config.tmdb.apiKey);

        if (process.platform == "win32") {
            Ffmpeg.setFfmpegPath(path.join(config.ffmpeg, "ffmpeg.exe"));
            Ffmpeg.setFfprobePath(path.join(config.ffmpeg, "ffprobe.exe"));
        }

        this.hardwareAcceleration = config.hardwareAcceleration;

        this.dataSource = new DataSource({
            type: "mysql",
            host: config.database.host,
            port: config.database.port,
            username: config.database.username,
            password: config.database.password,
            database: config.database.database,
            synchronize: true, // Enable in production and when changing database
            entities: [
                CastMember,
                Episode,
                Genre,
                Image,
                Movie,
                Profile,
                Progress,
                Season,
                Show,
                Stream,
                StreamPart,
                Watchable,
                Thumbnail,
                ContentRating,
                IndexLog,
            ],
        });

        this.port = config.port;
        this.host = config.host;
        this.webServer = Fastify();
        this.webServer.withTypeProvider<TypeBoxTypeProvider>();
        this.webServer.decorate("mediaServer", { server: this });
        this.webServer.register(routes);
    }

    public async boot() {
        this.logger.debug("Booting media server...");
        await this.dataSource.initialize();
        const addr = await this.webServer.listen({ port: this.port, host: this.host });
        this.indexer.autoIndex();
        this.logger.debug("Media server booted successfully, reachable through " + addr);
    }

    public async getSaveDirectory(target: "image" | "video") {
        const targetPath = path.join(this.saveDirectory, target);
        try {
            await fs.access(targetPath);
        } catch {
            this.logger.debug("Creating save directory");
            await fs.mkdir(targetPath, { recursive: true });
        }
        return targetPath;
    }
}

// Load config
const config = JSON.parse(readFileSync("../config.json", "utf8"));
const server = new MediaServer(config as any);
server.boot();
