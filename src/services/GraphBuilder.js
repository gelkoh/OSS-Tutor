import path from "path"

/*export const buildGraphData = (analysisResults, projectRoot) => {
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
}*/


// ============================================
// 2. UPDATE: buildGraphData mit korrekter Edge-Creation
// ============================================
const buildGraphData = (analysisResults, projectRoot) => {
    const nodes = []
    const edges = []
    
    // 1. Erstelle alle Nodes
    analysisResults.forEach(analysis => {
        const nodeId = analysis.filePath
        const fileName = path.basename(analysis.filePath)
        
        // Bestimme Parent Directory für Grouping
        const relativePath = path.relative(projectRoot, analysis.filePath)
        const parentDir = path.dirname(relativePath)
        
        nodes.push({
            id: nodeId,
            type: 'file',
            label: fileName,
            filePath: analysis.filePath,
            data: {
                ...analysis,
                relativePath
            },
            parentNode: parentDir === '.' ? null : parentDir
        })
    })
    
    // 2. Erstelle Map für schnellen Lookup
    const nodeMap = new Map(nodes.map(n => [n.id, n]))
    
    // 3. Helper: Resolve Import zu tatsächlichem File Path
    const resolveImport = (importerPath, importPath) => {
        const importerDir = path.dirname(importerPath)
        
        // WICHTIG: Normalisiere den Import-Pfad (entferne .js Extension wenn vorhanden)
        // Da Tree-sitter die Extension mit erfasst
        let cleanImportPath = importPath
        if (importPath.endsWith('.js')) {
            cleanImportPath = importPath.slice(0, -3)
        }
        
        // Liste von Extensions die probiert werden
        const extensions = ['', '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs']
        
        // Liste von möglichen Index-Files
        const indexFiles = ['/index.js', '/index.ts', '/index.jsx', '/index.tsx']
        
        const candidates = []
        
        // 1. Direkte Auflösung mit verschiedenen Extensions
        extensions.forEach(ext => {
            candidates.push(path.resolve(importerDir, cleanImportPath + ext))
        })
        
        // 2. Als Directory mit Index-File
        indexFiles.forEach(indexFile => {
            candidates.push(path.resolve(importerDir, cleanImportPath + indexFile))
        })
        
        // DEBUG: Log alle Kandidaten
        console.log(`🔍 Resolving "${importPath}" from ${path.basename(importerPath)}`)
        console.log(`   Import dir: ${importerDir}`)
        console.log(`   Candidates:`, candidates.slice(0, 3).map(c => path.basename(c)))
        
        // 3. Suche den ersten Match
        for (const candidate of candidates) {
            if (nodeMap.has(candidate)) {
                console.log(`   ✅ FOUND: ${path.basename(candidate)}`)
                return candidate
            }
        }
        
        // 4. Fallback: Fuzzy Match auf Dateinamen (für komplexe Module)
        const importBaseName = path.basename(cleanImportPath, path.extname(cleanImportPath))
        for (const [nodePath, node] of nodeMap.entries()) {
            const nodeBaseName = path.basename(nodePath, path.extname(nodePath))
            if (nodeBaseName === importBaseName) {
                // Zusätzliche Validierung: Prüfe ob der relative Pfad passt
                const relImportPath = path.relative(importerDir, nodePath)
                if (relImportPath.includes(cleanImportPath) || cleanImportPath.includes(nodeBaseName)) {
                    console.log(`   ✅ FUZZY MATCH: ${path.basename(nodePath)}`)
                    return nodePath
                }
            }
        }
        
        console.log(`   ❌ NOT FOUND`)
        console.log(`   Available nodes:`, Array.from(nodeMap.keys()).map(k => path.basename(k)).slice(0, 5))
        
        return null
    }
    
    // 4. ERSTELLE DEPENDENCY EDGES (Import Statements)
    nodes.forEach(node => {
        if (!node.data.dependencies || node.data.dependencies.length === 0) return
        
        node.data.dependencies.forEach((dep, index) => {
            const targetPath = resolveImport(node.id, dep.raw)
            
            if (targetPath) {
                edges.push({
                    id: `import-${node.id}-${targetPath}-${index}`,
                    source: node.id,
                    target: targetPath,
                    type: 'smoothstep',
                    label: dep.raw,
                    animated: false,
                    style: { 
                        stroke: '#60a5fa',
                        strokeWidth: 2
                    },
                    labelStyle: {
                        fill: '#60a5fa',
                        fontSize: 10
                    }
                })
            } else {
                console.warn(`⚠️ Could not resolve import "${dep.raw}" from ${path.basename(node.id)}`)
            }
        })
    })
    
    // 5. ERSTELLE FUNCTION CALL EDGES
    // Map: functionName -> [alle Nodes die diese Function definieren]
    const functionMap = new Map()
    
    nodes.forEach(node => {
        if (!node.data.functions) return
        
        node.data.functions.forEach(func => {
            if (!functionMap.has(func.name)) {
                functionMap.set(func.name, [])
            }
            functionMap.get(func.name).push({
                nodeId: node.id,
                handleId: func.name + '-in',
                line: func.line,
                fileName: node.label
            })
        })
    })
    
    // Erstelle Edges für jeden Function Call
    nodes.forEach(sourceNode => {
        if (!sourceNode.data.calls) return
        
        sourceNode.data.calls.forEach(call => {
            const definitions = functionMap.get(call.name)
            
            if (!definitions || definitions.length === 0) return
            
            definitions.forEach(def => {
                // Skip self-calls (wenn Function im selben File aufgerufen wird)
                if (def.nodeId === sourceNode.id) return
                
                edges.push({
                    id: `call-${sourceNode.id}-line${call.line}-${def.nodeId}`,
                    source: sourceNode.id,
                    sourceHandle: `call-${call.name}-line-${call.line}`,
                    target: def.nodeId,
                    targetHandle: def.handleId,
                    type: 'smoothstep',
                    animated: true,
                    label: `${call.name}()`,
                    style: { 
                        stroke: '#34d399',
                        strokeWidth: 2
                    },
                    labelStyle: {
                        fill: '#34d399',
                        fontSize: 10
                    }
                })
            })
        })
    })
    
    console.log(`✅ Graph created: ${nodes.length} nodes, ${edges.length} edges`)
    console.log(`   - ${edges.filter(e => e.id.startsWith('import')).length} import edges`)
    console.log(`   - ${edges.filter(e => e.id.startsWith('call')).length} function call edges`)
    
    return { nodes, edges }
}
