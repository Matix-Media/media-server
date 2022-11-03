<script lang="ts" setup>
import { computed, onMounted, ref, watch } from "vue";
import API, { Profile, Browse } from "../../lib/api";
import Icon from "src/components/Icon.vue";
import { useRoute, useRouter } from "vue-router";
import { useTitle } from "@vueuse/core";

const route = useRoute();
const router = useRouter();
const api = API.getInstance();
const profiles = ref<Profile[]>(await api.getProfiles());
useTitle("", { titleTemplate: API.getTitleTemplate });

if (profiles.value.length == 0) createProfile();

function createProfile() {
    router.push({ name: "CreateProfile", query: { next: route.query.next } });
}

async function selectProfile(profile: Profile) {
    api.setProfile(profile);
    if (route.query.next) router.push({ path: route.query.next.toString() });
}
</script>

<template>
    <div class="select-profile">
        <h1>{{ $t("profile.select.whoIsWatching") }}</h1>
        <div class="profiles">
            <button class="profile" v-for="profile in profiles" @click="selectProfile(profile)">
                <div class="profile-image" v-wave>
                    {{ profile.name.charAt(0).toUpperCase() }}
                </div>
                <p class="profile-name">
                    {{ profile.name }}
                </p>
            </button>
            <button class="add-profile profile" @click="createProfile">
                <div class="profile-image" v-wave>
                    <Icon icon="add"></Icon>
                </div>
            </button>
        </div>
    </div>
</template>

<style lang="scss" scoped>
@import "src/styles/vars";

.select-profile {
    height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;

    .profiles {
        display: flex;
        gap: 50px;
        margin-top: 60px;
        align-items: flex-start;
        flex-wrap: wrap;
        justify-content: center;

        .profile {
            cursor: pointer;
            font: var(--font-40);
            border: none;
            background: transparent;
            color: var(--foreground);
            transition: color 0.2s;

            .profile-image {
                margin-bottom: 16px;
                width: 200px;
                height: 200px;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: var(--glass);
                background-color: var(--glass-background);
                border-radius: var(--border-radius);
                font: var(--font-128);
            }

            &:hover {
                color: var(--white);
            }
        }

        .add-profile {
            opacity: 0.5;
        }
    }

    h1 {
        font: var(--font-48);
    }
}
</style>
