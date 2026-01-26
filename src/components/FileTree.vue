<template>
    <div
        group
        v-if="file.type === 'directory' && (searchQuery.length === 0 || file.fitsSearchQuery)"
        class="relative"
    >
        <!-- Horizontal line before directories -->
        <div
            v-if="file.depth > 0"
            :style="{ left: `${24 * (file.depth) - 16}px` }"
            class="absolute pointer-events-none top-[16px] w-3 h-px bg-neutral-600"
        ></div>

        <div @click="toggleOpen"
            :style="{ paddingLeft: `${24 * (file.depth)}px` }"
            class="flex items-center px-2 py-1 rounded-sm hover:bg-neutral-700 cursor-pointer"
        >
            <template v-if="!isOpen">
                <ChevronRight :size="18" class="inline-block" />
                <Folder :size="18" class="inline-block ml-1" />
            </template>

            <template v-else>
                <ChevronDown :size="18" class="inline-block" />
                <FolderOpen :size="18" class="inline-block ml-1" />
            </template>

            <div class="inline-block ml-2">{{ file.name }}</div>
        </div>

        <ul v-if="isOpen" class="relative">
            <!-- Vertical line underneath directories -->
            <div
                :style="{ left: `${24 * (file.depth) + 8}px` }"
                class="absolute pointer-events-none w-px h-[calc(100%-16px)] top-0 bg-neutral-600 z-1">
            </div>

            <li v-for="childFile in file.children" :key="childFile.path" class="relative">
                <FileTree
                    :searchQuery="searchQuery"
                    :file="childFile"
                    @file-selected="$emit('file-selected', $event)"
                />
            </li>
        </ul>
    </div>

    <div v-else class="relative" v-if="searchQuery.length === 0 || file.fitsSearchQuery">
        <!-- Horizontal line before files -->
        <div
            :style="{ left: `${24 * (file.depth) - 16}px` }"
            class="absolute pointer-events-none top-[16px] w-6 h-px bg-neutral-600"
        ></div>

            <!--@click="$emit('file-selected', file.path)"-->
        <div
            @click="handleFileClick"
            :style="{ paddingLeft: `${24 * (file.depth) + 20}px` }"
            class="group flex px-2 py-1 rounded-sm justify-between items-center hover:bg-neutral-700 cursor-pointer pr-1"
        >
            <div class="flex items-center">
                <i v-if="iconClass.length > 0" :class="iconClass" />
                <File v-else :size="20" class="inline-block" />

                <div v-if="!searchQuery" class="inline-block ml-2">{{ file.name }}</div>

                <div v-else class="inline-block ml-2">
                    {{ filenameParts.before }}<span class="bg-orange-500/75 font-bold">{{ filenameParts.at.toUpperCase() }}</span>{{ filenameParts.after }}
                </div>
            </div>

            <div
                class="w-[24px] h-[24px] flex items-center justify-center invisible group-hover:visible hover:bg-neutral-500 rounded-sm"
                @click="openFileInEditor(file.path)"
            >
                <SquarePen
                    :size="16"
                />
            </div>
        </div>
    </div>
</template>

<script setup>
    import { ref, onMounted, watch, computed } from "vue"
    import { Folder, FolderOpen, File, SquarePen, ChevronDown, ChevronRight } from 'lucide-vue-next'
    import { useFileIcons } from "../composables/useFileIcons.js"
    import { useRepoStateStore } from "../stores/repoState.js"

    const { getIconClass } = useFileIcons()
    const repoStore = useRepoStateStore()

    const props = defineProps({
        file: Object,
        isOpen: Boolean,
        searchQuery: String
    })

    const isDirectory = props.file.type === "directory" && props.file.path

    let initialOpenState = props.isOpen || false

    if (isDirectory && props.file.depth === 0) {
        initialOpenState = true
    }

    if (isDirectory && repoStore.fileExplorerState.hasOwnProperty(props.file.path)) {
        initialOpenState = repoStore.fileExplorerState[props.file.path]
    }

    const originalIsOpen = ref(initialOpenState)

    const isOpen = ref(initialOpenState)

    const emit = defineEmits(["file-selected"])

    const iconClass = ref("")

    const charsBeforeMatch = ref("")
    const charsAtMatch = ref("")
    const charsAfterMatch = ref("")

    onMounted(() => {
        if (props.isOpen) isOpen.value = true
    })

    if (props.file.type === "file") {
        const fileExtension = props.file.name.split(".").at(-1)

        let iconClassName = getIconClass(fileExtension, true)

        if (iconClassName !== null) {
            iconClass.value = iconClassName
        }
    }

    const toggleOpen = () => {
        isOpen.value = !isOpen.value
        originalIsOpen.value = isOpen.value

        repoStore.setDirectoryState(props.file.path, isOpen.value)
    }

    const openFileInEditor = (path) => {
        window.api.openPath(path)
        console.log(`Trying to open the file with path: ${path} in the default text editor`)
        console.log(typeof path)
    }

    const filenameParts = computed(() => {
        const newQuery = props.searchQuery || ""
        const name = props.file.name

        if (!newQuery.length) {
            return { before: name, at: "", after: "" }
        }

        const lowerName = name.toLowerCase()
        const lowerQuery = newQuery.toLowerCase()
        const index = lowerName.indexOf(lowerQuery)

        if (index === -1) {
            return { before: name, at: "", after: "" }
        }

        return {
            before: name.slice(0, index),
            at: name.slice(index, index + newQuery.length),
            after: name.slice(index + newQuery.length)
        }
    })

    watch(() => props.searchQuery, (newQuery) => {
        const queryActive = newQuery && newQuery.length > 0

        if (queryActive) {
            isOpen.value = true
        } else {
            isOpen.value = originalIsOpen.value
        }
    })

    const handleFileClick = () => {
        if (props.file.relativePath) {
            repoStore.focusNode(props.file.relativePath)
        }
    }
</script>
