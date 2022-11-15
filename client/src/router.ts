import { createRouter, createWebHistory, RouteLocationNormalized, RouteLocationRaw, RouteRecordRaw } from "vue-router";
import WithHeader from "src/views/WithHeader.vue";
import Browse from "src/views/Browse.vue";
import SelectProfile from "src/views/profile/Select.vue";
import Login from "src/views/Login.vue";
import API from "./lib/api";

const navigationGuards: {
    [key: string]: (to: RouteLocationNormalized, from: RouteLocationNormalized) => void | RouteLocationRaw | Promise<void | RouteLocationRaw>;
} = {
    async requiresProfile(to, from) {
        const api = API.getInstance();
        await api.initialize();
        if (!api.selectedProfile) return { name: "SelectProfile", query: { next: to.path } };
    },
};

const routes: RouteRecordRaw[] = [
    {
        path: "/profile/select",
        name: "SelectProfile",
        component: SelectProfile,
    },
    {
        path: "/profile/create",
        name: "CreateProfile",
        component: () => import("src/views/profile/Create.vue"),
    },
    {
        path: "/movie/watch/:id",
        name: "StreamMovie",
        meta: {
            streamType: "movie",
        },
        component: () => import("src/views/Stream.vue"),
    },
    {
        path: "/show/watch/:id",
        name: "StreamEpisode",
        meta: {
            streamType: "episode",
        },
        component: () => import("src/views/Stream.vue"),
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
                component: () => import("src/views/Movie.vue"),
            },
            {
                path: "show/:id",
                name: "Show",
                component: () => import("src/views/Show.vue"),
            },
        ],
    },
    {
        path: "/auth/login",
        name: "Login",
        component: Login,
    },
    {
        path: "/:pathMatch(.*)*",
        redirect: { name: "Browse" },
    },
];

const router = createRouter({
    history: createWebHistory(),
    routes,
});

router.beforeEach;

export default router;
