<template>
    <div class="flex h-screen flex-col items-center">
        <div class="flex h-full flex-col items-center justify-center">
            <div>
                <h1 class="text-center text-6xl font-bold text-white">
                    {{ $appName }}
                </h1>

                <div class="mt-2 text-2xl text-white">
                    An Open-source Assistance System
                </div>

                <div class="mt-20 flex w-full max-w-[1000px] gap-x-12">
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
        </div>

        <a
            target="_blank"
            href="https://github.com/gelkoh/oss-tutor"
            title="Link to the GitHub repository of this project"
            class="mt-auto mb-4 flex cursor-pointer items-center gap-x-2 rounded-md bg-neutral-800 px-4 py-2 hover:bg-neutral-700"
        >
            <Github :size="18" class="inline-block" /> Source Code
        </a>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import RecentlyUsedRepositories from '../components/RecentlyUsedRepositories.vue'
import GetStarted from '../components/GetStarted.vue'
import CloneRepositoryPopup from '../components/CloneRepositoryPopup.vue'
import { useRepoStateStore } from '../stores/repoState.js'
import { Github } from 'lucide-vue-next'

const repoStore = useRepoStateStore()

const isLoading = ref(false)

const isCloneRepositoryPopupVisible = ref(false)

onMounted(() => {
    if (typeof window.api === 'undefined') {
        console.error('window.api is not available')
        return
    }

    window.api.onDirectorySelectionCanceled(() => {
        isLoading.value = false
    })

    window.api.onSelectedDirectory((path) => {
        isLoading.value = true
        repoStore.readRepoContents(path)
    })
})
</script>
