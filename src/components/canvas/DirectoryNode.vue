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

        <!-- Dieser Bereich wächst automatisch mit den Children -->
        <div class="directory-content"></div>
    </div>
</template>

<style scoped>
.directory-node {
    background: rgba(30, 41, 59, 0.25);
    border: 2px dashed #475569;
    border-radius: 8px;
    box-sizing: border-box;
    position: relative;
    /* Minimale Größe damit der Node sichtbar ist */
    min-width: 500px;
    min-height: 150px;
    padding-bottom: 20px;

    /* TEST */
    height: 100%;
}

.directory-header {
    padding: 8px 12px;
    background: rgba(51, 65, 85, 0.8);
    border-top-left-radius: 6px;
    border-top-right-radius: 6px;
    color: #e2e8f0;
    font-family: 'Fira Code', monospace;
    font-size: 13px;
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 10px;
}

.folder-icon {
    font-size: 16px;
}

.folder-name {
    font-weight: 500;
}

.directory-content {
    /* Dieser Bereich füllt den Rest und wächst mit Children */
    /*min-height: 80px;*/
}
</style>
