import { createI18n } from "vue-i18n";
import en from "./languages/en.json";

const i18n = createI18n({
    fallbackLocale: "en",
    legacy: false,
    allowComposition: true,
    silentFallbackWarn: true,
    silentTranslationWarn: true,
    fallbackWarn: false,
    missingWarn: false,
    messages: {
        en,
    },
});

export default i18n;
