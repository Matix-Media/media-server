<script lang="ts" setup>
import API, { useAPI } from "src/lib/api";
import { ref } from "vue";
import Clickable from "src/components/Clickable.vue";
import Icon from "src/components/Icon.vue";
import Spinner from "src/assets/images/spinner.svg";
import { useRoute, useRouter } from "vue-router";

const api = useAPI();
const router = useRouter();
const route = useRoute();
const searchFocused = ref(false);
const userPopupOpen = ref(false);

function switchProfile() {
    router.push({ name: "SelectProfile", query: { next: route.path } });
}

function logout() {
    api.logout();
    switchProfile();
}
</script>

<template>
    <header>
        <div class="links">
            <RouterLink :to="{ name: 'Browse' }">Home</RouterLink>
        </div>
        <div class="search">
            <div class="search-box" :class="{ focused: searchFocused }">
                <Icon icon="search" />
                <input type="search" @focus="searchFocused = true" @blur="searchFocused = false" :placeholder="$t('browse.header.search')" />
            </div>
        </div>
        <div class="infos">
            <Clickable class="user" @click="userPopupOpen = !userPopupOpen">
                {{ api.selectedProfile?.name.charAt(0).toUpperCase() }}
                <Transition name="fade-down">
                    <div class="popup" v-if="userPopupOpen">
                        <Clickable @click="switchProfile" v-if="!api.selectedProfile?.auth_provider_id">
                            {{ $t("profile.menu.switch") }}
                        </Clickable>
                        <Clickable @click="logout">{{ $t("profile.menu.logout") }}</Clickable>
                    </div>
                </Transition>
            </Clickable>
        </div>
    </header>

    <RouterView v-slot="{ Component }" ref="root">
        <Suspense timeout="0">
            <template #default>
                <Component :is="Component"></Component>
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
@import "src/styles/vars";
@import "src/styles/mixins";

.fade-enter-active {
    transition: opacity 0.2s;
}

.fade-enter-from {
    opacity: 0;
}

.fade-down-enter-active,
.fade-down-leave-active {
    transition: opacity 0.2s, transform 0.2s;
}

.fade-down-enter-from,
.fade-down-leave-to {
    transform: translateY(-10%);
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

header {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    z-index: 999;
    padding: 15px var(--side-padding);
    padding-bottom: 45px;
    box-sizing: border-box;
    background: linear-gradient(180deg, #181929 0%, rgba(24, 25, 41, 0.56) 63.54%, rgba(24, 25, 41, 0) 100%);
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    align-items: center;

    @media (max-width: $mobile) {
        width: 100vw;
        grid-template-columns: 1fr 2fr 1fr;
    }

    a {
        color: var(--white);
        text-decoration: none;
        font: var(--font-20);
    }

    .search {
        display: flex;
        justify-content: center;
        .search-box {
            width: 380px;
            height: 36px;
            display: flex;
            align-items: center;
            box-shadow: var(--glass);
            background-color: var(--glass-background);
            border-radius: var(--border-radius);
            backdrop-filter: var(--glass-blur);
            transition: background-color 0.2s;

            @media (max-width: $mobile) {
                width: 100%;
            }

            &.focused {
                background-color: var(--glass-background-active);
            }

            .icon {
                font-size: 21px;
                margin-left: 13px;
                opacity: 0.8;
            }

            input {
                height: 100%;
                width: 100%;
                background-color: transparent;
                border: none;
                color: var(--white);
                font: var(--font-16);
                padding: 0 10px;

                &:focus {
                    outline: none;
                }

                &::-ms-clear {
                    display: none;
                    width: 0;
                    height: 0;
                }

                [type="search"],
                &::-ms-reveal {
                    display: none;
                    width: 0;
                    height: 0;
                }

                &::-webkit-search-decoration,
                &::-webkit-search-cancel-button,
                &::-webkit-search-results-button,
                &::-webkit-search-results-decoration {
                    display: none;
                }
            }
        }
    }

    .infos {
        display: flex;
        justify-content: end;
        .user {
            @include glass;
            height: 38px;
            width: 38px;
            font: var(--font-20);
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;

            .popup {
                position: absolute;
                top: calc(100% + 10px);
                right: 0;
                width: max-content;
                background-color: var(--background);
                border-radius: var(--border-radius);
                box-shadow: var(--glass);
                display: flex;
                flex-direction: column;
                overflow: hidden;

                button {
                    padding: 10px 15px;
                    transition: background-color 0.2s;

                    &:hover {
                        background-color: var(--glass-background-active);
                    }
                }
            }
        }
    }
}
</style>
