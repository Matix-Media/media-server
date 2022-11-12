import * as fs from "fs/promises";
import ptt from "parse-torrent-title";
import { MediaServer } from "..";
import Watchable from "../entities/watchable";
import { TMDB, TMDBImageType, TMDBModel } from "./tmdb";
import { Logger, getLogger } from "log4js";
import Genre from "../entities/genre";
import Image from "../entities/image";
import { ffprobe, FfprobeData } from "fluent-ffmpeg";
import Season from "../entities/season";
import Episode from "../entities/episode";
import Show from "../entities/show";
import Stream from "../entities/stream";
import Thumbnail from "../entities/thumbnail";
import Movie from "../entities/movie";
import path from "path";
import ContentRating from "../entities/contentRating";
import CastMember from "../entities/castMember";
import array from "./utils/array";
import chokidar from "chokidar";
import IndexLog from "../entities/indexLog";
import file from "./utils/file";
import { randomUUID } from "crypto";

export interface IndexerConfig {
    autoIndex: {
        enabled: boolean;
        directory: string;
        removeAfterIndexing: boolean;
    };
    generateThumbnails: boolean;
    qualityLevels: {
        height: number;
        bitrate: number;
        crf: number;
    }[];
}

export interface QueueItem {
    id: string;
    filePath: string;
    action: string;
    percentage: number;
    running: boolean;
}

export class Indexer {
    private server: MediaServer;
    private logger: Logger;
    private config: IndexerConfig;
    private localAutoIndexCache: Record<string, NodeJS.Timeout> = {};
    public indexQueue: QueueItem[] = [];

    constructor(server: MediaServer, config: IndexerConfig) {
        this.server = server;
        this.logger = getLogger("indexer");
        this.logger.level = "debug";
        this.config = config;
    }

    private removeFromQueue(queueItem: QueueItem) {
        const queueIndex = this.indexQueue.findIndex((item) => item.id == queueItem.id);
        this.indexQueue.splice(queueIndex, 1);
    }

    private isQueueRunning() {
        return !!this.indexQueue.find((i) => i.running);
    }

    private executeNextInQueue() {
        if (this.indexQueue.length > 0) {
            this.logger.debug("Executing next queue item");
            this.triggerIndex(this.indexQueue[0].filePath, this.indexQueue[0]);
        }
    }

    private async triggerIndex(filePath: string, queueItem?: QueueItem) {
        if (!queueItem) {
            queueItem = {
                id: randomUUID(),
                filePath,
                action: "",
                percentage: 0,
                running: false,
            };
            this.indexQueue.push(queueItem);
        }

        if (this.isQueueRunning()) return;

        queueItem.running = true;

        let indexLog = await IndexLog.findOneBy({ filepath: filePath });
        if (indexLog) {
            this.removeFromQueue(queueItem);
            this.logger.debug(filePath, "already indexed, skipping");
            this.executeNextInQueue();
            return;
        }

        this.logger.debug(filePath, "picked up, indexing");
        indexLog = new IndexLog();
        indexLog.filepath = filePath;
        indexLog.indexing = true;
        await indexLog.save();

        try {
            const watchable = await this.indexFile(filePath, (action, percentage) => {
                this.logger.debug(`[Index-Progress] ${action}: ${percentage.toFixed(2)}`);
                queueItem.action = action;
                queueItem.percentage = percentage;
            });
            indexLog.indexing = false;
            indexLog.watchable = watchable;
            await indexLog.save();

            if (this.config.autoIndex.removeAfterIndexing) {
                this.logger.debug("Removing", filePath);
                await fs.rm(filePath);
            }
        } catch (err) {
            this.logger.error(`Error indexing "${filePath}":`, err);
            indexLog.error = "Time: " + new Date().toISOString() + "\n" + err.toString();
            if ("stack" in err) indexLog.error += "\n\nStack:\n" + err.stack;
            indexLog.failed = true;
            indexLog.indexing = false;
            await indexLog.save();
        }

        this.removeFromQueue(queueItem);
        this.executeNextInQueue();
    }

    private async debounceIndex(filePath: string) {
        if (this.localAutoIndexCache[filePath]) clearTimeout(this.localAutoIndexCache[filePath]);

        this.localAutoIndexCache[filePath] = setTimeout(() => {
            this.localAutoIndexCache[filePath] = undefined;
            this.triggerIndex(filePath);
        }, 10000);
    }

    public async autoIndex() {
        if (!this.config.autoIndex.enabled) return;

        const watcher = chokidar.watch(this.config.autoIndex.directory, {
            persistent: false,
            usePolling: true,
            ignored: ["*.part", "*.!qB", "*.!qb", "*.!ut"],
        });
        await new Promise((resolve) => watcher.on("ready", resolve));

        for (const currentFile of await file.getAllFilesRecursive(this.config.autoIndex.directory)) this.debounceIndex(path.resolve(currentFile));

        watcher.on("raw", async (event, filename, stats) => {
            if (!["change", "rename"].includes(event)) return;
            if (stats.isDirectory) return;
            if (!(await file.fileExists(filename))) return;

            this.debounceIndex(filename);
        });
    }

    public async indexFile(filePath: string, progressReport = (action: string, percentage: number) => {}): Promise<Watchable> {
        this.logger.debug(`Indexing "${filePath}"...`);

        try {
            progressReport("gatheringInformation", 0);

            try {
                await fs.access(filePath);
            } catch (err) {
                throw new IndexError("File not found", err);
            }
            const meta = ptt.parse(path.parse(filePath).name);
            let watchable = new Watchable();
            watchable.name = meta.title;

            // Extract information using FFprobe
            this.logger.debug("Extracting media information...");
            const probe = await new Promise<FfprobeData>((resolve, reject) => {
                ffprobe(filePath, (err, metadata) => {
                    if (err) reject(err);
                    resolve(metadata);
                });
            });
            if (probe.streams.length > 0) watchable.quality = probe.streams[0].width + "x" + probe.streams[0].height;

            // Generate target formats and thumbnails
            let stream: Stream;
            try {
                this.logger.debug("Generating source files...");
                stream = await Stream.fromMediaFile(this.server, filePath, this.config.qualityLevels, (percentage) => {
                    if (percentage < 100) {
                        progressReport("generatingStream", percentage);
                    } else {
                        progressReport("importingPlaylist", 0);
                    }
                });
            } catch (err) {
                throw new IndexError("Error generating stream", err);
            }

            try {
                if (this.config.generateThumbnails)
                    stream.thumbnails = await Thumbnail.fromMediaFile(this.server, filePath, 10, (percentage) =>
                        progressReport("generatingThumbnails", percentage),
                    );
                await stream.save();
            } catch (err) {
                throw new IndexError("Error generating thumbnails", err);
            }

            progressReport("lookingUp", 0);

            // Try to find media online (through TMDB)
            if (meta.season != undefined && meta.episode != undefined) {
                // TV Show
                this.logger.debug("Looking this show up online...");
                let show = new Show();
                let season = new Season();
                let episode = new Episode();
                watchable.type = "show";
                watchable.show_content = show;
                watchable.adult = false;
                season.season_number = meta.season;
                season.name = "Season " + meta.season;
                episode.episode_number = meta.episode;
                episode.name = meta.title;
                episode.stream = stream;
                if (probe.format.duration) episode.duration = probe.format.duration;
                else episode.duration = 0;

                watchable = (await this.lookupShow(watchable, show, season, episode, filePath)).watchable;
            } else {
                // Movie
                this.logger.debug("Looking this movie up online ...");
                const movie = new Movie();
                watchable.movie_content = movie;
                watchable.type = "movie";
                movie.stream = stream;
                if (probe.format.duration) movie.duration = probe.format.duration;
                else movie.duration = 0;

                watchable = (await this.lookupMovie(watchable, movie, filePath)).watchable;
            }

            this.logger.debug(`Successfully indexed "${filePath}"`);

            return watchable;
        } catch (err) {
            // Clean-up implemented in the future
            throw new IndexError("Error indexing", err);
        }
    }

    async lookupMovie(watchable: Watchable, movie: Movie, filePath: string) {
        const meta = ptt.parse(path.parse(filePath).name);

        if (meta.title.length > 0) {
            const searchResults = await this.server.tmdb.searchMovie(meta.title);
            if (searchResults.total_results > 0) {
                const result = searchResults.results[0];
                const movieInfos = await this.server.tmdb.getMovie(result.id);

                watchable.tmdb_id = result.id;
                watchable.name = result.title;
                watchable.description = result.overview;
                watchable.rating = result.vote_average;
                watchable.adult = result.adult;
                watchable.year = new Date(result.release_date).getFullYear();
                watchable.genres = await Promise.all(movieInfos.genres.map((tmdbGenre) => Genre.getOrCreate(tmdbGenre.id, tmdbGenre.name)));
                watchable.content_ratings = await Promise.all(
                    array
                        .unique(
                            movieInfos.releases.countries.sort((a, b) => (new Date(a.release_date) > new Date(b.release_date) ? -1 : 1)),
                            (i) => i.iso_3166_1,
                        )
                        .map((rating) => ContentRating.getOrCreate(rating.iso_3166_1, rating.certification)),
                );
                watchable.directors = await Promise.all(
                    movieInfos.credits.crew
                        .filter((castMember) => castMember.department == "Directing")
                        .map((castMember) => CastMember.getOrCreate(castMember.id, castMember.name, castMember.popularity)),
                );
                watchable.cast = await Promise.all(
                    movieInfos.credits.cast
                        .slice(0, 20)
                        .map((castMember) => CastMember.getOrCreate(castMember.id, castMember.name, castMember.popularity)),
                );
                watchable.writers = await Promise.all(
                    movieInfos.credits.crew
                        .filter((castMember) => castMember.department == "Writing")
                        .map((castMember) => CastMember.getOrCreate(castMember.id, castMember.name, castMember.popularity)),
                );
                if (result.backdrop_path)
                    watchable.backdrop = await Image.fromURL(
                        this.server,
                        await this.server.tmdb.getImageUrl(result.backdrop_path, TMDBImageType.backdrop, TMDB.COMMON_IMAGE_SIZES.backdrop.original),
                    );
                if (result.poster_path)
                    watchable.poster = await Image.fromURL(
                        this.server,
                        await this.server.tmdb.getImageUrl(result.poster_path, TMDBImageType.poster, TMDB.COMMON_IMAGE_SIZES.poster.w500),
                    );

                const images = await this.server.tmdb.getImages(result.id, TMDBModel.movies);
                if (images.logo)
                    watchable.logo = await Image.fromURL(
                        this.server,
                        await this.server.tmdb.getImageUrl(images.logo.file_path, TMDBImageType.logo, TMDB.COMMON_IMAGE_SIZES.logo.original),
                    );
            }
        }

        await movie.save();

        return { watchable, movie };
    }

    async lookupShow(watchable: Watchable, show: Show, season: Season, episode: Episode, filePath: string) {
        const meta = ptt.parse(path.parse(filePath).name);

        if (meta.title.length > 0) {
            const searchResults = await this.server.tmdb.searchShow(meta.title);
            if (searchResults.total_results > 0) {
                const result = searchResults.results[0];
                const showInfos = await this.server.tmdb.getShow(result.id);

                const existingWatchable = await Watchable.findOne({
                    where: { tmdb_id: showInfos.id },
                    relations: { show_content: { seasons: { episodes: true } } },
                });
                if (existingWatchable) {
                    watchable = existingWatchable;
                    show = watchable.show_content;
                } else {
                    show.until_year = new Date(showInfos.last_air_date).getFullYear();

                    watchable.tmdb_id = result.id;
                    watchable.name = result.name;
                    watchable.description = result.overview;
                    watchable.rating = showInfos.vote_average;
                    watchable.year = new Date(result.first_air_date).getFullYear();
                    watchable.genres = await Promise.all(showInfos.genres.map((tmdbGenre) => Genre.getOrCreate(tmdbGenre.id, tmdbGenre.name)));
                    watchable.content_ratings = await Promise.all(
                        showInfos.content_ratings.results.map((rating) => ContentRating.getOrCreate(rating.iso_3166_1, rating.rating)),
                    );
                    watchable.directors = await Promise.all(
                        showInfos.credits.crew
                            .filter((castMember) => castMember.department == "Directing")
                            .map((castMember) => CastMember.getOrCreate(castMember.id, castMember.name, castMember.popularity)),
                    );
                    watchable.cast = await Promise.all(
                        showInfos.credits.cast.map((castMember) => CastMember.getOrCreate(castMember.id, castMember.name, castMember.popularity)),
                    );
                    watchable.writers = await Promise.all(
                        showInfos.credits.crew
                            .filter((castMember) => castMember.department == "Writing")
                            .map((castMember) => CastMember.getOrCreate(castMember.id, castMember.name, castMember.popularity)),
                    );
                    if (showInfos.created_by.length > 0) watchable.creator = showInfos.created_by[0].name;
                    if (showInfos.backdrop_path)
                        watchable.backdrop = await Image.fromURL(
                            this.server,
                            await this.server.tmdb.getImageUrl(
                                showInfos.backdrop_path,
                                TMDBImageType.backdrop,
                                TMDB.COMMON_IMAGE_SIZES.backdrop.original,
                            ),
                        );
                    if (showInfos.poster_path)
                        watchable.poster = await Image.fromURL(
                            this.server,
                            await this.server.tmdb.getImageUrl(showInfos.poster_path, TMDBImageType.poster, TMDB.COMMON_IMAGE_SIZES.poster.w500),
                        );

                    const images = await this.server.tmdb.getImages(result.id, TMDBModel.tvShows);
                    if (images.logo)
                        watchable.logo = await Image.fromURL(
                            this.server,
                            await this.server.tmdb.getImageUrl(images.logo.file_path, TMDBImageType.logo, TMDB.COMMON_IMAGE_SIZES.logo.original),
                        );
                }

                // Get season/episode information
                if (showInfos.seasons.find((season) => season.season_number == meta.season)) {
                    const seasonInfos = await this.server.tmdb.getShowSeason(showInfos.id, meta.season);
                    const existingSeason = existingWatchable ? show.seasons.find((season) => season.season_number == meta.season) : null;
                    if (existingSeason) {
                        season = existingSeason;
                    } else {
                        season.air_date = seasonInfos.air_date;
                        season.description = seasonInfos.overview;
                        season.name = seasonInfos.name;

                        if (!show.seasons) show.seasons = [];
                        show.seasons.push(season);
                    }

                    const episodeInfos = seasonInfos.episodes.find((episode) => episode.episode_number == meta.episode);
                    if (episodeInfos) {
                        episode.name = episodeInfos.name;
                        episode.description = episodeInfos.overview;
                        episode.episode_number = meta.episode;
                        if (episodeInfos.still_path)
                            episode.poster = await Image.fromURL(
                                this.server,
                                await this.server.tmdb.getImageUrl(episodeInfos.still_path, TMDBImageType.still, TMDB.COMMON_IMAGE_SIZES.still.w300),
                            );
                    }

                    if (!season.episodes) season.episodes = [];
                    season.episodes.push(episode);

                    await episode.save();
                    if (!existingSeason) await season.save();
                }

                if (!existingWatchable) await watchable.save();
            } else {
                await episode.save();
                await season.save();
                await show.save();
                await watchable.save();
            }
        }

        return { watchable, show, season, episode };
    }
}

export class IndexError extends Error {
    public originalError?: Error;

    constructor(message: string, originalError?: Error) {
        super(message + (originalError ? ` (${originalError.message})` : ""));
        if (originalError) this.originalError = originalError;
    }
}
