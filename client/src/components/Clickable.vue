<template>
    <button>
        <slot></slot>
    </button>
</template>

<style lang="scss" scoped>
@import "src/styles/vars";

button {
    border: none;
    color: var(--white);
    background-color: transparent;
    cursor: pointer;
    font: var(--font-16);
    display: flex;
}
</style>
