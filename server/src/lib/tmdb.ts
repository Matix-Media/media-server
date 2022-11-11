import assert from "assert";
import axios, { AxiosInstance } from "axios";

export enum TMDBModel {
    movies = "movie",
    tvShows = "tv",
    people = "person",
    companies = "company",
}

export enum TMDBImageType {
    backdrop = "backdrop",
    logo = "logo",
    poster = "poster",
    profile = "profile",
    still = "still",
}

export interface CastMember {
    id: number;
    adult: boolean;
    gender: 1 | 2;
    known_for_department: "Acting" | "Writing" | "Directing" | "Production" | "Editing";
    name: string;
    original_name: string;
    popularity: number;
    profile_path: string;
    cast_id: number;
    character: string;
    credit_id: string;
    order: number;
}

export interface CrewMember {
    id: number;
    adult: boolean;
    gender: 1 | 2;
    known_for_department: "Acting" | "Writing" | "Directing" | "Production" | "Editing";
    name: string;
    original_name: string;
    popularity: number;
    profile_path: string;
    credit_id: string;
    department: "Writing" | "Directing";
}

export interface ShowSearchResult {
    page: number;
    total_pages: number;
    total_results: number;
    results: {
        id: number;
        name: string;
        original_name: string;
        origin_country: string[];
        original_language: string;
        first_air_date: string;
        last_air_date: string;
        overview: string;
        genre_ids: number[];
        popularity: number;
        vote_average: number;
        vote_count: number;
        poster_path?: string;
        backdrop_path?: string;
    }[];
}

export interface MovieSearchResult {
    page: number;
    total_results: number;
    total_pages: number;
    results: {
        id: number;
        adult: boolean;
        overview: string;
        release_date: string;
        genre_ids: number[];
        original_title: string;
        original_language: string;
        title: string;
        popularity: number;
        vote_count: number;
        vote_average: number;
        video: boolean;
        poster_path?: string;
        backdrop_path?: string;
    }[];
}

export interface ShowResult {
    id: number;
    name: string;
    overview: string;
    homepage: string;
    in_production: boolean;
    languages: string[];
    backdrop_path?: string;
    created_by: {
        id: number;
        credit_id: string;
        name: string;
        gender: number;
        profile_path?: string;
    }[];
    episode_run_time: number[];
    first_air_date: string;
    genres: {
        id: number;
        name: string;
    }[];
    last_air_date: string;
    last_episode_to_air: {
        id: number;
        air_date: string;
        episode_number: number;
        name: string;
        overview: string;
        production_code: string;
        season_number: string;
        still_path?: string;
        vote_average: number;
        vote_count: number;
    };
    networks: {
        id: number;
        name: string;
        logo_path?: string;
        origin_country: string;
    }[];
    number_of_episodes: number;
    number_of_seasons: number;
    origin_country: string[];
    original_language: string;
    original_name: string;
    popularity: number;
    poster_path?: string;
    production_companies: {
        id: number;
        logo_path?: string;
        name: string;
        origin_country: string;
    }[];
    production_countries: {
        iso_3166_1: string;
        name: string;
    }[];
    seasons: {
        id: number;
        name: string;
        season_number: number;
        overview: string;
        air_date: string;
        episode_count: number;
        poster_path: string;
    }[];
    spoken_languages: {
        english_name: string;
        iso_639_1: string;
        name: string;
    }[];
    status: string;
    tagline: string;
    type: string;
    vote_average: number;
    vote_count: number;
    content_ratings: {
        result: {
            iso_3166_1: string;
            name: string;
        }[];
    };
    credits: {
        cast: CastMember[];
        crew: CrewMember[];
    };
}

export interface MovieResult {
    id: number;
    adult: boolean;
    budget: number;
    genres: {
        id: number;
        name: string;
    }[];
    homepage: string;
    imdb_id?: string;
    original_language: string;
    original_title: string;
    overview: string;
    production_companies: {
        id: number;
        name: string;
        origin_country: string;
        logo_path?: string;
    }[];
    production_countries: {
        iso_3166_1: string;
        name: string;
    }[];
    release_date: string;
    revenue: number;
    runtime?: number;
    spoken_languages: {
        iso_639_1: string;
        name: string;
    }[];
    status: string;
    tagline: string;
    video: boolean;
    popularity: number;
    vote_average: number;
    vote_count: number;
    poster_path?: string;
    backdrop_path?: string;
    releases: {
        countries: {
            certification: string;
            iso_3166_1: string;
            primary: boolean;
            release_date: string;
        }[];
    };
    credits: {
        cast: CastMember[];
        crew: CrewMember[];
    };
}

export interface SeasonResult {
    _id: string;
    id: number;
    name: string;
    overview: string;
    air_date: string;
    poster_path?: string;
    season_number: number;
    episodes: {
        id: string;
        air_date: string;
        episode_number: number;
        crew: {
            department: string;
            job: string;
            credit_id: string;
            adult?: boolean;
            gender: number;
            id: number;
            known_for_department: string;
            name: string;
            original_name: string;
            popularity: number;
            profile_path?: string;
        }[];
        guest_stars: {
            credit_id: string;
            order: number;
            character: string;
            adult: boolean;
            gender?: number;
            id: number;
            known_for_department: string;
            name: string;
            original_name: string;
            popularity: number;
            profile_path?: string;
        }[];
        name: string;
        overview: string;
        product_code: string;
        season_number: string;
        still_path: string;
        vote_average: number;
        vote_count: string;
    }[];
}

export interface RemoteConfigurationResult {
    images: {
        base_url: string;
        secure_base_url: string;
        backdrop_sizes: string[];
        logo_sizes: string[];
        poster_sizes: string[];
        profile_sizes: string[];
        still_sizes: string[];
    };
    change_keys: string[];
}

export interface SingleImage {
    file_path: string;
    width: number;
    height: number;
    aspect_ratio: number;
    iso_639_1?: string;
    vote_average: number;
    vote_count: number;
}

export interface ImageResult {
    backdrop?: SingleImage;
    logo?: SingleImage;
    poster?: SingleImage;
    profile?: SingleImage;
}

export interface TrailerResult {
    name: string;
    key: string;
    site: string;
    size: number;
    type: string;
    official: boolean;
    id: string;
}

export class ImageError extends Error {}

export class TMDB {
    public static readonly COMMON_IMAGE_SIZES = {
        backdrop: {
            w300: "w300",
            w780: "w780",
            w1280: "w1280",
            original: "original",
        },
        logo: {
            w45: "w45",
            w92: "w92",
            w154: "w154",
            w185: "w185",
            w300: "w300",
            w500: "w500",
            original: "original",
        },
        poster: {
            w92: "w92",
            w154: "w154",
            w185: "w185",
            w342: "w342",
            w500: "w500",
            w700: "w700",
            original: "original",
        },
        profile: {
            w45: "245",
            w185: "w185",
            h632: "h632",
            original: "original",
        },
        still: {
            w92: "w92",
            w185: "w185",
            w300: "w300",
            original: "original",
        },
    };

    private client: AxiosInstance;
    private cache = {
        images: {},
        search: {
            tvShows: {},
            movies: {},
        },
        tvShows: {},
        tvShowSeasons: {},
        movies: {},
        trailer: {},
        contentRatings: {},
    };

    constructor(apiKey: string) {
        this.client = axios.create({
            baseURL: "https://api.themoviedb.org/3/",
            params: {
                api_key: apiKey,
            },
        });
    }

    private async getConfiguration(): Promise<RemoteConfigurationResult> {
        if (this.cache["remoteConfig"]) return this.cache["remoteConfig"];
        const res = await this.client.get("/configuration");
        this.cache["remoteConfig"] = res.data;
        return res.data;
    }

    public async getImageUrl(file_path: string, type: TMDBImageType, size: string) {
        const config = await this.getConfiguration();
        if (!config.images[type + "_sizes"]) throw new ImageError("Unknown image type: " + type);
        if (!config.images[type + "_sizes"].includes(size)) throw new ImageError("Unknown image size for " + type + ": " + size);
        return new URL(size + file_path, config.images.secure_base_url).href;
    }

    public async searchShow(query: string, page = 1): Promise<ShowSearchResult> {
        assert.ok(page > 0, "Page needs to be greater than 0");
        if (this.cache.search.tvShows[query] && this.cache.search.tvShows[query][page]) return this.cache.search.tvShows[query][page];
        const res = await this.client.get("/search/tv", { params: { query, page } });
        if (!this.cache.search.tvShows[query]) this.cache.search.tvShows[query] = {};
        this.cache.search.tvShows[query][page] = res.data;
        return res.data;
    }

    public async searchMovie(query: string, page = 1): Promise<MovieSearchResult> {
        assert.ok(page > 0, "Page needs to be greater than 0");
        if (this.cache.search.movies[query] && this.cache.search.movies[query][page]) return this.cache.search.movies[query][page];
        const res = await this.client.get("/search/movie", { params: { query, page } });
        if (!this.cache.search.movies[query]) this.cache.search.movies[query] = {};
        this.cache.search.movies[query][page] = res.data;
        return res.data;
    }

    public async getShow(id: number): Promise<ShowResult> {
        if (this.cache.tvShows[id]) return this.cache.tvShows[id];
        const res = await this.client.get("/tv/" + id, { params: { append_to_response: "content_ratings,credits" } });
        this.cache.tvShows[id] = res.data;
        return res.data;
    }

    public async getMovie(id: number): Promise<MovieResult> {
        if (this.cache.movies[id]) return this.cache.movies[id];
        const res = await this.client.get("/movie/" + id, { params: { append_to_response: "releases,credits" } });
        this.cache.movies[id] = res.data;
        return res.data;
    }

    public async getShowSeason(showId: number, seasonNumber: number): Promise<SeasonResult> {
        const cacheName = showId + "_" + seasonNumber;
        if (this.cache.tvShowSeasons[cacheName]) return this.cache.tvShowSeasons[cacheName];
        const res = await this.client.get("/tv/" + showId + "/season/" + seasonNumber);
        this.cache.tvShowSeasons[cacheName] = res.data;
        return res.data;
    }

    public async getImages(id: number, type: TMDBModel): Promise<ImageResult> {
        function sort(a: SingleImage, b: SingleImage) {
            if (a.vote_average > b.vote_average) return -1;
            else if (a.vote_average < b.vote_average) return 1;
            return 0;
        }
        const cacheName = type + "_" + id;
        if (this.cache.images[cacheName]) return this.cache.images[cacheName];
        const res = await this.client.get("/" + type + "/" + id + "/images", { params: { language: "en-US", include_image_language: "en,null" } });
        const data: { backdrops?: SingleImage[]; logos?: SingleImage[]; posters?: SingleImage[]; profiles?: SingleImage[] } = res.data;
        const final: ImageResult = {
            backdrop: data.backdrops?.sort(sort)[0] || undefined,
            logo: data.logos?.sort(sort)[0] || undefined,
            poster: data.posters?.sort(sort)[0] || undefined,
            profile: data.profiles?.sort(sort)[0] || undefined,
        };
        this.cache.images[cacheName] = final;
        return final;
    }

    public async getTrailer(id: number, type: TMDBModel): Promise<TrailerResult | null> {
        const cacheName = type + "_" + id;
        if (this.cache.trailer[cacheName]) return this.cache.trailer[cacheName];
        const res = await this.client.get("/" + type + "/" + id + "/videos", { params: { language: "en-US", include_video_language: "en,null" } });
        const data: {
            id: number;
            results: { name: string; key: string; site: string; size: number; type: string; official: boolean; id: string }[];
        } = res.data;
        for (const video of data.results) {
            if (video.type == "Trailer" && video.site == "YouTube") {
                this.cache.trailer[cacheName] = video;
                return video;
            }
        }
        return null;
    }
}
