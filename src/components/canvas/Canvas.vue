<!--<script setup>
import { ref, watch, nextTick } from "vue"
import { VueFlow, useVueFlow } from "@vue-flow/core"
import { MiniMap } from "@vue-flow/minimap"
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
import '@vue-flow/controls/dist/style.css'

// Layouting
const { layoutGraph } = useLayout()
const { fitView, onNodesChange, getNodes } = useVueFlow()

const hasLayouted = ref(false)


const { focusedNodeSignal } = storeToRefs(repoStore)

// Wir beobachten das Signal aus dem Store
watch(focusedNodeSignal, (signal) => {
    if (!signal || !signal.id) return

    // Prüfen, ob der Node existiert (um Fehler zu vermeiden)
    const nodeExists = getNodes.value.find(n => n.id === signal.id)

    const testNodes = getNodes.value
    for (let i = 0; i < testNodes.length; i++) {
        console.log("TEST NODE: " + testNodes[i].id)
    }

    if (nodeExists) {
        // Vue Flow API: Zoom auf diesen Node
        fitView({
            nodes: [signal.id],
            padding: 0.2,
            duration: 1000,
            minZoom: 0.5,
            maxZoom: 1.5
        })

        // Optional: Node kurz highlighten (z.B. Klasse hinzufügen)
        // Das müsste man über node.selected = true oder custom classes lösen
    } else {
        console.warn(`Node ${signal.id} nicht im Canvas gefunden!`)
    }
})

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

            <Background pattern-color="#aaa" gap="30" />

            <Controls />

            <MiniMap
                pannable
                zoomable
                maskColor="var(--color-neutral-800)"
                nodeColor="var(--color-blue-600)"
                nodeClassName="var(--color-red-500)"
            />
        </VueFlow>
    </div>
</template>-->











<script setup>
import { ref, watch, nextTick } from "vue"
import { VueFlow, useVueFlow } from "@vue-flow/core"
import { MiniMap } from "@vue-flow/minimap"
import { Background } from "@vue-flow/background"
import { Controls } from "@vue-flow/controls"
import { storeToRefs } from "pinia"
import { useRepoStateStore } from "../../stores/repoState.js"
import { useLayout } from "../../composables/useLayout"

// Imports styles...
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import '@vue-flow/minimap/dist/style.css'
import '@vue-flow/controls/dist/style.css'

// Custom Nodes
import DirectoryNode from './DirectoryNode.vue'
import FileNode from './FileNode.vue'

const repoStore = useRepoStateStore()
const { graphNodes, graphEdges } = storeToRefs(repoStore)
const { layoutGraph } = useLayout()

// WICHTIG: findNode hinzugefügt
const { fitView, onNodesChange, getNodes, onNodeDrag, findNode } = useVueFlow()

const hasLayouted = ref(false)
const { focusedNodeSignal } = storeToRefs(repoStore)

// --- KONFIGURATION FÜR PADDING ---
const DIR_PADDING_TOP = 40    // Mehr Platz oben für den Header
const DIR_PADDING_BOTTOM = 40 
const DIR_PADDING_RIGHT = 40
const DIR_PADDING_LEFT = 40   // Linker Rand (Kind darf nicht weiter links als x=40)
const DIR_MIN_WIDTH = 500
const DIR_MIN_HEIGHT = 150

// ---------------------------------------------------------
// DYNAMIC RESIZING LOGIC (SHRINK & GROW)
// ---------------------------------------------------------
const updateParentDimensions = (parentId) => {
    const parentNode = findNode(parentId)
    if (!parentNode) return

    // 1. Alle Kinder dieses Parents finden
    const children = getNodes.value.filter(n => n.parentNode === parentId && !n.hidden)
    
    if (children.length === 0) return

    // 2. Bounding Box berechnen (Wie weit reichen die Kinder nach rechts/unten?)
    let maxRight = 0
    let maxBottom = 0

    children.forEach(child => {
        // Fallback falls Dimensionen noch nicht da sind (z.B. beim ersten Render)
        const childWidth = child.dimensions?.width || 450 
        const childHeight = child.dimensions?.height || 200
        
        const childRightEdge = child.position.x + childWidth
        const childBottomEdge = child.position.y + childHeight

        if (childRightEdge > maxRight) maxRight = childRightEdge
        if (childBottomEdge > maxBottom) maxBottom = childBottomEdge
    })

    // 3. Neue Dimensionen berechnen (Content + Padding)
    // Wir nehmen das Maximum aus (Inhalt + Padding) ODER (Minimale Größe)
    const newWidth = Math.max(DIR_MIN_WIDTH, maxRight + DIR_PADDING_RIGHT)
    const newHeight = Math.max(DIR_MIN_HEIGHT, maxBottom + DIR_PADDING_BOTTOM)

    // 4. Style update erzwingen
    // Vue Flow speichert die Größe oft im style-Objekt
    parentNode.style = {
        ...parentNode.style,
        width: `${newWidth}px`,
        height: `${newHeight}px`
    }
}

// Event Listener: Feuert JEDES MAL wenn man einen Node bewegt
onNodeDrag(({ node }) => {
    if (node.parentNode) {
        
        // 1. CLAMPING LOGIC (Padding Links & Oben erzwingen)
        // Wir verhindern, dass der Node in den Header oder an den linken Rand gezogen wird.
        // Da wir das Node-Objekt direkt mutieren, updatet Vue Flow die Position live.
        
        let positionChanged = false

        if (node.position.x < DIR_PADDING_LEFT) {
            node.position.x = DIR_PADDING_LEFT
            positionChanged = true
        }

        if (node.position.y < DIR_PADDING_TOP) {
            node.position.y = DIR_PADDING_TOP
            positionChanged = true
        }

        // 2. Parent Größe anpassen (für Rechts & Unten)
        updateParentDimensions(node.parentNode)
    }
})

// ---------------------------------------------------------
// EXISTING LOGIC
// ---------------------------------------------------------

watch(focusedNodeSignal, (signal) => {
    if (!signal || !signal.id) return
    const nodeExists = getNodes.value.find(n => n.id === signal.id)
    if (nodeExists) {
        fitView({
            nodes: [signal.id],
            padding: 0.2,
            duration: 1000,
            minZoom: 0.5,
            maxZoom: 1.5
        })
    }
})

onNodesChange((changes) => {
    const hasDimensionUpdates = changes.some(change => change.type === 'dimensions' && change.dimensions)
    
    if (hasDimensionUpdates && !hasLayouted.value) {
        nextTick(() => {
            const nodes = getNodes.value
            const allHaveDimensions = nodes.every(n => n.dimensions && n.dimensions.width > 0 && n.dimensions.height > 0)
            
            if (allHaveDimensions) {
                performLayout()
                hasLayouted.value = true
            }
        })
    }
})

const performLayout = () => {
    try {
        const nodes = getNodes.value
        // WICHTIG: Auch beim initialen Layout wollen wir, dass die Ordner passen!
        // Wir führen das Resizing also auch hier einmal durch.
        
        const nodesWithPositionedChildren = positionChildrenInParents(nodes)
        
        // Update Parent Dimensions based on initial grid layout
        const parents = nodes.filter(n => n.type === 'directory')
        parents.forEach(p => updateParentDimensions(p.id))

        const layouted = layoutGraph(
            nodesWithPositionedChildren,
            graphEdges.value,
            'LR'
        )
        graphNodes.value = layouted
        nextTick(() => { fitView({ padding: 0.2, duration: 800 }) })
    } catch (error) {
        console.error('Layout-Fehler:', error)
    }
}

// ... positionChildrenInParents bleibt gleich ...
// ... ABER: Stelle sicher, dass PADDING_Y in positionChildrenInParents >= DIR_PADDING_TOP ist!
// Sonst schiebt das Grid die erste Datei in den Header.

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
        const PADDING_Y = 80       // Abstand oben (unter Header)
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

            <Background pattern-color="#aaa" gap="30" />
            <Controls />

            <MiniMap
                pannable
                zoomable
                maskColor="var(--color-neutral-800)"
                nodeColor="var(--color-blue-600)"
                nodeClassName="var(--color-red-500)"
            />
        </VueFlow>
    </div>
</template>
