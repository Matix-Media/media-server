<script lang="ts" setup>
import API, { useAPI } from "src/lib/api";
import { useRoute, useRouter } from "vue-router";
import Button from "src/components/Button.vue";
import Icon from "src/components/Icon.vue";
import Progress from "src/components/Progress.vue";
import Clickable from "src/components/Clickable.vue";
import { ref } from "vue";
import { publicDecrypt } from "crypto";

const route = useRoute();
const router = useRouter();
const api = useAPI();
const movie = await api.getWatchable(route.params.id.toString());
const contentRating = API.getAppropriateContentRating(movie.content_ratings);
const resolution = API.getResolutionName(movie.quality);
const progress = API.getLatestProgress(movie.progress);
const fullDescription = ref(false);
const hours = ref(Math.floor(movie.movie_content!.stream.duration / 3600));
const minutes = ref(Math.round((movie.movie_content!.stream.duration % 3600) / 60));
if (movie.show_content) router.replace({ name: "Show", params: { id: route.params.id } });
</script>

<template>
    <div class="movie">
        <div class="hero" :class="{ 'has-progress': progress }">
            <div class="logo-wrapper">
                <img class="logo" :src="api.getImageUrl(movie.logo!)" :alt="movie.name" />
            </div>
            <div class="quick-infos">
                <p v-if="movie.year">{{ movie.year }}</p>
                <p v-if="contentRating" class="pill">{{ contentRating.name }}</p>
                <p class="pill" v-if="resolution">{{ resolution }}</p>
                <p>{{ hours > 0 ? $t("details.time.hoursAndMinutes", { hours, minutes }) : $t("details.time.minutes", { minutes }) }}</p>
            </div>
            <div class="genres">
                <p v-for="genre in movie.genres">{{ genre.name }}</p>
            </div>
            <div class="watch-options">
                <Button class="watch" @click="router.push({ name: 'StreamMovie', params: { id: movie.movie_content!.id } })">
                    <Icon icon="play_arrow" />
                    {{ progress ? $t("details.continue") : $t("details.watch") }}
                </Button>
                <Progress v-if="progress" :value="(progress.second / progress.stream.duration) * 100" />
            </div>

            <p class="description" v-if="progress">
                {{ $t("details.time.currentMinute", { minute: Math.round(progress.second / 60) }) }}
            </p>
            <p class="description" v-else-if="movie.description" :class="{ 'full-width': fullDescription }">
                {{ movie.description.length > 100 && !fullDescription ? movie.description.substring(0, 97) + "..." : movie.description }}
                <Clickable class="show-more" v-if="movie.description.length > 200 && !fullDescription" @click.prevent="fullDescription = true">
                    {{ $t("details.more") }}
                </Clickable>
            </p>
        </div>

        <div class="content-overview">
            <div class="outer">
                <div class="inner">
                    <p class="department">{{ $t("details.departments.directing") }}</p>
                    <p class="names">
                        {{
                            movie.directors
                                .sort((a, b) => b.popularity - a.popularity)
                                .slice(0, 5)
                                .map((i) => i.name)
                                .join(", ")
                        }}
                    </p>
                </div>
            </div>
            <div class="outer">
                <div class="inner">
                    <p class="department">{{ $t("details.departments.cast") }}</p>
                    <p class="names">
                        {{
                            movie.cast
                                .sort((a, b) => b.popularity - a.popularity)
                                .slice(0, 5)
                                .map((i) => i.name)
                                .join(", ")
                        }}
                    </p>
                </div>
            </div>
            <div class="outer">
                <div class="inner">
                    <p class="department">{{ $t("details.departments.writing") }}</p>
                    <p class="names">
                        {{
                            movie.writers
                                .sort((a, b) => b.popularity - a.popularity)
                                .slice(0, 5)
                                .map((i) => i.name)
                                .join(", ")
                        }}
                    </p>
                </div>
            </div>
        </div>

        <div class="background" :style="{ backgroundImage: `url(${api.getImageUrl(movie.backdrop!)})` }">
            <div class="bottom-fade"></div>
            <div class="left-fade"></div>
        </div>
    </div>
</template>

<style lang="scss" scoped>
@import "src/styles/vars";
@import "src/styles/mixins";
@import "src/styles/shared/watchable";

.movie {
    @include watchable;

    .content-overview {
        margin-top: 50px;
        display: flex;
        justify-content: space-between;
        gap: 50px;

        .outer {
            flex: 1;
            display: flex;
            justify-content: center;
        }

        .department {
            color: var(--white-50);
        }

        .names {
            max-width: 400px;
        }
    }
}
</style>
