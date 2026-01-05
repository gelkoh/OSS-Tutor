<template>
    <div
        :class="width"
        class="absolute top-4 left-20 w-140 max-h-[calc(100vh-(var(--spacing))*4*2)] pt-0 rounded-lg bg-neutral-800 flex flex-col overflow-hidden z-1"
    >
        <div class="sticky top-0 pl-6 pr-6 pt-3 pb-3 z-2 border-b border-neutral-700 bg-neutral-800 flex justify-between gap-x-6">
            <div class="pointer-events-none flex items-center gap-x-3 text-2xl font-bold">
                <component :is="icon" class="inline-block" />
                {{ title }}
            </div>

            <div class="flex gap-x-6">
                <slot name="panelHeader" />

                <button
                    @click="$emit('close-panel')"
                    class="w-11 h-11 flex justify-center items-center rounded-md cursor-pointer hover:bg-neutral-700"
                >
                    <X />
                </button>
            </div>
        </div>

        <div class="p-6 flex flex-col grow overflow-hidden">
            <slot></slot>
        </div>
    </div>
</template>

<script setup>
    import { X } from "lucide-vue-next"

    const props = defineProps({
        icon: {
            type: [Object, Function],
            required: true
        },
        title: {
            type: String,
            required: true
        },
        width: {
            type: String,
            required: false
        }
    })
</script>
