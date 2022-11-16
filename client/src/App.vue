<script setup lang="ts">
import VideoPlayer from "./components/VideoPlayer.vue";
import Spinner from "src/assets/images/spinner.svg";
import { useRoute, useRouter } from "vue-router";
import { nextTick, onMounted, ref } from "vue";
import API from "./lib/api";
import axios from "axios";

const router = useRouter();
const route = useRoute();
const root = ref<HTMLDivElement>();
const loading = ref(true);
const api = API.getInstance();
onMounted(async () => {
    try {
        await api.initialize();
    } catch (err) {}
    loading.value = false;
});

if (route.query.fullscreen) {
    root.value?.requestFullscreen();
}
</script>

<template>
    <div class="loading" v-if="loading">
        <img :src="Spinner" />
    </div>

    <RouterView v-slot="{ Component }" ref="root" v-if="!loading">
        <Suspense timeout="0">
            <template #default>
                <Component :is="Component" :key="route.path"></Component>
            </template>

            <template #fallback>
                <Transition name="fade">
                    <div class="loading">
                        <img :src="Spinner" />
                    </div>
                </Transition>
            </template>
        </Suspense>
    </RouterView>
</template>

<style lang="scss" scoped>
.fade-enter-active {
    transition: opacity 0.2s;
}

.fade-enter-from {
    opacity: 0;
}

.loading {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
}
</style>

<style lang="scss">
@import "src/styles/vars";

::-webkit-scrollbar {
    width: 10px;
}

::-webkit-scrollbar-track {
    background-color: transparent;
}

::-webkit-scrollbar-thumb {
    background-color: rgba(48, 49, 59, 0.5);
    box-shadow: var(--glass);
    border-radius: var(--border-radius);
    backdrop-filter: var(--glass-blur);
    width: 10px;
}

body {
    background-color: var(--background);
    margin: 0;
    font: var(--font-16);
    color: var(--white);
    overflow-x: hidden;
    overflow-y: overlay;

    a,
    p,
    h1,
    h2,
    h3,
    h4 {
        margin: 0;
    }

    * {
        user-select: none;
        -webkit-tap-highlight-color: transparent;
    }
}

@media (max-width: $mobile) {
    html,
    body {
        overflow-x: hidden;
    }
}
</style>
