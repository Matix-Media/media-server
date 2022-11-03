<script lang="ts" setup>
import API, { Progress, Watchable } from "src/lib/api";
import Button from "src/components/Button.vue";
import Icon from "src/components/Icon.vue";
import { nextTick, onMounted, ref } from "vue";
import Slider from "src/components/Slider.vue";
import { useRouter } from "vue-router";
import WatchablePlaceholder from "src/assets/images/watchable-placeholder.jpg";
import { useTitle } from "@vueuse/core";
import { useI18n } from "vue-i18n";

const router = useRouter();
const api = API.getInstance();
const browse = await api.getBrowse();
const { t } = useI18n();

useTitle(t("browse.title"), { titleTemplate: API.getTitleTemplate });

function navigate(watchable: Watchable & { progress: Progress[] }, watch: boolean) {
    if (watch) {
        if (watchable.movie_content) router.push({ name: "StreamMovie", params: { id: watchable.movie_content.id } });
        else router.push({ name: "StreamEpisode", params: { id: API.getLatestProgress(watchable.progress)?.episode.id } });
    } else {
        if (watchable.movie_content) router.push({ name: "Movie", params: { id: watchable.id } });
        else router.push({ name: "Show", params: { id: watchable.id } });
    }
}
</script>

<template>
    <div class="browse">
        <div
            class="billboard"
            :style="{
                backgroundImage: 'url(' + (browse.billboard.backdrop ? api.getImageUrl(browse.billboard.backdrop.id) : WatchablePlaceholder) + ')',
            }"
        >
            <img class="logo" v-if="browse.billboard.logo" :src="api.getImageUrl(browse.billboard.logo.id)" alt="" />
            <h1 v-else>{{ browse.billboard.name }}</h1>
            <p class="description">
                {{ browse.billboard.description }}
            </p>
            <div class="buttons">
                <Button class="info" @click="navigate(browse.billboard, false)">
                    <Icon icon="info" />
                </Button>
                <Button class="watch" @click="navigate(browse.billboard, true)">
                    <Icon icon="play_arrow" />
                    {{ $t("browse.billboard.watchNow") }}
                </Button>
            </div>

            <div class="fade"></div>

            <div class="circle-fade"></div>
        </div>
        <div class="sliders">
            <Slider :title="$t('browse.sliders.' + slider.type)" v-for="slider in browse.sliders" :watchables="slider.slides" />
            <div
                class="background"
                :style="{
                    backgroundImage:
                        'url(' + (browse.billboard.backdrop ? api.getImageUrl(browse.billboard.backdrop.id) : WatchablePlaceholder) + ')',
                }"
            ></div>
        </div>
    </div>
</template>

<style lang="scss" scoped>
@import "src/styles/vars";
@import "src/styles/mixins";

.browse {
    display: flex;
    flex-direction: column;
    padding-bottom: 35px;

    .billboard {
        height: 90vh;
        background-size: cover;
        background-position: center;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: flex-start;
        padding: 0 var(--side-padding);
        position: relative;
        transition: background-image 0.2s;

        .logo {
            width: 375px;
            z-index: 1;
        }

        .description {
            margin-top: 40px;
            font: var(--font-20);
            width: 430px;
            z-index: 1;
        }

        .buttons {
            z-index: 1;
            display: flex;
            margin-top: 25px;
            gap: 20px;

            .icon {
                font-size: 40px;
            }

            .info {
                padding: 6px;
                display: flex;
            }

            .watch {
                font: var(--font-24);
                display: flex;
                align-items: center;

                .icon {
                    margin-right: 15px;
                }
            }
        }

        .fade {
            height: 125px;
            position: absolute;
            bottom: 0;
            left: 0;
            width: 100%;
            background: linear-gradient(180deg, rgba(24, 25, 41, 0) 0%, #181929 100%);
        }

        .circle-fade {
            position: absolute;
            bottom: 0;
            left: 0;
            width: 50%;
            height: 100%;
            background: radial-gradient(100% 100% at 0% 50%, rgba(24, 25, 41, 0.5) 0%, rgba(24, 25, 41, 0) 100%);
            z-index: 0;
        }
    }

    .sliders {
        z-index: 1;
        margin-top: -125px;
        padding: 0 var(--side-padding);
        display: flex;
        flex-direction: column;
        gap: 35px;
        position: relative;
    }

    .background {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: -1;
        filter: blur(150px);
        transition: background-image 0.2s;

        &::after {
            content: "";
            display: block;
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(var(--background-color-values), 0.8);
        }
    }
}
</style>
