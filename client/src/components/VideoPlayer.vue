<script lang="ts" setup>
import Hls from "hls.js";
import { computed, nextTick, onBeforeUnmount, onMounted, onUnmounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import API from "../lib/api";
import Clickable from "./Clickable.vue";
import Icon from "./Icon.vue";
import Spinner from "src/assets/images/spinner.svg";

const props = defineProps<{
    streamId: string;
    showControls: boolean;
    watchableInfo?: { next?: string; title: string; subtitle?: string; thumbnail?: string };
    back?: string;
}>();

const router = useRouter();
const route = useRoute();
const videoWrapper = ref<HTMLDivElement>();
const video = ref<HTMLVideoElement>();
const progressWrapper = ref<HTMLDivElement>();
const progressBar = ref<HTMLDivElement>();
const volumeSlider = ref<HTMLDivElement>();
const isSupported = ref(Hls.isSupported());
let hls: Hls;
const hasMediaSession = "mediaSession" in navigator;
const api = API.getInstance();
const streamInfo = await api.getStream(props.streamId);
let progressReportInterval: number;

const hasHours = ref(true);
const playing = ref(false);
const duration = ref(1);
const elapsed = ref(0);
const buffering = ref(false);
const fullscreen = ref(false);
const seekPosition = ref(0);
const seekPopupPosition = ref(0);
const seeking = ref(false);
const skippingMouseDown = ref(false);
const skippingSeek = ref(0);
const volume = ref(1);
const changingVolume = ref(false);
const changingVolumeMouseDown = ref(false);
const controlsHidden = ref(false);
const hideControlsTimeout = ref<number>(-1);

watch(playing, (value) => {
    if (hasMediaSession && props.showControls) navigator.mediaSession.playbackState = value ? "playing" : "paused";
});

onMounted(async () => {
    if (!isSupported || !video.value) return;

    video.value.onplay = () => {
        playing.value = true;
    };

    video.value.onpause = () => {
        playing.value = false;
    };

    video.value.ontimeupdate = () => {
        elapsed.value = video.value?.currentTime!;
        if (duration.value - elapsed.value < 10) {
            api.reportStreamProgress(streamInfo.id, duration.value, true);
        }
        if (hasMediaSession && props.showControls) {
            navigator.mediaSession.setPositionState({ duration: duration.value, position: elapsed.value, playbackRate: 1 });
        }
    };

    video.value.onfullscreenchange = () => {
        fullscreen.value = !!document.fullscreenElement;
    };

    video.value.onvolumechange = () => {
        volume.value = video.value!.volume;
    };

    video.value.onloadedmetadata = () => {
        duration.value = video.value?.duration!;
        if (dissectTime(video.value?.duration!).hours == 0) hasHours.value = false;
        if (streamInfo.progress) video.value!.currentTime = streamInfo.progress.second;

        play();
        hideControls();

        progressReportInterval = setInterval(() => {
            if (!playing.value) return;
            api.reportStreamProgress(streamInfo.id, elapsed.value, duration.value - elapsed.value < 10);
        }, 10000) as any as number;

        if (hasMediaSession && props.showControls && props.watchableInfo) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: props.watchableInfo.title,
                album: props.watchableInfo.subtitle,
                artwork: props.watchableInfo.thumbnail ? [{ src: props.watchableInfo.thumbnail }] : undefined,
            });

            navigator.mediaSession.setActionHandler("play", () => togglePlayState());
            navigator.mediaSession.setActionHandler("pause", () => togglePlayState());
            navigator.mediaSession.setActionHandler("stop", () => togglePlayState());
            if (props.watchableInfo.next) navigator.mediaSession.setActionHandler("nexttrack", () => next());
            navigator.mediaSession.setActionHandler("seekto", (details) => {
                if (details.seekTime) video.value!.currentTime = details.seekTime;
            });
        }
    };

    window.onkeyup = (event) => {
        switch (event.key) {
            case " ":
            case "k":
                togglePlayState();
                event.preventDefault();
                break;
            case "f":
                toggleFullscreen();
                event.preventDefault();
                break;
        }
    };

    // Check if browser nativly supports HLS
    if (video.value.canPlayType("application/vnd.apple.mpegURL") || video.value.canPlayType("audio/mpegurl")) {
        console.log("Playing using native browser HLS support");
        const sourceElem = document.createElement("source");
        sourceElem.setAttribute("src", api.getStreamPartUrl(streamInfo.first_part.id, true, false));
        sourceElem.setAttribute("type", "application/vnd.apple.mpegURL");
        video.value.appendChild(sourceElem);

        const audioSourceElem = document.createElement("source");
        audioSourceElem.setAttribute("src", api.getStreamPartUrl(streamInfo.first_part.id, true, false));
        audioSourceElem.setAttribute("type", "audio/mpegurl");
        video.value.appendChild(audioSourceElem);
    } else {
        console.log("Playing using HLS.js polyfill");
        hls = new Hls({ debug: false });

        hls.loadSource(api.getStreamPartUrl(streamInfo.first_part.id, true, false));
        //if (streamInfo.first_part.has_subtitles) hls.loadSource(api.getStreamPartUrl(streamInfo.first_part.id, true, true));
        hls.attachMedia(video.value);

        hls.on(Hls.Events.MANIFEST_LOADED, (_event, data) => {});

        if (route.query.fullscreen) {
            toggleFullscreen();
        }
    }
});

onBeforeUnmount(() => {
    hls.destroy();
    clearInterval(progressReportInterval);
    if (hasMediaSession && props.showControls) {
        navigator.mediaSession.playbackState = "none";
    }
});

watch(volume, () => {
    if (video.value!.volume == volume.value) return;
    video.value!.volume = volume.value;
});

function play() {
    video.value?.play();
}

function pause() {
    video.value?.pause();
}

function togglePlayState() {
    if (playing.value) pause();
    else play();
}

async function toggleFullscreen() {
    try {
        if (fullscreen.value) await document.exitFullscreen();
        else await videoWrapper.value?.requestFullscreen();
        nextTick(() => {
            fullscreen.value = !fullscreen.value;
        });
    } catch (err) {
        // Catch fullscreen error
    }
}

function back() {
    if (router.options.history.state.back) router.back();
    else router.push({ name: props.back });
}

function seek(event: MouseEvent) {
    const seek = Math.min(
        Math.max(Math.round(((event.pageX - progressBar.value!.offsetLeft) / progressBar.value!.clientWidth) * duration.value), 0),
        duration.value,
    );
    seekPosition.value = seek;
    seekPopupPosition.value = Math.min(
        Math.max(event.pageX - 75, progressBar.value!.offsetLeft - 75),
        progressBar.value!.offsetLeft + progressBar.value!.clientWidth - 75,
    );
}

function skip() {
    video.value!.currentTime = seekPosition.value;
}

function skipMouseMove(event: MouseEvent) {
    const _seek = Math.min(
        Math.max(Math.round(((event.pageX - progressBar.value!.offsetLeft) / progressBar.value!.clientWidth) * duration.value), 0),
        duration.value,
    );
    skippingSeek.value = _seek;
    seek(event);
}

function skipMouseUp() {
    if (!skippingMouseDown.value) return;
    video.value!.currentTime = skippingSeek.value;
    elapsed.value = skippingSeek.value;
    skippingMouseDown.value = false;
}

function changeVolume(event: MouseEvent) {
    const targetVolume = Math.min(Math.max((event.pageX - volumeSlider.value!.offsetLeft) / volumeSlider.value!.clientWidth, 0), 1);
    video.value!.volume = targetVolume;
}

function next() {
    router.push({ name: "StreamEpisode", params: { id: props.watchableInfo?.next }, query: { fullscreen: 1 } });
}

function hideControls() {
    hideControlsTimeout.value = setTimeout(() => {
        if (!playing.value || skippingMouseDown.value || changingVolumeMouseDown.value) return;
        const elementsBelowMouse = document.querySelectorAll(":hover");
        for (const element of Array.from(elementsBelowMouse)) {
            if (element.classList.contains("big-icon") || element.classList.contains("progress") || element.classList.contains("volume-setting"))
                return;
        }
        controlsHidden.value = true;
    }, 3000) as any as number;
}

function showControls() {
    if (hideControlsTimeout.value != -1) clearTimeout(hideControlsTimeout.value);
    controlsHidden.value = false;
}

function videoPlayerMouseMove(event: MouseEvent) {
    if (skippingMouseDown.value) skipMouseMove(event);
    showControls();
    hideControls();
}

function formatTime(seconds: number, withHours: boolean) {
    const result = new Date(seconds * 1000).toISOString().substring(withHours ? 11 : 14, 19);
    return result;
}

function dissectTime(seconds: number) {
    const result = new Date(seconds * 1000).toISOString().substring(11, 23);
    return {
        hours: Number.parseInt(result.substring(0, 2)),
        minute: Number.parseInt(result.substring(3, 5)),
        seconds: Number.parseInt(result.substring(6, 8)),
        milliseconds: Number.parseInt(result.substring(9, 12)),
    };
}

function getThumbnail(second: number) {
    for (const thumbnail of streamInfo.thumbnails) {
        if (thumbnail.from <= second && thumbnail.to >= second) return thumbnail;
    }
    return null;
}
// For more api info https://freshman.tech/custom-html5-video/
</script>

<template>
    <div class="video-player" ref="videoWrapper" @mouseup="skipMouseUp" @mousemove="videoPlayerMouseMove">
        <div class="not-supported" v-if="!isSupported">
            <p>Sorry, but your browser does not support MediaSource Extensions. <a href="http://w3c.github.io/media-source/">Find out more</a></p>
        </div>
        <video ref="video" v-if="isSupported" autoplay="true"></video>
        <div class="controls" @click="togglePlayState()" @dblclick="toggleFullscreen()" :class="{ hidden: controlsHidden }">
            <Transition name="fade-down">
                <div class="top" v-if="!controlsHidden">
                    <Clickable v-if="props.back" @click.stop="back()" @dblclick.stop="">
                        <Icon class="back big-icon" icon="arrow_back_ios" />
                    </Clickable>
                    <div class="text" v-if="props.watchableInfo">
                        <h1>{{ props.watchableInfo.title }}</h1>
                        <p>{{ props.watchableInfo.subtitle }}</p>
                    </div>
                </div>
            </Transition>

            <div class="buffering-indicator" v-if="buffering">
                <img :src="Spinner" alt="Buffering..." />
            </div>

            <Transition name="fade-up">
                <div class="bottom" @click.stop="" @dblclick.stop="" v-if="!controlsHidden">
                    <div class="progress" ref="progressWrapper" @mouseenter="showControls" @mouseleave="hideControls">
                        <Transition name="fade-up" appear>
                            <div class="seek" v-if="seeking || skippingMouseDown" :style="{ left: `${seekPopupPosition}px` }">
                                <img v-if="getThumbnail(seekPosition)" :src="api.getImageUrl(getThumbnail(seekPosition)!.image.id)" alt="" />
                                <p>{{ formatTime(seekPosition, hasHours) }}</p>
                            </div>
                        </Transition>
                        <p class="elapsed time" :class="{ 'with-hours': hasHours }">{{ formatTime(elapsed, hasHours) }}</p>
                        <div
                            class="bar"
                            ref="progressBar"
                            @mousemove="seek"
                            @mousedown="skippingMouseDown = true"
                            @mouseenter="seeking = true"
                            @mouseleave="seeking = false"
                            @click="skip()"
                            :class="{ active: skippingMouseDown }"
                        >
                            <div class="elapsed" :style="{ width: `${((skippingMouseDown ? skippingSeek : elapsed) / duration) * 100}%` }">
                                <div class="playhead"></div>
                            </div>
                        </div>
                        <p class="duration time" :class="{ 'with-hours': hasHours }">{{ formatTime(duration, hasHours) }}</p>
                    </div>
                    <div class="buttons">
                        <div class="left" @mouseenter="showControls" @mouseleave="hideControls">
                            <Clickable @click="togglePlayState()">
                                <Icon class="big-icon" icon="play_arrow" v-if="!playing" />
                                <Icon class="big-icon" icon="pause" v-else />
                            </Clickable>
                            <div
                                class="volume-setting"
                                @mouseenter="changingVolume = true"
                                @mouseleave="
                                    changingVolume = false;
                                    changingVolumeMouseDown = false;
                                "
                                @mousemove="(event) => (changingVolumeMouseDown ? changeVolume(event) : {})"
                                @mouseup="changingVolumeMouseDown = false"
                                :class="{ expanded: changingVolume }"
                            >
                                <Clickable>
                                    <Icon class="big-icon" icon="volume_up" v-if="volume >= 0.66" />
                                    <Icon class="big-icon" icon="volume_down" v-else-if="volume >= 0.2" />
                                    <Icon class="big-icon" icon="volume_off" v-else-if="volume == 0" />
                                    <Icon class="big-icon" icon="volume_mute" v-else />
                                </Clickable>
                                <Transition name="fade-right">
                                    <div
                                        class="volume"
                                        v-if="changingVolume || changingVolumeMouseDown"
                                        @mousedown="changingVolumeMouseDown = true"
                                        @click="changeVolume"
                                        ref="volumeSlider"
                                    >
                                        <div class="current" :style="{ width: `${volume * 100}%` }">
                                            <div class="playhead"></div>
                                        </div>
                                    </div>
                                </Transition>
                            </div>
                        </div>
                        <div class="right" @mouseenter="showControls" @mouseleave="hideControls">
                            <Clickable v-if="props.watchableInfo?.next" @click="next()">
                                <Icon class="big-icon" icon="skip_next" />
                            </Clickable>
                            <Clickable>
                                <Icon class="big-icon" icon="subtitles" />
                            </Clickable>
                            <Clickable @click="toggleFullscreen()">
                                <Icon class="big-icon" icon="fullscreen" v-if="!fullscreen" />
                                <Icon class="big-icon" icon="fullscreen_exit " v-else />
                            </Clickable>
                        </div>
                    </div>
                </div>
            </Transition>
        </div>
    </div>
</template>

<style lang="scss" scoped>
@import "src/styles/vars";
@import "src/styles/mixins";

.fade-up-enter-active,
.fade-up-leave-active {
    transition: opacity 0.1s, transform 0.1s;
}

.fade-up-enter-from,
.fade-up-leave-to {
    opacity: 0;
    transform: translateY(10%);
}

.fade-right-enter-active,
.fade-right-leave-active {
    transition: opacity 0.1s, transform 0.1s;
}

.fade-right-enter-from,
.fade-right-leave-to {
    opacity: 0;
    transform: translateX(-10%);
}

.fade-down-enter-active,
.fade-down-leave-active {
    transition: opacity 0.1s, transform 0.1s;
}

.fade-down-enter-from,
.fade-down-leave-to {
    opacity: 0;
    transform: translateY(-10%);
}

.video-player {
    width: 100%;
    height: 100%;
    background-color: black;
    position: relative;
    overflow: hidden;
    video {
        max-width: inherit;
        max-height: inherit;
        width: inherit;
        height: inherit;
        background-color: #000;
    }

    .controls {
        &.hidden {
            cursor: none;
            background: transparent;
        }

        position: absolute;
        z-index: 1;
        top: 0;
        left: 0;
        height: 100%;
        width: 100%;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        padding: 25px var(--side-padding);
        background: linear-gradient(180deg, rgba(24, 24, 41, 0) 82.81%, rgba(24, 24, 41, 0.3) 95%, rgba(24, 24, 41, 0.3) 100%),
            linear-gradient(180deg, rgba(24, 24, 41, 0.11) 0%, rgba(24, 24, 41, 0.11) 10%, rgba(24, 24, 41, 0) 14.58%);
        transition: background 0.2s;

        .buffering-indicator {
            position: absolute;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
            display: flex;
            background: radial-gradient(50% 50% at 50% 50%, rgba(24, 25, 41, 0.3) 0%, rgba(24, 25, 41, 0.3) 61.98%, rgba(24, 25, 41, 0) 100%);
            padding: 50px;

            img {
                width: 150px;
            }
        }

        .big-icon {
            font-size: 60px;
        }

        .top {
            display: flex;
            align-items: center;
            width: auto;

            .back {
                margin-right: 10px;
            }

            h1 {
                font: var(--font-36);
            }
            p {
                font: var(--font-16);
            }
        }

        .bottom {
            display: flex;
            flex-direction: column;

            .progress {
                display: flex;
                align-items: center;
                margin-bottom: 15px;

                .seek {
                    position: absolute;
                    bottom: calc(135px);
                    width: 150px;
                    z-index: -1;
                    img {
                        border: 1px solid var(--image-glass-border);
                        border-radius: var(--border-radius);
                        width: 149px;
                        min-width: 149px;
                        max-width: 149px;
                        min-height: 10px;
                        background-color: #000;
                    }

                    p {
                        text-align: center;
                    }
                }

                .time {
                    width: 40px;

                    &.with-hours {
                        width: 70px;
                    }
                }

                .duration {
                    text-align: end;
                }

                .bar {
                    flex: 1;
                    height: 5px;
                    @include glass;
                    padding: 1px;
                    transition: background-color 0.1s, box-shadow 0.1s, height 0.1s, margin-bottom 0.1s;
                    cursor: pointer;
                    margin: 0 20px;

                    &:hover,
                    &.active {
                        background-color: rgba(var(--background-color-values), 0.3);
                        box-shadow: var(--image-glass);
                        height: 10px;

                        .elapsed .playhead {
                            width: 10px;
                        }
                    }

                    .elapsed {
                        height: 100%;
                        background-color: var(--background);
                        border-radius: var(--border-radius);
                        display: flex;
                        justify-content: end;

                        .playhead {
                            height: 100%;
                            width: 5px;
                            background-color: var(--glass-border-active);
                            border-radius: var(--border-radius);
                        }
                    }
                }
            }

            .buttons {
                display: flex;
                justify-content: space-between;

                .volume-setting {
                    display: flex;
                    align-items: center;

                    &.expanded {
                        padding-right: 20px;
                    }

                    .volume {
                        height: 10px;
                        width: 150px;
                        @include glass;
                        background-color: rgba(var(--background-color-values), 0.3);
                        box-shadow: var(--image-glass);
                        cursor: pointer;

                        .current {
                            height: 100%;
                            background-color: var(--background);
                            border-radius: var(--border-radius);
                            display: flex;
                            justify-content: end;

                            .playhead {
                                height: 100%;
                                width: 10px;
                                background-color: var(--glass-border-active);
                                border-radius: var(--border-radius);
                            }
                        }
                    }
                }

                .left,
                .right {
                    display: flex;
                    align-items: center;
                    gap: 15px;
                }
            }
        }
    }
}
</style>
