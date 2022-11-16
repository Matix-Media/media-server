<script lang="ts" setup>
import API, { useAPI } from "src/lib/api";
import { useRoute, useRouter } from "vue-router";
import Button from "src/components/Button.vue";
import Icon from "src/components/Icon.vue";
import Progress from "src/components/Progress.vue";
import Clickable from "src/components/Clickable.vue";
import { ref } from "vue";
import { publicDecrypt } from "crypto";
import { useTitle } from "@vueuse/core";

const route = useRoute();
const router = useRouter();
const api = useAPI();
const show = await api.getWatchable(route.params.id.toString());
if (show.type == "movie") {
    router.replace({ name: "Movie", params: { id: show.id } });
}
const contentRating = API.getAppropriateContentRating(show.content_ratings);
const resolution = API.getResolutionName(show.quality);
const progress = API.getLatestProgress(show.progress);
const selectedSeason = ref(show.show_content!.seasons.length > 0 ? show.show_content!.seasons[0] : null);
const firstEpisode =
    show.show_content!.seasons.length > 0
        ? show.show_content!.seasons[0].episodes.length > 0
            ? show.show_content!.seasons[0].episodes[0]
            : null
        : null;
const fullDescription = ref(false);
const fullDescriptions = ref<string[]>([]);
if (show.movie_content) router.replace({ name: "Movie", params: { id: route.params.id } });
if (progress) selectedSeason.value = progress.episode.season;

useTitle(show.name, { titleTemplate: API.getTitleTemplate });
</script>

<template>
    <div class="show">
        <div class="hero" :class="{ 'has-progress': progress }">
            <div class="logo-wrapper">
                <img v-if="show.logo" class="logo" :src="api.getImageUrl(show.logo!)" :alt="show.name" />
                <h1 v-else class="logo-fallback">{{ show.name }}</h1>
            </div>
            <div class="quick-infos">
                <p v-if="show.year && show.show_content?.until_year">{{ show.year }}-{{ show.show_content.until_year }}</p>
                <p v-if="contentRating" class="pill">{{ contentRating.name }}</p>
                <p class="pill" v-if="resolution">{{ resolution }}</p>
                <p>{{ $t("details.seasons", show.show_content!.seasons.length) }}</p>
            </div>
            <div class="genres">
                <p v-for="genre in show.genres">{{ genre.name }}</p>
            </div>
            <div class="watch-options">
                <Button
                    class="watch"
                    @click="
                        progress
                            ? router.push({ name: 'StreamEpisode', params: { id: progress.episode.id } })
                            : firstEpisode
                            ? router.push({ name: 'StreamEpisode', params: { id: firstEpisode.id } })
                            : {}
                    "
                >
                    <Icon icon="play_arrow" />
                    {{ progress ? $t("details.continue") : $t("details.watch") }}
                </Button>
                <Progress v-if="progress" :value="(progress.second / progress.stream.duration) * 100" />
            </div>

            <p class="description" v-if="progress">
                {{
                    progress
                        ? $t("details.currentEpisode", { season: progress.episode.season.season_number, episode: progress.episode.episode_number })
                        : show.description
                }}
            </p>
            <p class="description" v-else-if="show.description" :class="{ 'full-width': fullDescription }">
                {{ show.description.length > 100 && !fullDescription ? show.description.substring(0, 97) + "..." : show.description }}
                <Clickable class="show-more" v-if="show.description.length > 200 && !fullDescription" @click.prevent="fullDescription = true">
                    {{ $t("details.more") }}
                </Clickable>
            </p>
        </div>

        <div class="content-overview">
            <div class="seasons">
                <Clickable
                    class="season"
                    v-for="season in show.show_content!.seasons.sort((a, b) => a.season_number - b.season_number)"
                    :class="{selected: selectedSeason ? selectedSeason!.id == season.id : false}"
                    @click="selectedSeason = season"
                >
                    {{ $t("details.season", { season: season.season_number }) }}
                </Clickable>
            </div>
            <div class="episodes">
                <RouterLink
                    class="episode"
                    v-for="episode in selectedSeason ? selectedSeason.episodes.sort((a, b) => a.episode_number - b.episode_number) : []"
                    :class="{ active: progress ? episode.stream.id == progress.stream.id : false }"
                    :to="{ name: 'StreamEpisode', params: { id: episode.id } }"
                >
                    <div class="cover" :class="{ 'has-progress': episode.stream.progresses && episode.stream.progresses.length > 0 }">
                        <div class="image" :style="{ backgroundImage: `url(${api.getImageUrl(episode.poster)})` }"></div>
                        <Progress
                            v-if="episode.stream.progresses && episode.stream.progresses.length > 0"
                            :value="(API.getLatestProgress(episode.stream.progresses)!.second / episode.stream.duration) * 100"
                        />
                    </div>
                    <div class="details">
                        <div>
                            <h2>{{ $t("details.episode", { episode: episode.episode_number, title: episode.name }) }}</h2>
                            <p class="description">
                                {{
                                    episode.description.length > 200 && !fullDescriptions.includes(episode.id)
                                        ? episode.description.substring(0, 297) + "..."
                                        : episode.description
                                }}
                                <Clickable
                                    class="show-more"
                                    v-if="episode.description.length > 200 && !fullDescriptions.includes(episode.id)"
                                    @click.prevent="fullDescriptions.push(episode.id)"
                                >
                                    {{ $t("details.more") }}
                                </Clickable>
                            </p>
                        </div>
                        <p class="duration">{{ $t("details.time.minutes", { minutes: Math.round(episode.stream.duration / 60) }) }}</p>
                    </div>
                </RouterLink>
            </div>
        </div>

        <div class="background" :style="{ backgroundImage: `url(${api.getImageUrl(show.backdrop!)})` }">
            <div class="bottom-fade"></div>
            <div class="left-fade"></div>
        </div>
    </div>
</template>

<style lang="scss" scoped>
@import "src/styles/vars";
@import "src/styles/mixins";
@import "src/styles/shared/watchable";
.show {
    @include watchable;

    .content-overview {
        padding: 0 var(--side-padding);
        padding-top: 35px;

        .seasons {
            display: flex;
            align-items: center;
            flex-wrap: wrap;
            gap: 20px;

            .season {
                font: var(--font-20);
                padding: 5px 22px;

                &.selected {
                    @include glass;
                }
            }

            @media (max-width: $mobile) {
                .season {
                    font: var(--font-16);
                }
            }
        }

        .episodes {
            margin-left: -20px;
            margin-top: 40px;
            display: flex;
            flex-direction: column;
            width: fit-content;

            @media (max-width: $mobile) {
                margin-top: 15px;
            }

            .episode {
                display: flex;
                padding: 20px;
                padding-bottom: 15px;
                text-decoration: none;
                color: white;

                &.active {
                    background-color: var(--glass-background);
                    border-radius: 15px;
                    border: 1px solid var(--glass-border);
                }

                .cover {
                    display: flex;
                    flex-direction: column;
                    align-items: center;

                    .image {
                        border-radius: var(--border-radius);
                        box-shadow: var(--image-glass);
                        aspect-ratio: 16 / 9;
                        background-size: cover;
                        background-position: center;
                        width: 230px;
                        margin-bottom: 20px;

                        @media (max-width: $mobile) {
                            width: 130px;
                        }
                    }

                    &.has-progress .image {
                        margin-bottom: 15px;
                    }

                    .progress {
                        width: 145px;

                        @media (max-width: $mobile) {
                            width: 90%;
                        }
                    }
                }

                .details {
                    margin-left: 40px;
                    text-decoration: none;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                    margin-bottom: 20px;

                    h2 {
                        font: var(--font-20);
                        margin-bottom: 5px;
                    }

                    @media (max-width: $mobile) {
                        margin-left: 15px;
                        justify-content: normal;

                        h2 {
                            font: var(--font-16);
                        }

                        .duration {
                            font: var(--font-12);
                        }

                        .description {
                            display: none;
                        }
                    }

                    .description {
                        font: var(--font-12);
                        color: var(--white-50);
                        max-width: 560px;

                        .show-more {
                            display: inline-block;
                            font: var(--font-12);
                            padding: 0;
                        }
                    }
                }
            }
        }
    }
}
</style>
