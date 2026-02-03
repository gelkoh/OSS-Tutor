<script setup>
import { ref, computed, onMounted } from "vue"
import { Handle, Position, useVueFlow } from "@vue-flow/core"
import { useFileIcons } from "../../composables/useFileIcons.js"
import { ChevronDown, ChevronRight, BotMessageSquare, SquarePen } from "lucide-vue-next"

const props = defineProps(["id", "data", "label", "filePath"])

const { edges } = useVueFlow()

const { getIconClass } = useFileIcons()

const showCode = ref(true)

const fileExtension = props.data.label.split(".").at(-1)
let iconClassName = getIconClass(fileExtension, true)

if (iconClassName === null) {
    iconClassName = "devicon-devicon-plain"
}

const toggleCode = () => {
    showCode.value = !showCode.value
}

const codeContent = computed(() => {
    if (props.data.fullContent) {
        return props.data.fullContent;
    }

    if (props.data.chunks && props.data.chunks.length > 0) {
        return props.data.chunks.join("\n");
    }

    return "// No code content available";
});

const displayLineCount = computed(() => {
    if (props.data.fullContent) {
        return props.data.fullContent.split('\n').length;
    }

    return props.data.lineCount || 0;
});

const openFileInEditor = () => {
    const filePathToOpen = props.data.filePath || props.id
    window.api.openPath(filePathToOpen)
}

const LINE_HEIGHT = 24
const PADDING_TOP = 12
const EXTRA_OFFSET = 10

const aiSummary = computed(() => {
    if (props.data.summary) {
        return props.data.summary
    }

    return "Click to expand and view code"
})

const connectedHandleIds = computed(() => {
    const connected = new Set()
    if (!edges.value) return connected

    edges.value.forEach(edge => {
        if (edge.sourceHandle) connected.add(edge.sourceHandle)
        if (edge.targetHandle) connected.add(edge.targetHandle)
    })

    return connected
})

const isConnected = (handleId) => {
    return connectedHandleIds.value.has(handleId)
}
</script>

<template>
    <div
        class="file-node-container rounded-md w-240"
        :class="[
            showCode === true ? 'expanded' : 'collapsed',
            data.isHighlighted ? ['border-5', 'border-yellow-400'] : ['border', 'border-slate-400']
        ]"
    >
        <div
            class="file-header px-2 py-2 bg-neutral-700 cursor-pointer flex gap-x-2 items-center justify-between"
            @click="toggleCode"
        >
            <div class="flex items-center">
                <template v-if="showCode"><ChevronDown :size="18" /></template>
                <template v-else><ChevronRight :size="18" /></template>
                <span class="file-icon ml-2 mt-1"><i :class="[iconClassName]" /></span>
                <span class="file-name ml-2">{{ label }}</span>
            </div>

            <div
                class="w-[24px] h-[24px] flex items-center justify-center hover:bg-neutral-500 rounded-sm"
                @click.stop="openFileInEditor()"
            >
                <SquarePen :size="16" />
            </div>
        </div>

        <div v-if="showCode" class="file-body nodrag">
            <p class="p-2 bg-neutral-800 text-neutral-300">
                <span class="font-semibold">AI summary: </span>
                {{ aiSummary }}
            </p>

            <div class="relative">
                <ul class="line-numbers w-10 py-[1em] absolute top-px left-0 pl-2 pr-2 text-right text-neutral-200 bg-neutral-900">
                    <li v-for="i in props.data.lineCount - 1" :key="i">{{ i }}</li>
                </ul>

                <highlightjs
                    language="javascript"
                    :code="codeContent"
                    class="bg-neutral-900 code-display"
                />

                <div class="handle-overlay">
                    <template v-for="func in props.data.functions" :key="'def-' + func.name">
                        <div
                            v-if="isConnected(func.name + '-in')"
                            class="function-handle-wrapper"
                            :style="{ top: ((func.line) * LINE_HEIGHT) + PADDING_TOP + (LINE_HEIGHT / 2) + 'px' }"
                        >
                            <Handle
                                type="target"
                                :id="func.name + '-in'"
                                :position="Position.Left"
                                class="code-handle handle-input"
                            />
                        </div>
                    </template>

                    <template v-for="call in props.data.calls" :key="'call-' + call.name + call.line">
                        <div
                            v-if="isConnected('call-' + call.name + '-line-' + call.line)"
                            class="function-handle-wrapper"
                            :style="{ top: (call.line * LINE_HEIGHT) + PADDING_TOP + EXTRA_OFFSET + 'px' }"
                        >
                            <Handle 
                                type="source" 
                                :id="'call-' + call.name + '-line-' + call.line" 
                                :position="Position.Right" 
                                class="code-handle handle-output"
                            />
                        </div>
                    </template>
                </div>
            </div>
        </div>

        <!-- Collapsed View -->
        <div v-else class="file-summary p-2 bg-neutral-800 text-neutral-300">
            <span class="font-semibold">AI summary: </span>
            {{ aiSummary }}
        </div>
    </div>
</template>

<style scoped>
.file-node-container {
    background: #1e293b;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
}

.file-node-container.collapsed {
    min-height: 120px;
}

.file-node-container.expanded {
    min-height: 200px;
}

.file-header {
    border-bottom: 1px solid #475569;
}

.file-icon {
    font-size: 18px;
}


.file-summary {
    line-height: 1.5;
    overflow: hidden;
    text-overflow: ellipsis;
}

.code-display, .line-numbers {
    font-family: 'Fira Code', 'JetBrains Mono', monospace;
    font-size: 14px;
    line-height: 24px !important;
}

.line-numbers {
    padding-top: 12px;
    padding-bottom: 12px;
}

:deep(pre code.hljs) {
    white-space: pre !important;
    padding-top: 12px !important; 
    padding-bottom: 12px !important;
    padding-left: 50px !important;
    line-height: 24px !important;
}

.code-handle {
    transform: translateY(-50%);
    margin-top: 0;
}

.handle-overlay {
    pointer-events: none;
}

.code-handle {
    pointer-events: all;
}

.function-handle-wrapper {
    position: absolute;
    left: 0;
    right: 0;
}

.handle-input {
    background: #34d399;
}

.handle-output {
    background: #60a5fa;
}

pre code.hljs {
    padding-left: 0.2em !important;
}
</style>
