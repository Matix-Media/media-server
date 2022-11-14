import axios, { AxiosInstance, CreateAxiosDefaults } from "axios";
import { useRoute, useRouter } from "vue-router";

export interface Stream {
    id: string;
    duration: number;
    first_part: {
        id: string;
        playlist: boolean;
        has_subtitles: boolean;
    };
    thumbnails: {
        id: string;
        from: number;
        to: number;
        image: APIImage;
    }[];
    progresses?: Progress[];
}

export interface Profile {
    id: string;
    name: string;
}

export interface Genre {
    id: string;
    tmdb_id: number;
    name: string;
}

export interface CastMember {
    id: string;
    tmdb_id: number;
    name: string;
    popularity: number;
}

export interface ContentRating {
    id: string;
    country: string;
    name: string;
}

export interface APIImage {
    id: string;
    source?: string;
    created_on: string;
}

export interface Watchable {
    id: string;
    tmdb_id?: number;
    type: "show" | "movie";
    name: string;
    description?: string;
    year?: number;
    creator?: string;
    genres: Genre[];
    cast: CastMember[];
    directors: CastMember[];
    writers: CastMember[];
    quality: string;
    rating?: number;
    adult: boolean;
    content_ratings: ContentRating[];
    poster?: APIImage;
    backdrop?: APIImage;
    logo?: APIImage;
    movie_content?: Movie;
    show_content?: Show;
    created_on: string;
}

export interface Browse {
    billboard: Watchable & { progress: Progress[] };
    sliders: {
        type: string;
        slides: Array<Watchable & { progress: Progress[] }>;
    }[];
}

export interface Trailer {
    name: string;
    key: string;
    site: string;
    size: number;
    type: string;
    official: boolean;
    id: string;
}

export interface Progress {
    id: string;
    second: number;
    finished?: boolean;
    stream: Stream;
    episode: Episode;
    movie: Movie;
    last_updated: string;
}

export interface Show {
    id: string;
    until_year?: number;
    seasons: Season[];
}

export interface Season {
    id: string;
    name: string;
    season_number: number;
    air_date: string;
    description: string;
    episodes: Episode[];
}

export interface Episode {
    id: string;
    name: string;
    episode_number: number;
    description: string;
    poster: APIImage;
    duration: number;
    stream: Stream;
    season: Season;
}

export interface Movie {
    id: string;
    duration: number;
    stream: Stream;
}

export type EpisodeStreamInfo = Episode & { season: Season & { show: Show & { watchable: Watchable } } };
export type MovieStreamInfo = Movie & { watchable: Watchable };

export default class API {
    private static INSTANCE: API;

    public static getTitleTemplate(titleChunk?: string) {
        return titleChunk ? `${titleChunk} on Media Server` : "Media Server";
    }

    public static getInstance() {
        if (!this.INSTANCE) this.INSTANCE = new API();
        return this.INSTANCE;
    }

    public static getLatestProgress(progress: Progress[]) {
        if (progress.length <= 0) return null;

        let latest: Progress = progress[0];
        for (const currentProgress of progress) {
            if (new Date(currentProgress.last_updated) > new Date(latest.last_updated)) {
                latest = currentProgress;
            }
        }
        return latest;
    }

    public static getAppropriateContentRating(ratings: ContentRating[]) {
        if (ratings.length <= 0) return null;

        let currentCountry = navigator.language.split("-")[0];
        let rating = ratings.find((rating) => (rating.country = currentCountry));
        if (rating) return rating;
        return ratings[0];
    }

    public static getResolutionName(resolution: string) {
        const resolutions = [
            { height: 2160, name: "4K" },
            { height: 1080, name: "Full HD" },
            { height: 720, name: "HD" },
            { height: 480, name: "SD" },
        ];
        const height = Number.parseInt(resolution.split("x")[1]);

        for (const resolution of resolutions) {
            if (height >= resolution.height) return resolution.name;
        }
        return null;
    }

    private client: AxiosInstance;
    private baseURL: string;
    private initialized = false;
    private initializing = false;
    private initializingCallbacks: Array<() => void> = [];

    private _selectedProfile?: Profile;
    private _accessToken?: string;

    private constructor() {
        this.baseURL = (import.meta.env.DEV ? "http://localhost:3000/" : window.location.origin + "/") + "api/v1/";
        this.client = axios.create({ baseURL: this.baseURL });
    }

    public async initialize() {
        if (this.initialized) return;
        if (this.initializing) return await new Promise<void>((resolve) => this.initializingCallbacks.push(resolve));
        this.initializing = true;

        if (window.location.pathname == "/auth/login") {
            const params = new URLSearchParams(window.location.search);
            if (!params.has("code") || !params.has("state")) throw new Error("Missing params");
            await this.loginUsingOauth(params.get("code")!, params.get("state")!);
            useRouter().replace({ name: "Browse" });
        } else {
            const savedProfileId = localStorage.getItem("profileId");
            const savedAccessToken = localStorage.getItem("accessToken");
            console.log("savedProfileId:", savedProfileId);
            console.log("savedAccessToken:", savedAccessToken);
            if (savedProfileId) {
                const profiles = savedAccessToken ? await this.getProfiles(savedAccessToken) : await this.getProfiles();
                const profile = profiles.find((profile) => profile.id == savedProfileId);
                if (profile && savedAccessToken) this.setProfile(profile, savedAccessToken);
                else if (profile) this.setProfile(profile);
            }
        }

        this.initialized = true;
        this.initializing = false;
        this.initializingCallbacks.map((callback) => callback());
    }

    public setProfile(profile: Profile, accessToken?: string) {
        const options: { baseURL: string; headers: Record<string, any> } = { baseURL: this.baseURL, headers: { "x-profile": profile.id } };
        if (accessToken) {
            options.headers["Authorization"] = `Bearer ${accessToken}`;
            this._accessToken = accessToken;
            localStorage.setItem("accessToken", accessToken);
        }
        this.client = axios.create(options);
        this._selectedProfile = profile;
        localStorage.setItem("profileId", profile.id);
    }

    public logout() {
        this.client = axios.create({ baseURL: this.baseURL });
        this._selectedProfile = undefined;
        localStorage.removeItem("profileId");
    }

    public getImageUrl(id: string | APIImage) {
        if (id instanceof Object) {
            return new URL("image/" + id.id, this.baseURL).href;
        }
        return new URL("image/" + id, this.baseURL).href;
    }

    public get selectedProfile() {
        return this._selectedProfile;
    }

    public get accessToken() {
        return this._accessToken;
    }

    public async getProfiles(accessToken?: string): Promise<Profile[]> {
        if (accessToken) {
            {
                console.log("Requesting profiles with access token:", accessToken);
                return (await this.client.get("/profiles", { headers: { Authorization: `Bearer ${accessToken}` } })).data;
            }
        } else return (await this.client.get("/profiles")).data;
    }

    public async createProfile(profileName: string): Promise<Profile> {
        return (await this.client.post("/profile", { name: profileName })).data;
    }

    public async getBrowse(): Promise<Browse> {
        return (await this.client.get("/browse")).data;
    }

    public async getEpisode(episodeId: string): Promise<EpisodeStreamInfo> {
        return (await this.client.get("/show/episode/" + episodeId)).data;
    }

    public async getNextEpisode(episodeId: string): Promise<Episode> {
        return (await this.client.get("/show/episode/" + episodeId + "/next")).data;
    }

    public async getMovie(movieId: string): Promise<MovieStreamInfo> {
        return (await this.client.get("/movie/" + movieId)).data;
    }

    public async getStream(streamId: string): Promise<Stream & { progress: Progress }> {
        return (await this.client.get("/stream/" + streamId)).data;
    }

    public async getTrailer(watchableId: string): Promise<Trailer> {
        return (await this.client.get("/watchable/" + watchableId + "/trailer")).data;
    }

    public getStreamPartUrl(streamPartId: string, isPlaylist = false, isSubtitles = false) {
        const extension = isPlaylist ? ".m3u8" : isSubtitles ? ".vtt" : ".ts";
        return new URL("stream/hls/" + streamPartId + extension + (isSubtitles ? "/subtitles" : ""), this.baseURL).href;
    }

    public async reportStreamProgress(streamId: string, second: number, finished = false) {
        await this.client.post("/stream/" + streamId + "/progress", { second: second, finished });
    }

    public async getWatchable(watchableId: string): Promise<Watchable & { progress: Array<Progress> }> {
        return (await this.client.get("/watchable/" + watchableId)).data;
    }

    public getLoginUrl() {
        return new URL("auth/login", this.baseURL);
    }

    public async loginUsingOauth(code: string, state: string) {
        const res = await this.client.post("/auth/callback", { code, state });
        this.setProfile(res.data.profile, res.data.accessToken);
        return res.data;
    }
}

export function useAPI() {
    return API.getInstance();
}
