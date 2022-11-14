import { FastifyReply, FastifyRequest, RegisterOptions } from "fastify";
import Stream from "../../../entities/stream";
import { NotFound, Forbidden, BadRequest, InternalServerError, Unauthorized } from "http-errors";
import StreamPart from "../../../entities/streamPart";
import Profile from "../../../entities/profile";
import { Type } from "@sinclair/typebox";
import { FastifyInstanceType } from "../../..";
import Watchable from "../../../entities/watchable";
import Progress from "../../../entities/progress";
import Image from "../../../entities/image";
import { TMDBModel } from "../../../lib/tmdb";
import Episode from "../../../entities/episode";
import Movie from "../../../entities/movie";
import { randomUUID } from "crypto";
import axios, { AxiosResponse } from "axios";

const authStateCache: Record<string, { redirectUri: string }> = {};

export default function (fastify: FastifyInstanceType, options: RegisterOptions, done: Function) {
    async function authPreHandler(request: FastifyRequest, reply: FastifyReply) {
        const authConfig = fastify.mediaServer.server.authConfig;
        if (!authConfig.enabled) return;
        if (!request.headers.authorization) throw new Unauthorized("No authorization header present");
        if (!request.headers.authorization.toLowerCase().startsWith("bearer"))
            throw new Unauthorized("Invalid authorization header (must start with 'bearer ')");
        const token = request.headers.authorization.substring(7);
        let payload: { sub: string };
        try {
            payload = fastify.jwt.verify<{ sub: string }>(token);
        } catch {
            throw new Unauthorized("Invalid authorization token");
        }
        if (!payload) throw new Unauthorized("Invalid authorization token");
        const sub = payload.sub;

        if (request.headers["x-profile"] && request.headers["x-profile"] != sub) throw new Unauthorized("Mismatch of token sub and profile id");
    }

    fastify.get(
        "/image/:id",
        { preHandler: async (req, rep) => await authPreHandler(req, rep), schema: { params: Type.Object({ id: Type.String({ format: "uuid" }) }) } },
        async (req, res) => {
            try {
                const image = await Image.findOneBy({ id: req.params.id });
                if (!image) {
                    res.header("Content-Type", "image/svg+xml");
                    return res.send(
                        `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:svgjs="http://svgjs.com/svgjs" width="64" height="64" x="0" y="0" viewBox="0 0 64 64" style="enable-background:new 0 0 512 512" xml:space="preserve" class=""><g><g id="error"><path d="m60 44c0 5.1056-5 10-10 10a10.0472 10.0472 0 0 1 -10-9h-34a2 2 0 0 1 -2-2v-31a2 2 0 0 1 2-2h42a2 2 0 0 1 2 2v22a10.2774 10.2774 0 0 1 10 10z" fill="#fafafa" data-original="#fafafa" class=""></path><path d="m44 18a4 4 0 1 1 -4-4 4 4 0 0 1 4 4z" fill="#e0e0e0" data-original="#e0e0e0" class=""></path><path d="m5.3189 43.3708 14.8882-18.3913a1 1 0 0 1 1.5666.0153l6.2263 8.0052 6.2547-6.2547a1 1 0 0 1 1.45.0381l8.2953 9.2166s-4 2-4 9h-34a.9694.9694 0 0 1 -.6811-1.6292z" fill="#e0e0e0" data-original="#e0e0e0" class=""></path><path d="m50 37a7 7 0 1 0 7 7 7.0082 7.0082 0 0 0 -7-7zm-5 7a4.992 4.992 0 0 1 7.7529-4.167l-6.92 6.92a4.9665 4.9665 0 0 1 -.8329-2.753zm5 5a4.9665 4.9665 0 0 1 -2.7529-.833l6.92-6.92a4.992 4.992 0 0 1 -4.1671 7.753zm1-15.9493v-21.0507a3.0033 3.0033 0 0 0 -3-3h-42a3.0033 3.0033 0 0 0 -3 3v31a3.0033 3.0033 0 0 0 3 3h33.1911a10.996 10.996 0 1 0 11.8089-12.9493zm-45-22.0507h42a1.001 1.001 0 0 1 1 1v21.0507a10.9108 10.9108 0 0 0 -4.8367 1.6425l-7.6848-8.446a2.0044 2.0044 0 0 0 -1.4512-.7472 1.9743 1.9743 0 0 0 -1.5244.5825l-5.501 5.501-5.42-7.0889a1.9826 1.9826 0 0 0 -1.5732-.8369 2.0153 2.0153 0 0 0 -1.6162.75l-14.3925 17.9912v-30.3989a1.001 1.001 0 0 1 1-1zm28.9763 33h-28.6941l14.6914-18.3164zm2.5185 0-8.2642-10.809 5.7274-5.6456 7.6109 8.3679a10.9607 10.9607 0 0 0 -3.5689 8.0867zm12.5052 9a9 9 0 1 1 9-9 9.01 9.01 0 0 1 -9 9zm-10-30a5 5 0 1 0 -5-5 5.0059 5.0059 0 0 0 5 5zm0-8a3 3 0 1 1 -3 3 3.0033 3.0033 0 0 1 3-3z" fill="#9e9e9e" data-original="#9e9e9e" class=""></path></g></g></svg>`,
                    );
                }

                res.header("Content-Type", image.type || "image/jpeg");
                return res.send(await image.getContent(fastify.mediaServer.server));
            } catch (err) {
                fastify.mediaServer.server.logger.error(err);
                res.header("Content-Type", "image/svg+xml");
                return res.send(
                    `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:svgjs="http://svgjs.com/svgjs" width="64" height="64" x="0" y="0" viewBox="0 0 64 64" style="enable-background:new 0 0 512 512" xml:space="preserve" class=""><g><g id="error"><path d="m60 44c0 5.1056-5 10-10 10a10.0472 10.0472 0 0 1 -10-9h-34a2 2 0 0 1 -2-2v-31a2 2 0 0 1 2-2h42a2 2 0 0 1 2 2v22a10.2774 10.2774 0 0 1 10 10z" fill="#fafafa" data-original="#fafafa" class=""></path><path d="m44 18a4 4 0 1 1 -4-4 4 4 0 0 1 4 4z" fill="#e0e0e0" data-original="#e0e0e0" class=""></path><path d="m5.3189 43.3708 14.8882-18.3913a1 1 0 0 1 1.5666.0153l6.2263 8.0052 6.2547-6.2547a1 1 0 0 1 1.45.0381l8.2953 9.2166s-4 2-4 9h-34a.9694.9694 0 0 1 -.6811-1.6292z" fill="#e0e0e0" data-original="#e0e0e0" class=""></path><path d="m50 37a7 7 0 1 0 7 7 7.0082 7.0082 0 0 0 -7-7zm-5 7a4.992 4.992 0 0 1 7.7529-4.167l-6.92 6.92a4.9665 4.9665 0 0 1 -.8329-2.753zm5 5a4.9665 4.9665 0 0 1 -2.7529-.833l6.92-6.92a4.992 4.992 0 0 1 -4.1671 7.753zm1-15.9493v-21.0507a3.0033 3.0033 0 0 0 -3-3h-42a3.0033 3.0033 0 0 0 -3 3v31a3.0033 3.0033 0 0 0 3 3h33.1911a10.996 10.996 0 1 0 11.8089-12.9493zm-45-22.0507h42a1.001 1.001 0 0 1 1 1v21.0507a10.9108 10.9108 0 0 0 -4.8367 1.6425l-7.6848-8.446a2.0044 2.0044 0 0 0 -1.4512-.7472 1.9743 1.9743 0 0 0 -1.5244.5825l-5.501 5.501-5.42-7.0889a1.9826 1.9826 0 0 0 -1.5732-.8369 2.0153 2.0153 0 0 0 -1.6162.75l-14.3925 17.9912v-30.3989a1.001 1.001 0 0 1 1-1zm28.9763 33h-28.6941l14.6914-18.3164zm2.5185 0-8.2642-10.809 5.7274-5.6456 7.6109 8.3679a10.9607 10.9607 0 0 0 -3.5689 8.0867zm12.5052 9a9 9 0 1 1 9-9 9.01 9.01 0 0 1 -9 9zm-10-30a5 5 0 1 0 -5-5 5.0059 5.0059 0 0 0 5 5zm0-8a3 3 0 1 1 -3 3 3.0033 3.0033 0 0 1 3-3z" fill="#9e9e9e" data-original="#9e9e9e" class=""></path></g></g></svg>`,
                );
            }
        },
    );

    fastify.get(
        "/stream/hls/:id",
        { preHandler: async (req, rep) => await authPreHandler(req, rep), schema: { params: Type.Object({ id: Type.String({ format: "uuid" }) }) } },
        async (req, res) => {
            const streamPartId = req.params.id.split(".")[0];
            const streamPart = await StreamPart.findOneBy({ id: streamPartId });
            if (!streamPart) throw new NotFound();

            const data = await streamPart.getData(fastify.mediaServer.server);
            return res.send(data);
        },
    );

    fastify.get(
        "/stream/:id",
        {
            preHandler: async (req, rep) => await authPreHandler(req, rep),
            schema: {
                params: Type.Object({ id: Type.String({ format: "uuid" }) }),
                headers: Type.Object({ "x-profile": Type.String({ format: "uuid" }) }),
            },
        },
        async (req, res) => {
            const profile = await Profile.findOneBy({ id: req.headers["x-profile"].toString() });
            if (!profile) throw new NotFound("Profile not found");

            const streamId = req.params.id;
            const stream = await Stream.findOne({ where: { id: streamId }, relations: { first_part: true, thumbnails: { image: true } } });
            if (!stream) throw new NotFound();

            const progress = await Progress.findOneBy({ stream: { id: stream.id }, profile: { id: profile.id } });

            return res.send({ ...stream, progress });
        },
    );

    fastify.post(
        "/stream/:id/progress",
        {
            preHandler: async (req, rep) => await authPreHandler(req, rep),
            schema: {
                headers: Type.Object({ "x-profile": Type.String({ format: "uuid" }) }),
                body: Type.Object({ second: Type.Number({ minimum: 0 }), finished: Type.Optional(Type.Boolean()) }),
                params: Type.Object({ id: Type.String({ format: "uuid" }) }),
            },
        },
        async (req, res) => {
            const profile = await Profile.findOneBy({ id: req.headers["x-profile"] });
            if (!profile) throw new NotFound("Profile not found");

            const stream = await Stream.findOne({ where: { id: req.params.id } });
            if (!stream) throw new NotFound();

            let watchable: Watchable;
            const movie = await Movie.findOne({ where: { stream: { id: stream.id } }, relations: { watchable: true } });
            let episode: Episode;
            if (!movie) {
                episode = await Episode.findOne({ where: { stream: { id: stream.id } }, relations: { season: { show: { watchable: true } } } });
                watchable = episode.season.show.watchable;
            } else {
                watchable = movie.watchable;
            }

            let progress = await Progress.createQueryBuilder("stream")
                .select()
                .setParameter("stream", stream.id)
                .setParameter("profile", profile.id)
                .where("streamId = :stream")
                .andWhere("profileId = :profile")
                .getOne();
            if (!progress) {
                progress = new Progress();
                progress.stream = stream;
                progress.profile = profile;
                progress.watchable = watchable;
                if (movie) {
                    progress.movie = movie;
                } else {
                    progress.episode = episode;
                }
            }
            progress.finished = req.body.finished ?? false;
            progress.second = req.body.second;
            await progress.save();

            return res.status(200).send(progress);
        },
    );

    fastify.get(
        "/show/episode/:id",
        { preHandler: async (req, rep) => await authPreHandler(req, rep), schema: { params: Type.Object({ id: Type.String({ format: "uuid" }) }) } },
        async (req, res) => {
            const episode = await Episode.findOne({
                where: { id: req.params.id },
                relations: { season: { show: { watchable: true } }, stream: true },
            });
            if (!episode) throw new NotFound();

            return res.send(episode);
        },
    );

    fastify.get(
        "/show/episode/:id/next",
        { preHandler: async (req, rep) => await authPreHandler(req, rep), schema: { params: Type.Object({ id: Type.String({ format: "uuid" }) }) } },
        async (req, res) => {
            const episode = await Episode.findOne({
                where: { id: req.params.id },
                relations: { season: { show: { seasons: { episodes: true } }, episodes: true } },
            });
            if (!episode) throw new NotFound();

            const nextEpisodeInSeason = episode.season.episodes.find((value) => value.episode_number == episode.episode_number + 1);
            if (nextEpisodeInSeason) return nextEpisodeInSeason;

            const nextSeason = episode.season.show.seasons.find((value) => value.season_number == episode.season.season_number + 1);
            if (!nextSeason) throw new NotFound("No next episode found (last season)");

            const nextEpisodesInNextSeason = nextSeason.episodes.sort((a, b) => (a.episode_number > b.episode_number ? 1 : -1));
            if (nextEpisodesInNextSeason.length == 0) throw new NotFound("No next episode found (next season has no episodes)");
            return nextEpisodesInNextSeason[0];
        },
    );

    fastify.get(
        "/movie/:id",
        { preHandler: async (req, rep) => await authPreHandler(req, rep), schema: { params: Type.Object({ id: Type.String({ format: "uuid" }) }) } },
        async (req, res) => {
            const movie = await Movie.findOne({ where: { id: req.params.id }, relations: { stream: true, watchable: true } });
            if (!movie) throw new NotFound();

            return movie;
        },
    );

    fastify.get(
        "/watchable/:id",
        {
            preHandler: async (req, rep) => await authPreHandler(req, rep),
            schema: {
                params: Type.Object({ id: Type.String({ format: "uuid" }) }),
                headers: Type.Object({ "x-profile": Type.String({ format: "uuid" }) }),
            },
        },
        async (req, res) => {
            const profile = await Profile.findOneBy({ id: req.headers["x-profile"] });
            if (!profile) throw new NotFound("Profile not found");

            const watchable = await Watchable.createQueryBuilder("watchable")
                .setParameter("watchableId", req.params.id)
                .setParameter("profileId", profile.id)
                .leftJoinAndSelect("watchable.genres", "genre")
                .leftJoinAndSelect("watchable.poster", "poster")
                .leftJoinAndSelect("watchable.backdrop", "backdrop")
                .leftJoinAndSelect("watchable.logo", "logo")
                .leftJoinAndSelect("watchable.cast", "cast")
                .leftJoinAndSelect("watchable.directors", "directors")
                .leftJoinAndSelect("watchable.writers", "writers")
                .leftJoinAndSelect("watchable.content_ratings", "content_ratings")
                .leftJoinAndSelect("watchable.show_content", "show_content")
                .leftJoinAndSelect("watchable.movie_content", "movie_content")
                .leftJoinAndSelect("movie_content.stream", "movieStream")
                .leftJoinAndSelect("show_content.seasons", "seasons")
                .leftJoinAndSelect("seasons.episodes", "episodes")
                .leftJoinAndSelect("episodes.stream", "episodeStream")
                .leftJoinAndSelect("episodes.poster", "episodePoster")
                .leftJoinAndSelect("episodeStream.progresses", "episodeStreamProgress", "episodeStreamProgress.profileId = :profileId")
                .leftJoinAndSelect("watchable.progress", "progress", "progress.profileId = :profileId")
                .leftJoinAndSelect("progress.stream", "stream")
                .leftJoinAndSelect("progress.movie", "progressMovie")
                .leftJoinAndSelect("progress.episode", "progressEpisode")
                .leftJoinAndSelect("progressEpisode.season", "progressSeason")
                .select()
                .where("watchable.id = :watchableId")
                .getOne();
            if (!watchable) throw new NotFound();

            return res.send(watchable);
        },
    );

    fastify.get(
        "/watchable/:id/trailer",
        { preHandler: async (req, rep) => await authPreHandler(req, rep), schema: { params: Type.Object({ id: Type.String({ format: "uuid" }) }) } },
        async (req, res) => {
            const watchable = await Watchable.findOneBy({ id: req.params.id });
            if (!watchable) throw new NotFound();
            const trailer = await fastify.mediaServer.server.tmdb.getTrailer(
                watchable.tmdb_id,
                watchable.type == "movie" ? TMDBModel.movies : TMDBModel.tvShows,
            );
            if (!trailer) throw new NotFound("No trailer found");
            return trailer;
        },
    );

    fastify.get<{ Headers: { authorization: string } }>("/profiles", async (req, res) => {
        if (fastify.mediaServer.server.authConfig.enabled) {
            await authPreHandler(req, res);
            const payload = fastify.jwt.decode<{ sub: string }>(req.headers.authorization.substring(7));
            const profile = await Profile.findOneBy({ id: payload.sub });

            return [profile];
        } else {
            const profiles = await Profile.find();
            return res.send(profiles);
        }
    });

    fastify.post(
        "/profile",
        {
            schema: {
                body: Type.Object({
                    name: Type.String(),
                }),
            },
        },
        async (req, res) => {
            if (fastify.mediaServer.server.authConfig.enabled) throw new Forbidden("Profile cannot be created because auth is enabled");

            const profile = new Profile();
            profile.name = req.body.name;
            await profile.save();
            return profile;
        },
    );

    fastify.get(
        "/browse",
        {
            preHandler: async (req, rep) => await authPreHandler(req, rep),
            schema: {
                headers: Type.Object({
                    "x-profile": Type.String({ format: "uuid" }),
                }),
            },
        },
        async (req, res) => {
            const profile = await Profile.findOneBy({ id: req.headers["x-profile"] });
            if (!profile) throw new NotFound("Profile not found");

            const billboard = await Watchable.createQueryBuilder("watchable")
                .setParameter("profileId", profile.id)
                .leftJoinAndSelect("watchable.genres", "genre")
                .leftJoinAndSelect("watchable.poster", "poster")
                .leftJoinAndSelect("watchable.backdrop", "backdrop")
                .leftJoinAndSelect("watchable.logo", "logo")
                .leftJoinAndSelect("watchable.show_content", "show_content")
                .leftJoinAndSelect("watchable.movie_content", "movie_content")
                .leftJoinAndSelect("watchable.progress", "progress", "progress.profileId = :profileId")
                .leftJoinAndSelect("progress.stream", "stream")
                .leftJoinAndSelect("progress.movie", "movie")
                .leftJoinAndSelect("progress.episode", "episode")
                .select()
                .orderBy("RAND()")
                .getOne();

            const newWatchables = await Watchable.createQueryBuilder("watchable")
                .setParameter("profileId", profile.id)
                .leftJoinAndSelect("watchable.genres", "genre")
                .leftJoinAndSelect("watchable.poster", "poster")
                .leftJoinAndSelect("watchable.backdrop", "backdrop")
                .leftJoinAndSelect("watchable.logo", "logo")
                .leftJoinAndSelect("watchable.show_content", "show_content")
                .leftJoinAndSelect("watchable.movie_content", "movie_content")
                .leftJoinAndSelect("watchable.progress", "progress", "progress.profileId = :profileId")
                .leftJoinAndSelect("progress.stream", "stream")
                .leftJoinAndSelect("progress.episode", "progressEpisode")
                .select()
                .orderBy("watchable.created_on", "DESC")
                .take(20)
                .getMany();

            const popularWatchables = (
                await Watchable.createQueryBuilder("watchable")
                    .setParameter("profileId", profile.id)
                    .leftJoinAndSelect("watchable.genres", "genre")
                    .leftJoinAndSelect("watchable.poster", "poster")
                    .leftJoinAndSelect("watchable.backdrop", "backdrop")
                    .leftJoinAndSelect("watchable.logo", "logo")
                    .leftJoinAndSelect("watchable.show_content", "show_content")
                    .leftJoinAndSelect("watchable.movie_content", "movie_content")
                    .leftJoinAndSelect("watchable.progress", "progress", "progress.profileId = :profileId")
                    .leftJoinAndSelect("progress.stream", "stream")
                    .leftJoinAndSelect("progress.episode", "progressEpisode")
                    .select()
                    .orderBy("watchable.rating", "DESC")
                    .take(20)
                    .getMany()
            ).sort((a, b) => 0.5 - Math.random());

            /*const popularWatchables = (
                await Watchable.find({ order: { rating: "DESC" }, take: 20, relations: { progress: { stream: true, movie: true, episode: true } } })
            ).sort((a, b) => 0.5 - Math.random());*/

            const sliders = [
                { type: "new", slides: newWatchables },
                { type: "popular", slides: popularWatchables },
            ];

            return {
                billboard,
                sliders,
            };
        },
    );

    fastify.get(
        "/search",
        {
            preHandler: async (req, rep) => await authPreHandler(req, rep),
            schema: {
                querystring: Type.Object({
                    query: Type.String(),
                }),
            },
        },
        async (req, res) => {
            const results = await Watchable.createQueryBuilder("watchable")
                .select()
                .setParameter("query", req.query.query)
                .where("MATCH(watchable.name) AGAINST(:query IN BOOLEAN MODE)")
                .where("MATCH(watchable.description) AGAINST(:query IN BOOLEAN MODE)")
                .take(20)
                .getMany();

            return results;
        },
    );

    // Authorization
    fastify.get("/auth/login", (req, res) => {
        const authConfig = fastify.mediaServer.server.authConfig;
        if (!authConfig) throw new Forbidden("Cannot login because auth is disabled");

        const state = randomUUID();
        const redirectUri = `${req.protocol}://${req.hostname}/auth/login`;

        authStateCache[state] = { redirectUri };

        return res.redirect(
            authConfig.authorizationUrl +
                "?" +
                new URLSearchParams({
                    response_type: "code",
                    client_id: authConfig.clientId,
                    redirect_uri: redirectUri,
                    scope: "openid profile",
                    state,
                }).toString(),
        );
    });

    fastify.post(
        "/auth/callback",
        {
            schema: {
                body: Type.Object({
                    code: Type.String(),
                    state: Type.String(),
                }),
            },
        },
        async (req, res) => {
            const authConfig = fastify.mediaServer.server.authConfig;
            if (!authConfig) throw new Forbidden("Cannot login because auth is disabled");

            if (!authStateCache[req.body.state]) throw new BadRequest("Invalid state");
            const state = authStateCache[req.body.state];

            const searchParams = new URLSearchParams({
                grant_type: "authorization_code",
                code: req.body.code,
                redirect_uri: state.redirectUri,
                client_id: authConfig.clientId,
                client_secret: authConfig.clientSecret,
            });

            let tokenRes: AxiosResponse<{ access_token: string }>;
            try {
                tokenRes = await axios.post(authConfig.tokenUrl, searchParams.toString(), {
                    headers: { "Content-Type": "application/x-www-form-urlencoded" },
                });
            } catch (err) {
                fastify.mediaServer.server.logger.error(err);
                throw new InternalServerError("Error requesting token from authentication provider");
            }

            let userInfoRes: AxiosResponse<{ name: string; sub: string }>;
            try {
                userInfoRes = await axios.post(authConfig.userInfoUrl, null, { headers: { authorization: "Bearer " + tokenRes.data.access_token } });
            } catch (err) {
                fastify.mediaServer.server.logger.error(err);
                throw new InternalServerError("Error requesting user info from authentication provider");
            }

            let profile = await Profile.findOneBy({ auth_provider_id: userInfoRes.data.sub });

            if (!profile) {
                profile = new Profile();
                profile.name = userInfoRes.data.name;
                profile.auth_provider_id = userInfoRes.data.sub;
                await profile.save();
            }

            return res.send({ profile: profile, accessToken: fastify.jwt.sign({ sub: profile.id }) });
        },
    );

    fastify.get("*", (req, res) => {
        throw new NotFound();
    });

    done();
}
