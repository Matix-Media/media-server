import { BaseEntity, Entity, PrimaryGeneratedColumn, Column, Relation, OneToOne, JoinColumn, OneToMany, ManyToOne, ManyToMany } from "typeorm";
import { MediaServer } from "..";
import Thumbnail from "./thumbnail";
import StreamPart from "./streamPart";
import path from "path";
import * as os from "os";
import { randomUUID } from "crypto";
import * as fs from "fs/promises";
import ffmpeg, { ffprobe, FfprobeData } from "fluent-ffmpeg";
import Progress from "./progress";
import { TranscodeError } from "../lib/errors/transcodeError";

const fallbackQualityLevels: { height: number; bitrate: number; audioBitrate: number; crf: number }[] = [
    { height: 480, bitrate: 1500, audioBitrate: 1000, crf: 30 },
    { height: 720, bitrate: 3000, audioBitrate: 2000, crf: 25 },
    { height: 1080, bitrate: 4500, audioBitrate: 4000, crf: 23 },
];

@Entity()
export default class Stream extends BaseEntity {
    @PrimaryGeneratedColumn("uuid")
    id: string;
    @OneToOne(() => StreamPart)
    @JoinColumn()
    first_part: Relation<StreamPart>;
    @OneToMany(() => Thumbnail, (thumbnail) => thumbnail.stream)
    thumbnails: Relation<Thumbnail[]>;
    @OneToMany(() => Progress, (progress) => progress.stream)
    progresses: Relation<Progress[]>;
    @Column()
    duration: number;

    // TODO: Add subtitles support
    public static async fromMediaFile(
        server: MediaServer,
        filePath: string,
        qualityLevels = fallbackQualityLevels,
        progressReport = (percentage: number, fps: number) => {},
    ) {
        server.mediaToolLogger.debug(`Generating hls for "${filePath}"...`);

        const tempDirectory = path.join(os.tmpdir(), randomUUID());
        const outputFilename = path.join(tempDirectory, "output-%v.m3u8");
        await fs.mkdir(tempDirectory, { recursive: true });

        server.mediaToolLogger.debug(`Temporarily saving to "${tempDirectory}"`);

        async function cleanup() {
            await fs.rm(tempDirectory, { recursive: true });
        }

        try {
            server.mediaToolLogger.debug("Getting media information");
            const inputInfo = await new Promise<FfprobeData>((resolve, reject) => {
                ffprobe(filePath, (err, metadata) => {
                    if (err) reject(err);
                    resolve(metadata);
                });
            });
            const inputVideoStreams = inputInfo.streams.filter((stream) => stream.codec_type == "video");
            const inputAudioStreams = inputInfo.streams.filter((stream) => stream.codec_type == "audio");
            const inputSubtitleStreams = inputInfo.streams.filter((stream) => stream.codec_type == "subtitle");

            await new Promise<void>((resolve, reject) => {
                try {
                    // niceness: Limit cpu usage (to prevent freezing of pc)
                    const command = ffmpeg(filePath, { niceness: 10 });

                    command.on("end", async () => {
                        resolve();
                    });

                    command.on("error", async (error, stdout, stderr) => {
                        await cleanup();
                        server.mediaToolLogger.error(stdout);
                        server.mediaToolLogger.error(stderr);
                        reject(error);
                    });

                    command.on("progress", (progress) => {
                        progressReport(progress.percent, progress.currentFps);
                    });

                    server.mediaToolLogger.debug(
                        "Video streams: " +
                            inputVideoStreams.length +
                            ", Audio streams: " +
                            inputAudioStreams.length +
                            ", Subtitle streams: " +
                            inputAudioStreams.length,
                    );

                    // Codec
                    //command.addOption("-c:a libmp3lame");

                    // Duplicate streams for different quality levels
                    for (let i = 0; i < qualityLevels.length; i++) {
                        for (let i1 = 0; i1 < inputVideoStreams.length; i1++) command.addOption(`-map 0:v:${i1}`);
                        for (let i2 = 0; i2 < inputAudioStreams.length; i2++) command.addOption(`-map 0:a:${i2}`);
                    }

                    for (let i = 0; i < inputSubtitleStreams.length; i++) command.addOption(`-map 0:s:${i}`);

                    // Adjust streams for quality levels
                    server.mediaToolLogger.debug("Adjusting streams for quality levels");
                    for (const [i, qualityLevel] of qualityLevels.entries()) {
                        for (let i1 = 0; i1 < inputVideoStreams.length; i1++) {
                            const videoStreamInfo = inputVideoStreams[i1];
                            const videoStream = i * inputVideoStreams.length + i1;

                            if (videoStreamInfo.codec_name != "h264") {
                                command.addOption(`-c:v:${i1} libx264`);
                                server.mediaToolLogger.debug(
                                    `[x${qualityLevel.height}] Transcoding video stream ${i1}:${videoStream} (source codec: ${videoStreamInfo.codec_name})`,
                                );
                            }
                            if (videoStreamInfo.height > qualityLevel.height) {
                                command.addOption(`-filter:v:${videoStream} scale=-2:${qualityLevel.height}`);
                                server.mediaToolLogger.debug(
                                    `[x${qualityLevel.height}] Scaling down video stream ${i1}:${videoStream} (source height: ${videoStreamInfo.height})`,
                                );
                            }

                            command.addOption(`-b:v:${videoStream} ${qualityLevel.bitrate}`);
                            command.addOption(`-crf:v:${videoStream} ${qualityLevel.crf}`);
                        }

                        for (let i2 = 0; i2 < inputAudioStreams.length; i2++) {
                            const audioStreamInfo = inputAudioStreams[i2];
                            const audioStream = i * inputAudioStreams.length + i2;

                            if (audioStreamInfo.codec_name != "mp3lame") {
                                command.addOption(`-c:a:${i2} libmp3lame`);
                                server.mediaToolLogger.debug(
                                    `[x${qualityLevel.height}] Transcoding audio stream ${i2}:${audioStream} (source codec: ${audioStreamInfo.codec_name})`,
                                );
                            }

                            command.addOption(`-b:a:${audioStream} ${qualityLevel.audioBitrate}`);
                        }
                    }

                    // Generate stream map
                    let streamMaps: string[] = [];
                    //let subtitleStreamMap = "";
                    //for (let i = 0; i < inputSubtitleStreams.length; i++) subtitleStreamMap += `s:${i},`;
                    //streamMaps.push(subtitleStreamMap + "sgroup:subtitles");

                    //let audioStreamMap = "";
                    //for (let i = 0; i < inputAudioStreams.length; i++) audioStreamMap += `a:${i},`;
                    //streamMaps.push(audioStreamMap + "agroup:audio,name:audio");

                    for (const [i, qualityLevel] of qualityLevels.entries()) {
                        let qualityAudioLevelStreamMap = "";
                        for (let i2 = 0; i2 < inputAudioStreams.length; i2++) qualityAudioLevelStreamMap += `a:${i * inputAudioStreams.length + i2},`;
                        streamMaps.push(qualityAudioLevelStreamMap + `agroup:audio_${qualityLevel.height},name:audio_${qualityLevel.height}p`);

                        let qualityVideoLevelStreamMap = "";
                        for (let i1 = 0; i1 < inputVideoStreams.length; i1++) qualityVideoLevelStreamMap += `v:${i * inputVideoStreams.length + i1},`;
                        streamMaps.push(
                            qualityVideoLevelStreamMap + `sgroup:subtitles,agroup:audio_${qualityLevel.height},name:${qualityLevel.height}p`,
                        );
                    }
                    command.addOption(`-var_stream_map`, streamMaps.join(" "));
                    server.mediaToolLogger.debug("Stream map:", streamMaps.join(" "));

                    // HLS options
                    command.addOption("-f hls");
                    command.addOption("-hls_playlist_type event");
                    command.addOption("-start_number 0");
                    command.addOption("-hls_time 10");
                    command.addOption("-hls_flags independent_segments");
                    command.addOption(`-master_pl_name`, "master.m3u8");
                    command.addOption("-hls_list_size 0");

                    if (server.hardwareAcceleration) command.addInputOption("-hwaccel auto");

                    // If more than one core available, leave one unused, to prevent freezing of pc
                    const availableCpus = os.cpus();
                    if (availableCpus.length > 1) {
                        server.mediaToolLogger.debug("Limiting threads to " + (availableCpus.length - 1) + "/" + availableCpus.length);
                        command.addOption("-threads " + availableCpus.length);
                    }

                    // Output file
                    command.output(outputFilename);

                    // Run command
                    command.run();

                    // Reference for command: https://gist.github.com/Andrey2G/78d42b5c87850f8fbadd0b670b0e6924
                    // StackOverflow: https://stackoverflow.com/questions/71913543/how-to-generate-multiple-resolutions-hls-using-ffmpeg-for-live-streaming
                } catch (err) {
                    reject(err);
                }
            });

            server.mediaToolLogger.debug(`Importing from master playlist (this could take a while)...`);

            let masterPlaylist = await fs.readFile(path.join(tempDirectory, "master.m3u8"), { encoding: "utf8" });

            for (const qualityLevel of qualityLevels) {
                const playlistPart = new StreamPart();
                playlistPart.playlist = true;
                playlistPart.has_subtitles = false;
                await playlistPart.save();

                const playlistName = "output-" + qualityLevel.height + "p.m3u8";
                masterPlaylist = masterPlaylist.replace(playlistName, playlistPart.id + ".m3u8");
                let playlist = await fs.readFile(path.join(tempDirectory, playlistName), { encoding: "utf8" });

                const videoStreams = playlist.match(/output-(\d*)p(\d*)\.ts/gm);

                for (const stream of videoStreams.reverse()) {
                    const streamPart = new StreamPart();
                    streamPart.has_subtitles = false;
                    await streamPart.save();

                    const streamPartPath = path.join(tempDirectory, stream);
                    const targetPath = path.join(await server.getSaveDirectory("video"), streamPart.id + ".ts");

                    // Save stream part
                    playlist = playlist.replace(stream, streamPart.id + ".ts");
                    await fs.copyFile(streamPartPath, targetPath);
                }

                // Save playlist
                await fs.writeFile(path.join(await server.getSaveDirectory("video"), playlistPart.id + ".m3u8"), playlist, { encoding: "utf8" });
            }

            // Save master playlist
            const masterPlaylistPart = new StreamPart();
            masterPlaylistPart.playlist = true;
            masterPlaylistPart.has_subtitles = false;
            await masterPlaylistPart.save();
            await fs.writeFile(path.join(await server.getSaveDirectory("video"), masterPlaylistPart.id + ".m3u8"), masterPlaylist, {
                encoding: "utf8",
            });

            await cleanup();

            const stream = new Stream();
            stream.duration = inputInfo.format.duration;
            stream.first_part = masterPlaylistPart;
            await stream.save();

            server.mediaToolLogger.debug(`Successfully generated hls for "${filePath}"`);

            return stream;
        } catch (err) {
            try {
                await cleanup();
            } catch {}
            throw new TranscodeError("Error transcoding media", err);
        }
    }
}
