import { createApp } from "vue";
import App from "./App.vue";
import i18n from "./i18n";
import router from "./router";
import vwave from "v-wave";

createApp(App).use(router).use(i18n).use(vwave).mount("#app");
