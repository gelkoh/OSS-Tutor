<template>
    <div class="p-8 bg-neutral-800 rounded-lg">
        <div class="text-2xl font-bold">Get Started</div>

        <div class="flex flex-col gap-3">
            <button
                @click="openRepo"
                :disabled="repoStore.isLoading"
                class="flex items-center gap-x-2 cursor-pointer mt-5 bg-neutral-700 hover:bg-neutral-600
                       px-4 py-2 rounded-sm"
            >
                <FolderOpen :size="18" class="text-purple-400 inline-block" /> Open A Local Repository
            </button>

            <button
                @click="$emit('show-clone-repository-popup')"
                class="flex items-center gap-x-2 cursor-pointer bg-neutral-700 hover:bg-neutral-600 px-4
                py-2 rounded-sm"
            >
                <FolderGit2 :size="18" class="text-orange-500 inline-block" /> Clone A Repository
            </button>
        </div>
    </div>
</template>

<script setup>
    import { FolderOpen, FolderGit2 } from "lucide-vue-next"
    import { useRepoStateStore } from "../stores/repoState.js"

    const repoStore = useRepoStateStore()

    const openRepo = () => {
        window.api.openDirectoryDialog()
    }
</script>
