<template>
    <div class="flex h-screen flex-col items-center">
        <div class="flex h-full flex-col items-center justify-center px-4 w-full">
            <h1 class="text-center text-6xl font-bold text-white">
                {{ $appName }}
            </h1>

            <div class="mt-4 text-3xl text-white text-center">
                An intelligent Open-Source Software Assistance System
            </div>

            <div class="mt-16 flex w-full max-w-[1000px] gap-x-12">
                <RecentlyUsedRepositories class="grow" />

                <GetStarted
                    @show-clone-repository-popup="
                        isCloneRepositoryPopupVisible = true
                    "
                />
            </div>

            <CloneRepositoryPopup
                v-if="isCloneRepositoryPopupVisible"
                @hide-clone-repository-popup="
                    isCloneRepositoryPopupVisible = false
                "
            />
        </div>

        <a
            target="_blank"
            href="https://github.com/gelkoh/oss-tutor"
            title="Link to the GitHub repository of this project"
            class="mt-auto mb-6 flex cursor-pointer items-center gap-x-2 rounded-md bg-neutral-800 px-4 py-2 hover:bg-neutral-700"
        >
            <Github :size="18" class="inline-block" /> Source Code
        </a>

        <img src="../assets/images/dashboard-background.jpg" class="absolute inset-0 -z-1 h-full w-full object-cover opacity-50 grayscale" />
    </div>
</template>

<script setup>
import { ref, onMounted } from "vue"
import { useRepoStateStore } from "../stores/repoState.js"
import { Github } from "lucide-vue-next"
import RecentlyUsedRepositories from "../components/RecentlyUsedRepositories.vue"
import GetStarted from "../components/GetStarted.vue"
import CloneRepositoryPopup from "../components/CloneRepositoryPopup.vue"

const repoStore = useRepoStateStore()

const isCloneRepositoryPopupVisible = ref(false)

onMounted(() => {
    window.api.onSelectedDirectory((path) => {
        repoStore.readRepoContents(path)
    })
})
</script>
