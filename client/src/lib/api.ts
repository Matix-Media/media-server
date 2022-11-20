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
    auth_provider_id?: string;
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
        type: "new" | "popular" | "genre";
        genre?: Genre;
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
    last_updates: string;
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

    public static isMobile() {
        try {
            let check = false;
            (function (a) {
                if (
                    /(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(
                        a,
                    ) ||
                    /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(
                        a.substr(0, 4),
                    )
                )
                    check = true;
            })(navigator.userAgent || navigator.vendor || (window as any).opera);
            return check;
        } catch {
            return window.matchMedia(`(max-width: 450px)`).matches;
        }
    }

    public static getSidePadding() {
        return Number.parseInt(getComputedStyle(document.documentElement).getPropertyValue("--side-padding").split("px")[0]);
    }

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
            if (new Date(currentProgress.last_updates) > new Date(latest.last_updates)) {
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
            window.location.replace("/browse");
        } else {
            const savedProfileId = localStorage.getItem("profileId");
            const savedAccessToken = localStorage.getItem("accessToken");
            if (savedProfileId) {
                try {
                    const profiles = savedAccessToken ? await this.getProfiles(savedAccessToken) : await this.getProfiles();
                    const profile = profiles.find((profile) => profile.id == savedProfileId);
                    if (profile && savedAccessToken) this.setProfile(profile, savedAccessToken);
                    else if (profile) this.setProfile(profile);
                } catch (err) {
                    if (axios.isAxiosError(err) && (err.response?.status == 401 || err.response?.status == 403)) {
                        window.location.href = this.getLoginUrl().href;
                    }
                    console.error(err);
                }
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
        this._accessToken = undefined;
        localStorage.removeItem("profileId");
        localStorage.removeItem("accessToken");
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
        if (accessToken) return (await this.client.get("/profiles", { headers: { Authorization: `Bearer ${accessToken}` } })).data;
        else return (await this.client.get("/profiles")).data;
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
