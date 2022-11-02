<template>
    <button><slot></slot></button>
</template>

<style lang="scss" scoped>
@import "src/styles/vars";

button {
    border: none;
    background: transparent;
    box-shadow: var(--glass);
    cursor: pointer;
    color: var(--white);
    background-color: var(--glass-background);
    backdrop-filter: var(--glass-blur);
    border-radius: var(--border-radius);
    font: var(--font-16);
    padding: 6px 25px;
    transition: background-color 0.2s;

    &:hover {
        background-color: var(--glass-background-active);
    }
}
</style>
