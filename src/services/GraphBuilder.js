import path from "path"

export const buildGraphData = (analysisResults, projectRoot) => {
    const nodes = []
    const edges = []
    
    // Hilfsfunktion: ID generieren
    const getId = (absPath) => path.relative(projectRoot, absPath).replace(/\\/g, "/")

    const createdDirectories = new Set()

    // 1. NODES ERSTELLEN (Identisch zu deinem Code)
    analysisResults.forEach(file => {
        const fileId = getId(file.filePath)
        const dirName = path.dirname(fileId)

        // Directory Nodes
        if (dirName !== "." && !createdDirectories.has(dirName)) {
            nodes.push({
                id: dirName,
                type: 'directory',
                label: dirName,
                position: { x: 0, y: 0 },
                data: { isOpen: true },
                style: { backgroundColor: 'rgba(240, 240, 240, 0.5)', width: 300, height: 200 }
            })
            createdDirectories.add(dirName)
        }

        // File Nodes
        nodes.push({
            id: fileId,
            type: 'file',
            label: path.basename(file.filePath),
            parentNode: dirName !== "." ? dirName : undefined,
            extent: 'parent',
            position: { x: 0, y: 0 },
            data: {
                hasSummary: file.chunks.length > 0,
                chunks: file.chunks,
                functions: file.functions,
                calls: file.calls, // Wichtig für Source Handles!
                lineCount: file.lineCount,
            }
        })
    })

    // Set für schnellen Lookup (Existiert die Node wirklich?)
    const validNodeIds = new Set(nodes.map(n => n.id))

    // Map für schnellen Funktions-Lookup: NodeId -> [Funktionen...]
    const fileFunctionMap = new Map()
    analysisResults.forEach(file => {
        fileFunctionMap.set(getId(file.filePath), file.functions || [])
    })

    // 2. EDGES ERSTELLEN (Komplett überarbeitet)
    analysisResults.forEach(file => {
        const sourceId = getId(file.filePath)

        file.dependencies.forEach((dep, index) => {
            // FIX: Pfad-Auflösung sauberer machen
            let targetPath = dep.targetAbsolutePath

            // Nur .js anhängen, wenn noch keine Extension da ist!
            if (!targetPath.endsWith('.js') && !targetPath.endsWith('.vue') && !targetPath.endsWith('.ts')) {
                targetPath += '.js'
            }

            const targetId = getId(targetPath)

            // CHECK: Existiert das Ziel überhaupt?
            // Das verhindert den "Edge source or target is missing" Fehler
            if (!validNodeIds.has(targetId)) {
                console.warn(`Edge verworfen: ${sourceId} -> ${targetId} (Ziel existiert nicht)`)
                return 
            }

            // 2a. Spezifische Function-Calls matchen
            const sourceCalls = file.calls || []
            const targetFunctions = fileFunctionMap.get(targetId) || []
            let specificEdgeCreated = false

            sourceCalls.forEach(call => {
                // Suche: Gibt es im Ziel-File eine Funktion mit demselben Namen?
                const match = targetFunctions.find(f => f.name === call.name)
                
                if (match) {
                    edges.push({
                        id: `e-${sourceId}-${targetId}-${call.name}-${call.line}`,
                        source: sourceId,
                        target: targetId,
                        // Verbindet "call-add-line-5" (Source) mit "add-in" (Target)
                        sourceHandle: `call-${call.name}-line-${call.line}`,
                        targetHandle: `${match.name}-in`, 
                        animated: true,
                        style: { stroke: '#61afef', strokeWidth: 2 }
                    })
                    specificEdgeCreated = true
                }
            })

            // 2b. Fallback: Generische Edge (wenn kein direkter Funktionsaufruf erkannt wurde)
            // Nur erstellen, wenn wir keine spezifische Edge haben, sonst haben wir doppelte Linien
            if (!specificEdgeCreated) {
                edges.push({
                    id: `e-${sourceId}-${index}`,
                    source: sourceId,
                    target: targetId,
                    animated: true,
                    style: { stroke: '#b1b1b7', strokeDasharray: '5 5' }
                })
            }
        })
    })


    console.log("Generierte Edges:", edges.length, edges)
    return { nodes, edges }
}
