<template>
    <div
        v-if="repoStore.isLoading"
        class="absolute left-0 top-0 w-full h-full bg-black flex items-center justify-center"
    >
        <div class="flex flex-col items-center text-xl">
            <div class="text-5xl font-bold text-center">
                Project loading
                <div class="inline-block loader"></div>
            </div>

            <progress
                :value="repoStore.getCurrentProgress"
                max="1"
                class="block h-2 mt-10 w-200 rounded-full overflow-hidden
                [&::-webkit-progress-bar]:bg-neutral-800
                [&::-webkit-progress-value]:bg-white"
            />

            <div class="mt-14">
                <div class="flex">
                    <div class="w-60 font-bold">Currently analysing:</div>
                    <div class="w-60 whitespace-nowrap">{{ repoStore.getCurrentFileName }}</div>
                </div>

                <div class="flex mt-6">
                    <div class="w-60 font-bold">Files analysed:</div>
                    <div class="w-60">{{ repoStore.getFilesAnalysedDisplay }}</div>
                </div>

                <div class="flex">
                    <div class="w-60 font-bold">Chunks analysed:</div>
                    <div class="w-60">{{ repoStore.getChunksAnalysedDisplay }}</div>
                </div>
            </div>
        </div>
    </div>

    <div v-else>
        <ButtonsSidebar @toggle-panel="togglePanel" :activePanel />

        <Panel
            v-if="activePanel === 'fileExplorer'"
            :icon="Folder"
            title="File Explorer"
            @close-panel="closeActivePanel"
        >
            <FileExplorer />
        </Panel>

        <Panel
            v-if="activePanel === 'chatbot'"
            :icon="BotMessageSquare"
            title="Chatbot"
            @close-panel="closeActivePanel"
            width="w-240"
        >
            <template v-slot:panelHeader>
                <button
                    @click="repoStore.clearHistory()"
                    class="cursor-pointer h-11 px-3 flex items-center justify-center hover:bg-neutral-700 rounded-sm active:bg-neutral-600 gap-x-2"
                >
                    <Trash :size="18" /> Clear Chat
                </button>
            </template>

            <Chatbot />
        </Panel>

        <Panel
            v-if="activePanel === 'issues'"
            :icon="CircleDot"
            title="Issues"
            @close-panel="closeActivePanel"
            width="w-240"
        >
            <template v-slot:panelHeader>
                <button
                    @click="repoStore.fetchIssues"
                    class="cursor-pointer h-11 px-3 flex items-center justify-center hover:bg-neutral-700 rounded-sm active:bg-neutral-600 gap-x-2"
                >
                    <RefreshCw :size="18" /> Fetch Issues
                </button>
            </template>

            <Issues/>
        </Panel>

        <Panel
            v-if="activePanel === 'help'"
            :icon="CircleQuestionMark"
            title="Help"
            @close-panel="closeActivePanel"
            width="w-240"
        >
            Not implemented yet
        </Panel>

        <Panel
            v-if="activePanel === 'settings'"
            :icon="Settings"
            title="Settings"
            @close-panel="closeActivePanel"
            width="w-240"
        >
            Not implemented yet
        </Panel>

        <Canvas />
    </div>
</template>

<script setup>
    import { ref } from "vue"
    import ButtonsSidebar from "../components/ButtonsSidebar.vue"
    import Panel from "../components/Panel.vue"
    import FileExplorer from "../components/FileExplorer.vue"
    import Chatbot from "../components/Chatbot.vue"
    import Issues from "../components/Issues.vue"
    import Canvas from "../components/canvas/Canvas.vue"
    import { useRepoStateStore } from "../stores/repoState.js"
    import { Folder, BotMessageSquare, CircleDot, Trash, RefreshCw,
             CircleQuestionMark, Settings} from "lucide-vue-next"

    const repoStore = useRepoStateStore()

    const activePanel = ref(null)

    const togglePanel = (panelName) => {
        if (activePanel.value === panelName) {
            activePanel.value = null
        } else {
            activePanel.value = panelName
        }
    }

    const closeActivePanel = () => { activePanel.value = null }
</script>
