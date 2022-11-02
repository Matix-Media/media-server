import { createRouter, createWebHistory, RouteLocationNormalized, RouteLocationRaw, RouteRecordRaw } from "vue-router";
import WithHeader from "src/views/WithHeader.vue";
import Browse from "src/views/Browse.vue";
import SelectProfile from "src/views/profile/Select.vue";
import Movie from "src/views/Movie.vue";
import Show from "src/views/Show.vue";
import Stream from "src/views/Stream.vue";
import API from "./lib/api";

const navigationGuards: {
    [key: string]: (to: RouteLocationNormalized, from: RouteLocationNormalized) => void | RouteLocationRaw | Promise<void | RouteLocationRaw>;
} = {
    async requiresProfile(to, from) {
        const api = API.getInstance();
        await api.initialize();
        if (!api) return { name: "SelectProfile", query: { next: to.path } };
    },
};

const routes: RouteRecordRaw[] = [
    {
        path: "/profile/select",
        name: "SelectProfile",
        component: SelectProfile,
    },
    {
        path: "/movie/watch/:id",
        name: "StreamMovie",
        meta: {
            streamType: "movie",
        },
        component: Stream,
    },
    {
        path: "/show/watch/:id",
        name: "StreamEpisode",
        meta: {
            streamType: "episode",
        },
        component: Stream,
    },
    {
        path: "/",
        component: WithHeader,
        redirect: { name: "Browse" },
        children: [
            {
                path: "browse",
                name: "Browse",
                component: Browse,
                beforeEnter: [navigationGuards.requiresProfile],
            },

            {
                path: "movie/:id",
                name: "Movie",
                component: Movie,
            },
            {
                path: "show/:id",
                name: "Show",
                component: Show,
            },
        ],
    },
];

const router = createRouter({
    history: createWebHistory(),
    routes,
});

router.beforeEach;

export default router;
