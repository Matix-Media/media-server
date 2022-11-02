<script lang="ts" setup>
const props = defineProps<{ value: number }>();
</script>

<template>
    <div class="progress">
        <div class="value" :style="{ width: `${props.value}%` }"></div>
    </div>
</template>

<style lang="scss" scoped>
@import "src/styles/vars";
@import "src/styles/mixins";

.progress {
    @include glass;
    height: 5px;
    display: flex;
    align-items: center;

    .value {
        height: 100%;
        background-color: var(--foreground);
        border-radius: var(--border-radius);
    }
}
</style>
