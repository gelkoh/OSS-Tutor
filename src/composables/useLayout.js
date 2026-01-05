import dagre from '@dagrejs/dagre'
import { Position } from '@vue-flow/core'

export const useLayout = () => {
    
    const layoutGraph = (nodes, edges, direction = 'LR') => {
        const dagreGraph = new dagre.graphlib.Graph()
        
        dagreGraph.setGraph({
            rankdir: direction,
            nodesep: 150,  // Horizontaler Abstand zwischen Nodes
            ranksep: 200,  // Vertikaler Abstand zwischen Ebenen
            marginx: 50,
            marginy: 50
        })
        
        dagreGraph.setDefaultEdgeLabel(() => ({}))

        // NUR Root-Nodes (ohne parentNode) ins Dagre-Layout
        const rootNodes = nodes.filter(n => !n.parentNode)
        
        console.log('Root nodes für Layout:', rootNodes.map(n => ({
            id: n.id,
            dimensions: n.dimensions
        })))
        
        // Füge alle Root-Nodes mit ihren GEMESSENEN Dimensionen hinzu
        rootNodes.forEach(node => {
            const width = node.dimensions?.width || 500
            const height = node.dimensions?.height || 400
            
            console.log(`Node ${node.id}: ${width}x${height}`)
            
            dagreGraph.setNode(node.id, { width, height })
        })

        // Edges nur zwischen Root-Nodes
        edges.forEach(edge => {
            const sourceIsRoot = rootNodes.some(n => n.id === edge.source)
            const targetIsRoot = rootNodes.some(n => n.id === edge.target)
            
            if (sourceIsRoot && targetIsRoot) {
                dagreGraph.setEdge(edge.source, edge.target)
            }
        })

        // Führe das Layout aus
        dagre.layout(dagreGraph)

        // Wende Layout-Positionen auf die Nodes an
        return nodes.map(node => {
            // Kinder-Nodes NICHT bewegen - sie haben relative Positionen
            if (node.parentNode) {
                return node
            }
            
            // Root-Node: Setze die vom Dagre berechnete Position
            const dagreNode = dagreGraph.node(node.id)
            
            if (!dagreNode) {
                console.warn(`Keine Dagre-Position für Node ${node.id}`)
                return node
            }
            
            const width = node.dimensions?.width || 500
            const height = node.dimensions?.height || 400
            
            // Dagre gibt die Center-Position zurück, wir brauchen top-left
            const x = dagreNode.x - width / 2
            const y = dagreNode.y - height / 2
            
            console.log(`Layout für ${node.id}: x=${x}, y=${y}`)
            
            return {
                ...node,
                position: { x, y }
            }
        })
    }

    return { layoutGraph }
}
