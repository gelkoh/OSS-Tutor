<script setup>
import { ref, computed } from "vue"
import { Handle, Position, useVueFlow } from "@vue-flow/core"
import { useFileIcons } from "../../composables/useFileIcons.js"
import { ChevronDown, ChevronRight, BotMessageSquare } from "lucide-vue-next"

const props = defineProps(["id", "data", "label"])

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
    if (props.data.chunks && props.data.chunks.length > 0) {
        return props.data.chunks.join("")
    }

    return "// No code content available"
})

const LINE_HEIGHT = 20
const PADDING_TOP = 12
const EXTRA_OFFSET = 3

const aiSummary = computed(() => {
    if (props.data.summary) {
        return props.data.summary
    }

    return null
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
        class="rounded-md w-180"
        :class="[
            showCode === true ? 'expanded' : 'collapsed',
            data.isHighlighted ? ['border-5', 'border-yellow-400'] : ['border', 'border-slate-400']
        ]"
    >
        <div
            class="px-2 py-2 bg-neutral-700 cursor-pointer flex gap-x-2 items-center"
            @click="toggleCode"
        >
            <template v-if="showCode"><ChevronDown :size="18" /></template>
            <template v-else><ChevronRight :size="18" /></template>
            <span class="file-icon"><i :class="[iconClassName]" /></span>
            <span class="file-name">{{ label }}</span>
        </div>

        <div v-if="showCode" class="file-body nodrag">
            <p class="p-2 bg-neutral-800 text-neutral-300">
                <span class="font-semibold">AI summary: </span>
                {{ aiSummary }}
            </p>

            <div class="relative ">
                <ul class="w-10 py-[1em] absolute top-px left-0 pl-2 pr-2 text-right text-neutral-200 bg-neutral-900">
                    <li v-for="i in props.data.lineCount - 1" :key="i">{{ i }}</li>
                </ul>

                <highlightjs
                    language="javascript"
                    :code="codeContent"
                    class="bg-neutral-900"
                />

                <div class="handle-overlay">
                    <template v-for="func in props.data.functions" :key="'def-' + func.name">
                        <div
                            v-if="isConnected(func.name + '-in')"
                            class="function-handle-wrapper"
                            :style="{ top: (func.line * LINE_HEIGHT) + PADDING_TOP + EXTRA_OFFSET + 'px' }"
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
    </div>
</template>

<style scoped>
.file-icon {
    font-size: 14px;
}

.file-name {
    font-family: "monospace";
}

.chevron {
    font-size: 10px;
    color: #94a3b8;
}

.file-body {
    position: relative;
    font-family: monospace;
    font-size: 14px;
    line-height: 20px;
    /*overflow: hidden;*/
}

.file-body pre {
    margin: 0;
}

.file-body code {
    padding: 12px !important;
}
.handle-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
}

.function-handle-wrapper {
    position: absolute;
    left: 0;
    width: 100%;
    height: 20px;
}

.code-handle {
    pointer-events: auto;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    border: 2px solid lightblue;
    background: blue;
    transition: all 0.2s;
}
</style>
