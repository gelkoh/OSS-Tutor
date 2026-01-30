<template>
    <div class="p-8 bg-neutral-800 rounded-lg">
        <div class="text-2xl font-bold">Recently used repositories</div>

        <div
            v-if="paths.length === 0"
            class="mt-4"
        >
            You have not opened any repositories yet
        </div>

        <ul
            v-else
            class="mt-6 flex flex-col gap-4"
        >
            <li
                v-for="path in paths"
                :key="path"
                class="p-3 w-full bg-neutral-700 rounded-md hover:bg-neutral-600"
            >
                <div class="flex gap-x-1 justify-between items-center">
                    <button
                        @click="repoStore.readRepoContents(path)"
                        class="text-large font-bold cursor-pointer hover:underline"
                    >
                        {{ path.split("/").at(-1) }}
                    </button>

                    <button
                        @click="removeRepository(path)"
                        class="w-8 h-8 hover:bg-neutral-500 flex items-center
                               justify-center rounded-full cursor-pointer"
                    >
                        <X :size="18" />
                    </button>
                </div>

                <div class="text-neutral-400">{{ path }}</div>
            </li>
        </ul>
    </div>
</template>

<script setup>
    import { ref, onMounted } from "vue"
    import { X } from "lucide-vue-next"
    import { useRepoStateStore } from "../stores/repoState.js"

    const repoStore = useRepoStateStore()

    const paths = ref([])

    const getRecentlyUsedRepositories = async () => {
        try {
            const recentlyUsedRepositories = await window.api.getRecentlyUsedRepositories()
            return recentlyUsedRepositories
        } catch(err) {
            console.log(`Error getting recently used repositories ${err}`)
        }
    }

    const removeRepository = async (path) => {
        await window.api.removeRecentlyUsedRepository(path)

        getRecentlyUsedRepositories().then((recentlyUsedRepositoriesPaths) => {
            paths.value = recentlyUsedRepositoriesPaths
        })
    }

    onMounted(async () => {
        getRecentlyUsedRepositories().then((recentlyUsedRepositoriesPaths) => {
            paths.value = recentlyUsedRepositoriesPaths
        })
    })
</script>
