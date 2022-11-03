<script lang="ts" setup>
import { useTitle } from "@vueuse/core";
import API, { useAPI } from "src/lib/api";
import Button from "src/components/Button.vue";
import { ref } from "vue";
import Spinner from "src/assets/images/spinner.svg";
import { useRoute, useRouter } from "vue-router";

useTitle("", { titleTemplate: API.getTitleTemplate });
const api = useAPI();
const route = useRoute();
const router = useRouter();
const profileName = ref("");
const loading = ref(false);

async function createProfile() {
    if (profileName.value.length == 0) return;
    loading.value = true;
    await api.createProfile(profileName.value);
    loading.value = false;
    router.push({ name: "SelectProfile", query: { next: route.query.next } });
}
</script>

<template>
    <div class="create-profile">
        <h1>{{ $t("profile.create.title") }}</h1>
        <form @submit.prevent="createProfile">
            <img :src="Spinner" class="loading" :class="{ visible: loading }" />
            <input type="text" v-model="profileName" :placeholder="$t('profile.create.profileName')" />
            <Button type="submit">{{ $t("profile.create.create") }}</Button>
        </form>
    </div>
</template>

<style lang="scss" scoped>
@import "src/styles/vars";
@import "src/styles/mixins";

.create-profile {
    height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;

    form {
        display: flex;
        gap: 40px;
        margin-top: 60px;
        width: auto;

        .loading {
            height: 70px;
            opacity: 0;
            transition: opacity 0.1s;

            &.visible {
                opacity: 1;
            }
        }

        input {
            @include glass;
            cursor: pointer;
            border: none;
            color: var(--white);
            transition: color 0.2s;
            font: var(--font-40);
            width: 560px;
            box-sizing: border-box;
            cursor: text;
            padding: 0 35px;

            &:hover {
                color: var(--white);
            }

            &:focus {
                outline: none;
            }
        }

        button {
            font: var(--font-40);
            background-color: var(--image-glass-border);
            box-shadow: var(--image-glass);
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
