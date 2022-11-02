<template>
    <span class="material-icons-outlined icon">{{ icon }}</span>
</template>

<script setup lang="ts">
import { defineProps } from "vue";
import "src/assets/fonts/material-design-icons/material-design-icons.css";

// eslint-disable-next-line vue/require-default-prop
defineProps({ icon: { type: String } });
</script>
