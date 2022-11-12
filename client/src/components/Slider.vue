<script lang="ts" setup>
import API, { Progress, Watchable } from "src/lib/api";
import { nextTick, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import Icon from "./Icon.vue";
import WatchablePlaceholder from "src/assets/images/watchable-placeholder.jpg";
import * as uuid from "uuid";
import Clickable from "./Clickable.vue";
import Button from "./Button.vue";
const props = defineProps<{ title: string; watchables: Array<Watchable & { progress: Progress[] }> }>();
const router = useRouter();
const api = API.getInstance();
const slides = ref<HTMLDivElement>();
const hoveringTimeouts = ref<Record<string, number>>({});
const hoveringLeaveTimeouts = ref<Record<string, number>>({});
const hoveredSlide = ref<string>();
const leftSlides = ref<string[]>([]);
const rightSlides = ref<string[]>([]);
const trailerVisible = ref<string>();
const trailers = ref<{ [key: string]: string }>({});
const noTrailerAvailable = ref<string[]>([]);
const sliderId = uuid.v4();
const scrollLeftVisible = ref(false);
const scrollRightVisible = ref(true);
const sidePadding = Number.parseInt(getComputedStyle(document.documentElement).getPropertyValue("--side-padding").split("px")[0]);

function onSlideHoverEnter(watchable: Watchable) {
    if (hoveringLeaveTimeouts.value[watchable.id]) {
        clearTimeout(hoveringLeaveTimeouts.value[watchable.id]);
    }

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

    hoveringTimeouts.value[watchable.id] = setTimeout(() => {
        setTimeout(() => {
            trailerVisible.value = watchable.id;
        }, 1000);

        const slideImage = document.querySelector("#scroll-slide-" + watchable.id + "-" + sliderId + " .image") as HTMLDivElement;
        const slideImageRect = slideImage.getBoundingClientRect();
        const bodyRect = document.body.getBoundingClientRect();
        let popup = document.querySelector("#scroll-popup-" + watchable.id + "-" + sliderId) as HTMLDivElement;
        popup.style.width = slideImage.clientWidth * 1.5 + "px";
        popup.style.height = slideImage.clientHeight * 1.5 + "px";
        popup.style.top = slideImageRect.top - slideImage.clientHeight * 0.25 + bodyRect.top * -1 + "px";
        popup.style.left = slideImageRect.left - slideImage.clientWidth * 0.25 + "px";
        const rect = slideImage.getBoundingClientRect();
        const overlap = rect.width * 0.25;
        const rightEdge = slideImage!.getBoundingClientRect().width + rect.left + overlap;
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
    }, 500) as any as number;
}

function onSlideHoverLeave(watchable: Watchable) {
    if (hoveringTimeouts.value[watchable.id]) {
        clearTimeout(hoveringTimeouts.value[watchable.id]);
    }
    hoveringLeaveTimeouts.value[watchable.id] = setTimeout(() => {
        if (hoveredSlide.value != watchable.id) return;
        hoveredSlide.value = undefined;
        trailerVisible.value = undefined;
    }, 100) as any as number;
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

function onScroll() {
    if (!slides.value) return;

    if (slides.value.scrollWidth <= slides.value.clientWidth + slides.value.scrollLeft) {
        scrollLeftVisible.value = false;
    } else {
        scrollLeftVisible.value = true;
    }

    if (slides.value.scrollLeft == 0) {
        scrollRightVisible.value = false;
    } else {
        scrollRightVisible.value = true;
    }
}

function scrollRight() {
    if (!slides.value) return;
    slides.value.scroll({ left: slides.value.scrollLeft + document.body.clientWidth - sidePadding, behavior: "smooth" });
}

function scrollLeft() {
    if (!slides.value) return;
    slides.value.scroll({ left: slides.value.scrollLeft - document.body.clientWidth - sidePadding, behavior: "smooth" });
}

onMounted(() => {
    onScroll();
});
</script>

<template>
    <div class="slider">
        <h2>{{ props.title }}</h2>

        <Transition name="fade-left">
            <Button class="scroll scroll-left" v-if="scrollRightVisible" @click="scrollLeft">
                <Icon icon="arrow_backward_ios" />
            </Button>
        </Transition>

        <Transition name="fade-right">
            <Button class="scroll scroll-right" v-if="scrollLeftVisible" @click="scrollRight">
                <Icon icon="arrow_forward_ios" />
            </Button>
        </Transition>

        <div class="slides" ref="slides" @scroll="onScroll">
            <div
                class="slide"
                v-for="watchable in props.watchables"
                :class="{ 'no-progress': !API.getLatestProgress(watchable.progress) }"
                :id="'scroll-slide-' + watchable.id + '-' + sliderId"
            >
                <RouterLink
                    class="image"
                    @mouseenter="(event: MouseEvent) => onSlideHoverEnter(watchable)"
                    @mouseleave="(event: MouseEvent) => onSlideHoverLeave(watchable)"
                    :style="{ backgroundImage: 'url(' + (watchable.backdrop ? api.getImageUrl(watchable.backdrop.id) : WatchablePlaceholder) + ')' }"
                    :key="watchable.id"
                    :to="getWatchableRoute(watchable)"
                >
                    <img class="logo" v-if="watchable.logo" :src="api.getImageUrl(watchable.logo.id)" :alt="watchable.name" />
                    <h3 class="fallback-logo" v-else>{{ watchable.name }}</h3>

                    <Teleport to="body">
                        <div
                            :id="'scroll-popup-' + watchable.id + '-' + sliderId"
                            class="popup"
                            :class="{
                                visible: hoveredSlide == watchable.id,
                                left: leftSlides.includes(watchable.id),
                                right: rightSlides.includes(watchable.id),
                            }"
                            @mouseenter="(event: MouseEvent) => onSlideHoverEnter(watchable)"
                            @mouseleave="(event: MouseEvent) => onSlideHoverLeave(watchable)"
                            @click="router.push(getWatchableRoute(watchable))"
                        >
                            <div
                                class="image-or-trailer"
                                :style="{
                                    backgroundImage:
                                        'url(' + (watchable.backdrop ? api.getImageUrl(watchable.backdrop.id) : WatchablePlaceholder) + ')',
                                }"
                            >
                                <img class="logo" v-if="watchable.logo" :src="api.getImageUrl(watchable.logo.id)" alt="" />
                                <h3 class="fallback-logo" v-else>{{ watchable.name }}</h3>

                                <Button
                                    class="info"
                                    @click.prevent
                                    @click.stop="router.push({ name: watchable.type == 'show' ? 'Show' : 'Movie', params: { id: watchable.id } })"
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
                    </Teleport>
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

.fade-left-enter-active,
.fade-left-leave-active,
.fade-right-enter-active,
.fade-right-leave-active {
    transition: opacity 0.2s, transform 0.2s;
}

.fade-left-leave-to,
.fade-left-enter-from {
    opacity: 0;
    transform: translateX(-10%);
}

.fade-right-leave-to,
.fade-right-enter-from {
    opacity: 0;
    transform: translateX(10%);
}

.slider {
    position: relative;

    h2 {
        font: var(--font-36);
        margin-bottom: 10px;
        margin-left: var(--side-padding);
    }

    .slides {
        width: 100%;
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
        grid-template-rows: 1fr;
        grid-auto-flow: column;
        grid-auto-columns: minmax(250px, 1fr);
        gap: 20px;
        padding: 0 var(--side-padding);
        z-index: 0;
        box-sizing: border-box;

        // Hide scrollbar
        overflow-y: scroll;
        overflow-x: visible;
        scrollbar-width: none; /* Firefox */
        -ms-overflow-style: none; /* Internet Explorer 10+ */
        &::-webkit-scrollbar {
            /* WebKit */
            width: 0;
            height: 0;
        }

        .slide {
            display: flex;
            flex-direction: column;
            align-items: center;
            grid-row: 1;

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
                border-radius: var(--border-radius);
                box-shadow: var(--image-glass);
                aspect-ratio: 16 / 9;
                width: 100%;
                text-decoration: none;

                display: flex;
                align-items: center;
                justify-content: center;

                @supports not (aspect-ratio: 16 /9) {
                    padding-bottom: 56.25%;
                }

                .logo {
                    max-width: 70%;
                    max-height: 70%;
                }

                .fallback-logo {
                    color: var(--white);
                    font-size: 36px;
                    text-shadow: 0px 4px 3px rgb(0 0 0 / 40%), 0px 8px 13px rgb(0 0 0 / 10%), 0px 18px 23px rgb(0 0 0 / 10%);
                }
            }
        }
    }

    .scroll {
        position: absolute;
        top: 60px;
        z-index: 1;
        height: calc(100% - 20px - 60px);
        width: 80px;
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 0;
        margin: 0;
        font-size: 34px;
        background-color: rgba(var(--background-color-values), 0.7);

        &:hover {
            background-color: rgba(var(--background-color-values), 0.75);
        }

        &.scroll-left {
            left: 0;
            border-top-left-radius: 0;
            border-bottom-left-radius: 0;
            margin-left: -1px;
        }

        &.scroll-right {
            right: 0;
            border-top-right-radius: 0;
            border-bottom-right-radius: 0;
            margin-right: -1px;
        }
    }
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
    transform: scale(0.666) translateX(0);
    opacity: 0;
    pointer-events: none;
    cursor: pointer;

    &.visible {
        transform: scale(1);
        opacity: 1;
        z-index: 10;
        pointer-events: all;

        &.left {
            transform: scale(1) translateX(16%);
        }

        &.right {
            transform: scale(1) translateX(-16%);
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

        .fallback-logo {
            align-self: flex-end;
            justify-self: end;
            max-width: 40%;
            margin: 0 0 20px 20px;
            z-index: 1;
            color: var(--white);
            font-size: 24px;
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
</style>
