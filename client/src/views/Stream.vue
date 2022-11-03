<script lang="ts" setup>
import { metaProperty } from "@babel/types";
import { useTitle } from "@vueuse/core";
import VideoPlayer from "src/components/VideoPlayer.vue";
import API, { Episode, EpisodeStreamInfo, MovieStreamInfo } from "src/lib/api";
import { useI18n } from "vue-i18n";
import { useRoute } from "vue-router";

const route = useRoute();
const { t } = useI18n();
const watchableId = route.params.id as string;
const isMovie = route.meta.streamType == "movie";

const api = API.getInstance();
let episode: EpisodeStreamInfo;
let nextEpisode: Episode;
let movie: MovieStreamInfo;
let subtitle: string;
if (isMovie) {
    movie = await api.getMovie(watchableId);
} else {
    episode = await api.getEpisode(watchableId);
    nextEpisode = episode;
    subtitle = `${t("watch.season")} ${episode.season.season_number}, ${t("watch.episode")} ${episode.episode_number}: ${episode.name}`;
}

useTitle(t("watch.title", { title: isMovie ? movie!.watchable.name : episode!.season.show.watchable.name }), { titleTemplate: API.getTitleTemplate });
</script>

<template>
    <div class="stream">
        <VideoPlayer
            :stream-id="isMovie ? movie.stream.id : episode.stream.id"
            :show-controls="true"
            :watchable-info="
                isMovie ? { title: movie.watchable.name } : { title: episode.season.show.watchable.name, subtitle, next: nextEpisode.id }
            "
            back="Browse"
        />
    </div>
</template>

<style lang="scss" scoped>
.stream {
    height: 100vh;
    width: 100vw;
    .video-player {
        max-height: 100vh;
        max-width: 100vw;
    }
}
</style>
