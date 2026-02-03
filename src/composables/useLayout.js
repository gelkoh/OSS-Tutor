import dagre from "@dagrejs/dagre"
import { Position } from "@vue-flow/core"

// Fallback values
const DIR_MIN_WIDTH = 900
const DIR_MIN_HEIGHT = 400

export const useLayout = () => {
    const layoutGraph = (nodes, edges, direction = 'LR') => {
        const dagreGraph = new dagre.graphlib.Graph()

        dagreGraph.setGraph({
            rankdir: direction,
            nodesep: 200,
            ranksep: 300,
            marginx: 100,
            marginy: 100,
            align: "UL",
            acyclicer: "greedy",
            ranker: "tight-tree"
        })

        dagreGraph.setDefaultEdgeLabel(() => ({}))

        const rootNodes = nodes.filter(n => !n.parentNode)

        // Add all root-nodes with their real dimensions
        rootNodes.forEach(node => {
            let width = DIR_MIN_WIDTH
            let height = DIR_MIN_HEIGHT

            if (node.dimensions?.width) {
                width = node.dimensions.width
            }

            if (node.dimensions?.height) {
                height = node.dimensions.height
            }

            if (node.style?.width) {
                const styleWidth = parseInt(node.style.width)
                if (!isNaN(styleWidth)) width = styleWidth
            }

            if (node.style?.height) {
                const styleHeight = parseInt(node.style.height)
                if (!isNaN(styleHeight)) height = styleHeight
            }

            dagreGraph.setNode(node.id, { width, height })
        })

        const rootNodeIds = new Set(rootNodes.map(n => n.id))

        edges.forEach(edge => {
            if (rootNodeIds.has(edge.source) && rootNodeIds.has(edge.target)) {
                dagreGraph.setEdge(edge.source, edge.target)
            }
        })

        dagre.layout(dagreGraph)

        return nodes.map(node => {
            if (node.parentNode) {
                return node
            }

            const dagreNode = dagreGraph.node(node.id)

            if (!dagreNode) {
                console.warn(`No dagre-position for node ${node.id}`)
                return node
            }

            const x = dagreNode.x - dagreNode.width / 2
            const y = dagreNode.y - dagreNode.height / 2

            return {
                ...node,
                position: { x, y }
            }
        })
    }

    return { layoutGraph }
}
