import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { VitePWA } from "vite-plugin-pwa";
import * as path from "path";

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        vue(),
        VitePWA({
            registerType: "autoUpdate",
        }),
    ],
    resolve: {
        alias: {
            src: path.resolve("./src"),
        },
    },
});
