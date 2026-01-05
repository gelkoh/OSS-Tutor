<script setup>
import { ref, computed } from "vue"
import { Handle, Position } from "@vue-flow/core"
import { useFileIcons } from "../../composables/useFileIcons.js"
import { ChevronDown, ChevronRight, BotMessageSquare } from "lucide-vue-next"

const props = defineProps(["id", "data", "label"])

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

console.log("DATA: ", props.data)

const codeContent = computed(() => {
    if (props.data.chunks && props.data.chunks.length > 0) {
        return props.data.chunks.join("")
    }

    return "// No code content available"
})

const LINE_HEIGHT = 20
const PADDING_TOP = 12
</script>

<template>
    <div
        class="rounded-md border-px border-slate-400 w-120"
        :class="{ 'expanded': showCode }"
    >
        <div
            class="px-2 py-2 bg-neutral-700 cursor-pointer flex gap-x-2 items-center"
            @click="toggleCode"
        >
            <template v-if="showCode">
                <ChevronDown :size="18" />
            </template>

            <template v-else>
                <ChevronRight :size="18" />
            </template>

            <span class="file-icon">
                <i :class="[iconClassName]" />
            </span>

            <span class="file-name">{{ label }}</span>
        </div>

        <div v-if="showCode" class="file-body nodrag">
            <p class="p-2 bg-neutral-800">
                <BotMessageSquare class="p-1 w-6 h-6 bg-neutral-700 inline-block rounded-full" /> This is an AI summary of this file. I hope this works at it is. I still need the summary data instead of hard coded text though...
            </p>

            <div class="relative">
                <highlightjs
                    language="javascript"
                    :code="codeContent"
                    class="bg-neutral-900"
                />

                <div class="handle-overlay">
                    <div
                        v-for="func in props.data.functions" 
                        :key="'def-' + func.name"
                        class="function-handle-wrapper"
                        :style="{ top: (func.line * LINE_HEIGHT) + PADDING_TOP + 'px' }"
                    >
                        <Handle
                            type="target"
                            :id="func.name + '-in'"
                            :position="Position.Left"
                            class="code-handle handle-input"
                        />
                    </div>

                    <div
                        v-for="call in props.data.calls"
                        :key="'call-' + call.name + call.line"
                        class="function-handle-wrapper"
                        :style="{ top: (call.line * LINE_HEIGHT) + PADDING_TOP + 'px' }"
                        >
                        <Handle 
                        type="source" 
                        :id="'call-' + call.name + '-line-' + call.line" 
                        :position="Position.Right" 
                        class="code-handle handle-output"
                        />
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.file-icon {
    font-size: 14px;
}

.chevron {
    font-size: 10px;
    color: #94a3b8;
}

.file-body {
    position: relative;
    font-family: 'Fira Code', monospace;
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

code.hljs {
    padding: 12px !important;
    font-size: 14px;
    line-height: 20px !important;
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
    border: 2px solid #1e293b;
    transition: all 0.2s;
}




</style>
