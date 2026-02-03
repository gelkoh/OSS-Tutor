<script setup>
import { Folder } from "lucide-vue-next"
const props = defineProps(['id', 'data', 'label'])
</script>

<template>
    <div class="directory-node">
        <div class="directory-header">
            <span class="folder-icon">
                <Folder :size="18" />
            </span>
            <span class="folder-name">{{ label }}</span>
        </div>

        <!-- This grows with children -->
        <div class="directory-content"></div>
    </div>
</template>

<style scoped>
.directory-node {
    background: transparent;
    border: 2px solid #475569;
    box-shadow: inset 0 0 20px rgba(0, 0, 0, 0.2);
    border-radius: 12px;
    width: 100%;
    height: 100%;
    position: relative;
    pointer-events: none;
}

.directory-header {
    background: #1e293b;
    pointer-events: all; 
    height: 50px;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 16px;
    border-bottom: 2px solid #475569;
    border-radius: 10px 10px 0 0;
}

.folder-icon {
    color: #60a5fa;
}

.folder-name {
    color: #e2e8f0;
    font-weight: 600;
    font-size: 14px;
}

.directory-content {
    min-height: 200px;
    padding: 20px;
}
</style>
