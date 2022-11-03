import ffmpeg, { ffprobe, FfmpegCommand } from "fluent-ffmpeg";
import path from "path";
import * as os from "os";
import * as fs from "fs/promises";
import { BaseEntity, Column, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn, Relation } from "typeorm";
import { MediaServer } from "..";
import Image from "./image";
import { randomUUID } from "crypto";
import Stream from "./stream";
import { TranscodeError } from "../lib/errors/transcodeError";

@Entity()
export default class Thumbnail extends BaseEntity {
    @PrimaryGeneratedColumn("uuid")
    id: string;
    /** The start time (in seconds) where the preview belongs */
    @Column()
    from: number;
    /** The end time (in seconds) where the preview belongs */
    @Column()
    to: number;
    @OneToOne(() => Image)
    @JoinColumn()
    image: Relation<Image>;
    @ManyToOne(() => Stream, (stream) => stream.thumbnails)
    stream: Relation<Stream>;

    /** Generate preview thumbnails every n seconds
     * @param every - every n second
     */
    public static async fromMediaFile(
        server: MediaServer,
        filePath: string,
        every: number,
        progressReport = (percentage: number, fps: number) => {},
    ) {
        server.mediaToolLogger.debug(`Generating thumbnails for "${filePath}"...`);

        const tempDirectory = path.join(os.tmpdir(), randomUUID());
        const outputFilename = path.join(tempDirectory, "%04d.jpg");
        await fs.mkdir(tempDirectory, { recursive: true });

        async function cleanup() {
            await fs.rmdir(tempDirectory, { recursive: true });
        }

        try {
            // Get duration of media
            const duration = await new Promise<number>((resolve, reject) => {
                ffprobe(filePath, (err, metadata) => {
                    if (err) reject(err);
                    if (!metadata.format.duration) reject(new Error("Unknown media duration"));
                    resolve(metadata.format.duration);
                });
            });
            const timestamps: number[] = [];

            for (let currentTimestamp = 0; currentTimestamp < duration; currentTimestamp += 10) {
                timestamps.push(currentTimestamp);
            }

            const thumbnails = await new Promise<Thumbnail[]>((resolve, reject) => {
                try {
                    const command = ffmpeg(filePath, {});
                    command.on("end", async () => {
                        let filenames = await fs.readdir(tempDirectory);
                        filenames = filenames.sort();
                        filenames.shift();
                        const copyOperations = [];
                        for (const [i, filename] of filenames.sort().entries()) {
                            copyOperations.push(
                                (async () => {
                                    // Save image in database
                                    const image = new Image();
                                    image.type = "image/jpeg";
                                    await image.save();

                                    await fs.copyFile(path.join(tempDirectory, filename), await image.getLocation(server));

                                    // Save thumbnail information in database
                                    const thumbnail = new Thumbnail();
                                    thumbnail.from = i * every;
                                    thumbnail.to = (i + 1) * every - 1;
                                    thumbnail.image = image;
                                    await thumbnail.save();
                                    return thumbnail;
                                })(),
                            );
                        }
                        const thumbnails = await Promise.all(copyOperations);
                        await cleanup();
                        server.mediaToolLogger.debug(`Successfully generated thumbnails for "${filePath}"`);
                        server.mediaToolLogger.debug(`Saved in "${tempDirectory}"`);
                        resolve(thumbnails);
                    });
                    command.on("error", async (error) => {
                        await cleanup();
                        reject(error);
                    });
                    command.on("progress", (progress) => {
                        progressReport(progress.percent, progress.currentFps);
                    });
                    command.fps(1 / every);
                    command.size("150x?");
                    command.output(outputFilename);
                    command.run();
                } catch (err) {
                    reject(err);
                }
            });
            return thumbnails;
        } catch (err) {
            try {
                await cleanup();
            } catch {}
            throw new TranscodeError("Error generating thumbnails for media", err);
        }
    }
}
