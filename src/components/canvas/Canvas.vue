<script setup>
import { ref, watch, nextTick, computed } from "vue"
import { VueFlow, useVueFlow } from "@vue-flow/core"
import { MiniMap } from "@vue-flow/minimap"
import { Background } from "@vue-flow/background"
import { Controls } from "@vue-flow/controls"
import { storeToRefs } from "pinia"
import { useRepoStateStore } from "../../stores/repoState.js"
import { useLayout } from "../../composables/useLayout"

// Import styles
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import '@vue-flow/minimap/dist/style.css'
import '@vue-flow/controls/dist/style.css'

// Custom nodes
import DirectoryNode from './DirectoryNode.vue'
import FileNode from './FileNode.vue'

const repoStore = useRepoStateStore()
const { graphNodes, graphEdges } = storeToRefs(repoStore)
const { layoutGraph } = useLayout()

const { fitView, onNodesChange, getNodes, onNodeDrag, findNode, updateNode } = useVueFlow()

const hasLayouted = ref(false)
const { focusedNodeSignal } = storeToRefs(repoStore)

const DIR_PADDING_TOP = 70
const DIR_PADDING_BOTTOM = 60
const DIR_PADDING_RIGHT = 60
const DIR_PADDING_LEFT = 60
const DIR_MIN_WIDTH = 900
const DIR_MIN_HEIGHT = 400

const GRID_COLUMNS = 4
const GRID_COLUMN_GAP = 300
const GRID_ROW_GAP = 300
const FILE_NODE_WIDTH = 960

const selectedNodeId = ref(null)

const onNodeClick = ({ node }) => {
    selectedNodeId.value = node.id

    // Go over all edges and hide those that are not connected to the selected node
    graphEdges.value = graphEdges.value.map(edge => ({
        ...edge,
        hidden: edge.source !== node.id && edge.target !== node.id
    }))
}

const onPaneClick = () => {
    selectedNodeId.value = null
    graphEdges.value = graphEdges.value.map(edge => ({
        ...edge,
        hidden: false
    }))
}

const calculateRequiredParentSize = (parentId) => {
    const children = getNodes.value.filter(n => n.parentNode === parentId)

    if (children.length === 0) {
        return { width: DIR_MIN_WIDTH, height: DIR_MIN_HEIGHT }
    }

    let maxRight = 0
    let maxBottom = 0

    children.forEach(child => {
        // Use measured dimensions or fallbacks
        const childWidth = child.dimensions?.width || FILE_NODE_WIDTH
        const childHeight = child.dimensions?.height || 200

        const childRightEdge = child.position.x + childWidth
        const childBottomEdge = child.position.y + childHeight

        maxRight = Math.max(maxRight, childRightEdge)
        maxBottom = Math.max(maxBottom, childBottomEdge)
    })

    // Add padding
    return {
        width: Math.max(DIR_MIN_WIDTH, maxRight + DIR_PADDING_RIGHT), 
        height: Math.max(DIR_MIN_HEIGHT, maxBottom + DIR_PADDING_BOTTOM) 
    }
}

const updateParentDimensions = (parentId) => {
    const parentNode = findNode(parentId)
    if (!parentNode) return

    const { width, height } = calculateRequiredParentSize(parentId)

    updateNode(parentId, {
        style: {
            ...parentNode.style,
            width: `${width}px`,
            height: `${height}px`
        }
    })
}

// Drag clamping
onNodeDrag(({ node }) => {
    if (node.parentNode) {
        if (node.position.x < DIR_PADDING_LEFT) {
            node.position.x = DIR_PADDING_LEFT
        }

        if (node.position.y < DIR_PADDING_TOP) {
            node.position.y = DIR_PADDING_TOP
        }

        updateParentDimensions(node.parentNode)
    }
})

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

const dimensionUpdateCount = ref(0)

onNodesChange((changes) => {
    const hasDimensionUpdates = changes.some(change =>
        change.type === "dimensions" &&
        change.dimensions &&
        change.dimensions.width > 0 &&
        change.dimensions.height > 0
    )

    if (hasDimensionUpdates) {
        dimensionUpdateCount.value++

        // Wait until all nodes have their dimensions
        if (!hasLayouted.value) {
            nextTick(() => {
                const nodes = getNodes.value
                const fileNodes = nodes.filter(n => n.type === "file")
                const nodesWithDimensions = fileNodes.filter(n =>
                    n.dimensions && n.dimensions.width > 0 && n.dimensions.height > 0
                )

                if (nodesWithDimensions.length >= fileNodes.length * 0.9) {
                    performLayout()
                    hasLayouted.value = true
                }
            })
        }
    }
})

const performLayout = async () => {
    try {
        console.log("🎨 Starting Layout Phase 1: Positioning Children...")
        
        // Position children
        const nodesWithPositionedChildren = positionChildrenInParents(getNodes.value)
        graphNodes.value = nodesWithPositionedChildren

        // Wait for DOM update, so that vue flow knows the new positions
        await nextTick()

        const parents = graphNodes.value.filter(n => n.type === 'directory')

        parents.forEach(parent => {
            const { width, height } = calculateRequiredParentSize(parent.id)

            updateNode(parent.id, {
                style: { width: `${width}px`, height: `${height}px` }
            })
        })

        // Use dagre layout for the directories
        await nextTick()
        const finalLayoutedNodes = layoutGraph(
            getNodes.value,
            graphEdges.value,
            'LR'
        )

        graphNodes.value = finalLayoutedNodes

        // Adjust zoom
        setTimeout(() => {
            fitView({ padding: 0.2, duration: 800 })
        }, 150)

    } catch (error) {
        console.error("Layout-Error:", error)
    }
}

const positionChildrenInParents = (nodes) => {
    const newNodes = [...nodes];
    const childrenByParent = {};

    // Group by parent
    newNodes.forEach((node) => {
        if (node.parentNode) {
            if (!childrenByParent[node.parentNode]) childrenByParent[node.parentNode] = []
            childrenByParent[node.parentNode].push(node)
        }
    })

    Object.keys(childrenByParent).forEach((parentId) => {
        const siblings = childrenByParent[parentId]

        const columnYTracker = Array(GRID_COLUMNS).fill(DIR_PADDING_TOP)

        siblings.forEach((child, index) => {
            const colIndex = index % GRID_COLUMNS

            const x = DIR_PADDING_LEFT + (colIndex * (FILE_NODE_WIDTH + GRID_COLUMN_GAP))

            const y = columnYTracker[colIndex]

            child.position = { x, y }

            const childHeight = child.dimensions?.height || 300;

            columnYTracker[colIndex] += childHeight + GRID_ROW_GAP;
        })
    })

    return newNodes
}
</script>

<template>
    <div class="h-screen w-[calc(100vw-(var(--spacing))*16)] left-16 absolute top-0">
        <VueFlow
            v-model:nodes="graphNodes"
            v-model:edges="graphEdges"
            :default-viewport="{ zoom: 0.6 }"
            :min-zoom="0.1"
            :max-zoom="2"
            fit-view-on-init
            class="basicflow"
            @node-click="onNodeClick"
            @pane-click="onPaneClick"
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

<style scoped>
.basicflow {
    background-color: #1a1a1a;
}
</style>
