<script setup>
import { ref, watch, nextTick } from "vue"
import { VueFlow, useVueFlow } from "@vue-flow/core"
import { Background } from "@vue-flow/background"
import { Controls } from "@vue-flow/controls"

import { storeToRefs } from "pinia"
import { useRepoStateStore } from "../../stores/repoState.js"
import { useLayout } from "../../composables/useLayout"

// Initialize store
const repoStore = useRepoStateStore()

// Get nodes and edges as reactive refs
const { graphNodes, graphEdges } = storeToRefs(repoStore)

// Import vue flow styles
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import '@vue-flow/minimap/dist/style.css'

// Layouting
const { layoutGraph } = useLayout()
const { fitView, onNodesChange, getNodes } = useVueFlow()

const hasLayouted = ref(false)

// Warte auf Node-Änderungen (wenn Vue Flow die Dimensionen gemessen hat)
onNodesChange((changes) => {
    // Prüfe ob es Dimensions-Updates sind
    const hasDimensionUpdates = changes.some(
        change => change.type === 'dimensions' && change.dimensions
    )
    
    if (hasDimensionUpdates && !hasLayouted.value) {
        // Warte bis alle Nodes ihre Dimensionen haben
        nextTick(() => {
            const nodes = getNodes.value
            const allHaveDimensions = nodes.every(n => 
                n.dimensions && n.dimensions.width > 0 && n.dimensions.height > 0
            )
            
            if (allHaveDimensions) {
                console.log('Alle Nodes haben Dimensionen, starte Layout...')
                performLayout()
                hasLayouted.value = true
            }
        })
    }
})

const performLayout = () => {
    try {
        const nodes = getNodes.value
        
        // Zuerst: Positioniere Kinder-Nodes innerhalb ihrer Parents
        const nodesWithPositionedChildren = positionChildrenInParents(nodes)
        
        // Dann: Layout für Root-Nodes (Directories)
        const layouted = layoutGraph(
            nodesWithPositionedChildren,
            graphEdges.value,
            'LR'
        )

        graphNodes.value = layouted
        
        // Fit view nach Layout
        nextTick(() => {
            fitView({ padding: 0.2, duration: 800 })
        })
    } catch (error) {
        console.error('Layout-Fehler:', error)
    }
}

// Positioniere Child-Nodes vertikal innerhalb ihrer Parents
const positionChildrenInParents = (nodes) => {
    const childrenByParent = {}
    
    // 1. Gruppieren
    nodes.forEach(node => {
        if (node.parentNode) {
            if (!childrenByParent[node.parentNode]) {
                childrenByParent[node.parentNode] = []
            }
            childrenByParent[node.parentNode].push(node)
        }
    })
    
    // Map für schnellen Zugriff auf Node-Updates
    const nodeUpdates = new Map()

    // 2. Layout pro Parent berechnen
    Object.keys(childrenByParent).forEach(parentId => {
        const siblings = childrenByParent[parentId]
        
        // Konfiguration für das Grid
        const COLUMNS = 3          // Anzahl der Spalten nebeneinander
        const COLUMN_WIDTH = 500   // Breite einer FileNode + Abstand (450px Node + 50px Gap)
        const PADDING_X = 40       // Abstand links im Ordner
        const PADDING_Y = 60       // Abstand oben (unter Header)
        const VERTICAL_GAP = 40    // Abstand zwischen Files untereinander

        // Wir merken uns die aktuelle Y-Höhe pro Spalte
        // [0, 0, 0] bei 3 Spalten
        const columnHeights = new Array(COLUMNS).fill(PADDING_Y)

        siblings.forEach((child, index) => {
            // Wähle die Spalte, die aktuell am "kürzesten" ist (Masonry Effekt)
            // Oder einfacher: Einfach der Reihe nach (Grid Effekt)
            // Wir nehmen hier "Der Reihe nach" für vorhersehbare Sortierung:
            const colIndex = index % COLUMNS 

            // Berechne X
            const x = PADDING_X + (colIndex * COLUMN_WIDTH)

            // Berechne Y (basierend auf der aktuellen Höhe dieser Spalte)
            const y = columnHeights[colIndex]

            // Update die Höhe dieser Spalte für das nächste Element
            // Wir nutzen die gemessene Höhe oder Fallback
            const childHeight = child.dimensions?.height || 200
            columnHeights[colIndex] += childHeight + VERTICAL_GAP

            // Speichern
            nodeUpdates.set(child.id, { x, y })
        })
    })
    
    // 3. Updates anwenden
    return nodes.map(node => {
        if (nodeUpdates.has(node.id)) {
            const newPos = nodeUpdates.get(node.id)
            return {
                ...node,
                position: newPos
            }
        }
        return node
    })
}

// Import custom nodes
import DirectoryNode from './DirectoryNode.vue'
import FileNode from './FileNode.vue'
</script>

<template>
    <div class="h-screen w-[calc(100vw-(var(--spacing))*16)] left-16 absolute top-0">
        <VueFlow
            v-model:nodes="graphNodes"
            v-model:edges="graphEdges"
            :default-viewport="{ zoom: 0.8 }"
            :min-zoom="0.2"
            :max-zoom="2"
            fit-view-on-init
            class="basicflow"
        >
            <template #node-directory="props">
                <DirectoryNode v-bind="props" />
            </template>

            <template #node-file="props">
                <FileNode v-bind="props" />
            </template>

            <Background pattern-color="#aaa" gap="16" />
            <Controls />
        </VueFlow>
    </div>
</template>
