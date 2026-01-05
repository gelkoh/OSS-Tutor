<template>
    <div
        class="flex w-16 flex-col gap-2 absolute top-0 h-screen left-0
               bg-neutral-800 items-center py-2"
    >
        <Tooltip placement="right" text="Home" :offset="17">
            <button
                @click="repoStore.isRepoOpen = false"
                class="transition cursor-pointer flex items-center
                       justify-center w-11 h-11 bg-neutral-800 rounded-md
                       hover:bg-neutral-700"
            >
                <Home />
            </button>
        </Tooltip>

        <Tooltip placement="right" text="File Explorer" :offset="17">
            <button
                @click="$emit('toggle-panel', 'fileExplorer')"
                :class="{ 'bg-white! text-black': activePanel === 'fileExplorer' }"
                class="transition w-11 h-11 cursor-pointer flex justify-center
                       items-center bg-neutral-800 rounded-md
                       hover:bg-neutral-700"
            >
                <Folder />
            </button>
        </Tooltip>

        <Tooltip placement="right" text="Chatbot" :offset="17">
            <button
                @click="$emit('toggle-panel', 'chatbot')"
                :class="{ 'bg-white! text-black': activePanel === 'chatbot' }"
                class="transition w-11 h-11 cursor-pointer flex justify-center
                       items-center bg-neutral-800 hover:bg-neutral-700
                       rounded-md"
            >
                <BotMessageSquare />
            </button>
        </Tooltip>

        <Tooltip placement="right" text="Issues" :offset="17">
            <button
                @click="$emit('toggle-panel', 'issues')"
                :class="{ 'bg-white! text-black': activePanel === 'issues' }"
                class="transition w-11 h-11 cursor-pointer flex justify-center
                       items-center bg-neutral-800 rounded-md
                       hover:bg-neutral-700"
            >
                <CircleDot />
            </button>
        </Tooltip>

        <div class="mt-auto flex flex-col gap-2">
            <Tooltip placement="right" text="Help" :offset="17">
                <button
                    @click="$emit('toggle-panel', 'help')"
                    :class="{ 'bg-white! text-black': activePanel === 'help' }"
                    class="transition w-11 h-11 cursor-pointer flex
                           justify-center items-center bg-neutral-800 rounded-md
                           hover:bg-neutral-700"
                >
                    <CircleQuestionMark />
                </button>
            </Tooltip>

            <Tooltip placement="right" text="Settings" :offset="17">
                <button
                    @click="$emit('toggle-panel', 'settings')"
                    :class="{ 'bg-white! text-black': activePanel === 'settings' }"
                    class="transition w-11 h-11 cursor-pointer flex
                           justify-center items-center bg-neutral-800 rounded-md
                           hover:bg-neutral-700"
                >
                    <Settings />
                </button>
            </Tooltip>
        </div>
    </div>
</template>

<script setup>
    import Tooltip from "../components/Tooltip.vue"
    import { useRepoStateStore } from "../stores/repoState.js"
    import { Home, Folder, BotMessageSquare, CircleDot, CircleQuestionMark,
             Settings } from "lucide-vue-next"

    const props = defineProps({
        activePanel: String
    })

    const repoStore = useRepoStateStore()
</script>
