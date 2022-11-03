<script lang="ts" setup>
import API, { Progress, Watchable } from "src/lib/api";
import { nextTick, ref } from "vue";
import { useRouter } from "vue-router";
import Button from "./Button.vue";
import Icon from "./Icon.vue";
import WatchablePlaceholder from "src/assets/images/watchable-placeholder.jpg";
const props = defineProps<{ title: string; watchables: Array<Watchable & { progress: Progress[] }> }>();
const router = useRouter();
const api = API.getInstance();
const hoveredSlide = ref<string>();
const leftSlides = ref<string[]>([]);
const rightSlides = ref<string[]>([]);
const trailerVisible = ref<string>();
const trailers = ref<{ [key: string]: string }>({});
const noTrailerAvailable = ref<string[]>([]);

function onSlideHoverEnter(watchable: Watchable, event: MouseEvent) {
    if (!trailers.value[watchable.id]) {
        api.getTrailer(watchable.id)
            .then((trailer) => {
                trailers.value[watchable.id] = "https://www.youtube.com/embed/" + trailer.key + "?autoplay=1&showinfo=0&controls=0";
            })
            .catch(() => {
                noTrailerAvailable.value.push(watchable.id);
                console.log("No trailer found");
            });
    }

    nextTick(() => {
        setTimeout(() => {
            trailerVisible.value = watchable.id;
        }, 1000);

        const slide = event.target as HTMLDivElement;
        let popup = slide.querySelector(".popup") as HTMLDivElement;
        const rect = popup.getBoundingClientRect();
        const overlap = rect.width * 0.25;
        const rightEdge = popup!.getBoundingClientRect().width + rect.left + overlap;
        const leftEdge = rect.left - overlap;
        const screenWidth = document.body.clientWidth;
        rightSlides.value.splice(rightSlides.value.indexOf(watchable.id), 1);
        leftSlides.value.splice(leftSlides.value.indexOf(watchable.id), 1);
        if (leftEdge < 0 && !leftSlides.value.includes(watchable.id)) {
            leftSlides.value.push(watchable.id);
        } else if (rightEdge > screenWidth && !rightSlides.value.includes(watchable.id)) {
            rightSlides.value.push(watchable.id);
        }
        nextTick(() => {
            hoveredSlide.value = watchable.id;
        });
    });
}

function onSlideHoverLeave(watchable: Watchable, event: MouseEvent) {
    if (hoveredSlide.value != watchable.id) return;
    hoveredSlide.value = undefined;
    trailerVisible.value = undefined;
}

function getPercentage(progress: Progress) {
    if (progress.finished) return 100;
    return (progress.second / progress.stream.duration) * 100;
}

function getWatchableRoute(watchable: Watchable & { progress: Progress[] }) {
    if (watchable.progress && watchable.progress.length > 0) {
        if (watchable.movie_content) return { name: "StreamMovie", params: { id: watchable.movie_content.id } };
        else return { name: "StreamEpisode", params: { id: API.getLatestProgress(watchable.progress)?.episode.id } };
    } else {
        if (watchable.movie_content) return { name: "Movie", params: { id: watchable.id } };
        else return { name: "Show", params: { id: watchable.id } };
    }
}
</script>

<template>
    <div class="slider">
        <h2>{{ props.title }}</h2>
        <div class="slides">
            <div class="slide" v-for="watchable in props.watchables" :class="{ 'no-progress': !API.getLatestProgress(watchable.progress) }">
                <RouterLink
                    class="image"
                    @mouseenter="(event: MouseEvent) => onSlideHoverEnter(watchable, event)"
                    @mouseleave="(event: MouseEvent) => onSlideHoverLeave(watchable, event)"
                    :style="{ backgroundImage: 'url(' + (watchable.backdrop ? api.getImageUrl(watchable.backdrop.id) : WatchablePlaceholder) + ')' }"
                    :key="watchable.id"
                    :to="getWatchableRoute(watchable)"
                >
                    <img class="logo" v-if="watchable.logo" :src="api.getImageUrl(watchable.logo.id)" :alt="watchable.name" />
                    <h3 class="fallback-name" v-else>{{ watchable.name }}</h3>

                    <div class="popup" :class="{ visible: hoveredSlide == watchable.id, left: leftSlides.includes(watchable.id) }">
                        <div
                            class="image-or-trailer"
                            :style="{
                                backgroundImage: 'url(' + (watchable.backdrop ? api.getImageUrl(watchable.backdrop.id) : WatchablePlaceholder) + ')',
                            }"
                        >
                            <img class="logo" v-if="watchable.logo" :src="api.getImageUrl(watchable.logo.id)" alt="" />
                            <h3 class="fallback-name" v-else>{{ watchable.name }}</h3>

                            <Button
                                class="info"
                                @click.prevent="router.push({ name: watchable.type == 'show' ? 'Show' : 'Movie', params: { id: watchable.id } })"
                            >
                                <Icon icon="info"
                            /></Button>

                            <Transition name="fade" appear>
                                <div class="trailer-wrapper" v-if="trailers[watchable.id] && hoveredSlide == watchable.id">
                                    <iframe
                                        class="trailer"
                                        v-if="trailers[watchable.id] && trailerVisible == watchable.id"
                                        width="100%"
                                        height="100%"
                                        :src="trailers[watchable.id]"
                                        frameborder="0"
                                        allow="autoplay;"
                                    ></iframe>
                                    <img
                                        class="loading"
                                        src="src/assets/images/spinner.svg"
                                        alt="Loading..."
                                        v-if="!noTrailerAvailable.includes(watchable.id)"
                                    />
                                </div>
                            </Transition>

                            <div class="video-overlay" v-if="trailers[watchable.id]"></div>
                        </div>
                    </div>
                </RouterLink>

                <div class="progress" v-if="watchable.progress.length > 0">
                    <div
                        class="value"
                        :style="{
                            width: `${API.getLatestProgress(watchable.progress) ? getPercentage(API.getLatestProgress(watchable.progress)!)  : 100
                            }%`,
                        }"
                    ></div>
                </div>
            </div>
        </div>
    </div>
</template>

<style lang="scss" scoped>
@import "src/styles/vars";
@import "src/styles/mixins";

.fade-enter-active,
.fade-leave-active {
    transition: opacity 1s;
}

.fade-leave-to,
.fade-enter-from {
    opacity: 0;
}

.slider {
    h2 {
        font: var(--font-36);
        margin-bottom: 10px;
    }

    .slides {
        width: 100%;
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
        gap: 20px;

        .slide {
            display: flex;
            flex-direction: column;
            align-items: center;

            &.no-progress {
                margin-bottom: 25px;
            }

            .progress {
                margin-top: 20px;
                height: 5px;
                width: 145px;
                display: flex;
                align-items: center;
                @include glass;

                .value {
                    height: 100%;
                    background-color: var(--foreground);
                    border-radius: var(--border-radius);
                }
            }

            .image {
                position: relative;
                background-size: cover;
                background-position: center;
                aspect-ratio: 16 / 9;
                border-radius: var(--border-radius);
                box-shadow: var(--image-glass);

                display: flex;
                align-items: center;
                justify-content: center;
                .logo {
                    max-width: 70%;
                    max-height: 70%;
                }

                .popup {
                    z-index: 2;
                    transition: transform 0.3s, opacity 0.3s;
                    position: absolute;
                    top: -20px;
                    width: 150%;
                    border-radius: var(--border-radius);
                    overflow: hidden;
                    background-color: var(--background);
                    transform: scale(0.666) translateY(-12%) translateX(0);
                    opacity: 0;

                    &.visible {
                        transform: scale(1) translateY(-12%);
                        opacity: 1;
                        z-index: 10;

                        &.left {
                            transform: scale(1) translateY(-12%) translateX(16%);
                        }

                        &.right {
                            transform: scale(1) translateY(-12%) translateX(-16%);
                        }
                    }

                    .image-or-trailer {
                        aspect-ratio: 16 / 9;
                        position: relative;
                        background-size: cover;
                        background-position: center;
                        display: flex;
                        justify-content: space-between;
                        box-shadow: var(--image-glass);
                        border-radius: var(--border-radius);
                        overflow: hidden;

                        .trailer-wrapper {
                            background-color: #000;
                            z-index: 0;
                            position: absolute;
                            top: 0;
                            left: 0;
                            width: 100%;
                            height: 100%;
                            display: flex;
                            justify-content: center;
                            align-items: center;

                            .trailer {
                                position: absolute;
                                top: -75%;
                                left: 0;
                                width: 100%;
                                height: 250%;
                            }

                            .loading {
                                max-width: 30%;
                                max-height: 30%;
                                z-index: -1;
                            }
                        }

                        .video-overlay {
                            position: absolute;
                            top: 0;
                            left: 0;
                            width: 100%;
                            height: 100%;
                            z-index: 1;
                            border-radius: var(--border-radius);
                            box-shadow: var(--image-glass);
                        }

                        .logo {
                            align-self: flex-end;
                            justify-self: end;
                            max-width: 40%;
                            max-height: 20%;
                            margin: 0 0 20px 20px;
                            z-index: 1;
                        }

                        .fallback-name {
                            align-self: flex-end;
                            justify-self: end;
                            max-width: 40%;
                            margin: 0 0 20px 20px;
                            z-index: 1;
                        }

                        .info {
                            z-index: 2;
                            align-self: flex-end;
                            margin: 0 20px 20px 0;
                            font-size: 29px;
                            box-shadow: var(--image-glass);
                            display: flex;
                            padding: 10px;

                            &:hover {
                                background-color: var(--image-glass-border);
                            }
                        }
                    }

                    .play {
                        width: 36px;
                        height: 36px;
                        aspect-ratio: 1 / 1;
                    }
                }
            }
        }
    }
}
</style>
