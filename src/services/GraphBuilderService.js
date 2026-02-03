import path from "path"

export const buildGraphData = (analysisResults, projectRoot, allFilePaths) => {
    if (!analysisResults || analysisResults.length === 0) {
        return { nodes: [], edges: [] }
    }

    const nodes = []
    const edges = []
    const directories = new Set()

    const analysisMap = new Map(analysisResults.map(r => [r.filePath, r]))

    // Collect directories
    allFilePaths.forEach(filePath => {
        const relativePath = path.relative(projectRoot, filePath)
        const parentDir = path.dirname(relativePath)

        if (parentDir !== ".") {
            let currentPath = ""

            parentDir.split(path.sep).forEach(part => {
                currentPath = currentPath ? path.join(currentPath, part) : part
                directories.add(currentPath)
            })
        }
    })

    // 2. Directory Nodes
    directories.forEach(dir => {
        nodes.push({
            id: dir.replace(/\\/g, "/"),
            type: "directory",
            label: path.basename(dir),
            parentNode: path.dirname(dir) === "." ? null : path.dirname(dir).replace(/\\/g, "/"),
            data: { label: path.basename(dir) },
            position: { x: 0, y: 0 }
        })
    })

    // File nodes
    allFilePaths.forEach(filePath => {
        const relativePath = path.relative(projectRoot, filePath).replace(/\\/g, "/")
        const analysis = analysisMap.get(filePath) || {
            summary: "Configuration or non-code file.",
            chunks: [],
            language: path.extname(filePath).slice(1)
        }

        nodes.push({
            id: relativePath,
            type: 'file',
            label: path.basename(filePath),
            parentNode: path.dirname(relativePath) === '.' ? null : path.dirname(relativePath).replace(/\\/g, "/"),
            data: {
                ...analysis,
                relativePath,
                label: path.basename(filePath)
            },
            position: { x: 0, y: 0 }
        })
    })

    const nodeMap = new Map(nodes.map(n => [n.id, n]))

    const resolveImport = (importerPath, importPath) => {
        const importerDir = path.dirname(importerPath)

        let cleanImportPath = importPath
        if (importPath.endsWith('.js') || importPath.endsWith('.ts') || importPath.endsWith('.jsx') || importPath.endsWith('.tsx')) {
            cleanImportPath = importPath.slice(0, importPath.lastIndexOf('.'))
        }

        const extensions = ['', '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs']

        const indexFiles = ['/index.js', '/index.ts', '/index.jsx', '/index.tsx']

        const candidates = []

        extensions.forEach(ext => {
            candidates.push(path.resolve(importerDir, cleanImportPath + ext))
        })

        indexFiles.forEach(indexFile => {
            candidates.push(path.resolve(importerDir, cleanImportPath + indexFile))
        })

        for (const candidate of candidates) {
            if (nodeMap.has(candidate)) {
                return candidate
            }
        }

        const importBaseName = path.basename(cleanImportPath, path.extname(cleanImportPath))

        for (const [nodePath, node] of nodeMap.entries()) {
            if (node.type !== "file") continue

            const nodeBaseName = path.basename(nodePath, path.extname(nodePath))

            if (nodeBaseName === importBaseName) {
                const relImportPath = path.relative(importerDir, nodePath)

                if (relImportPath.includes(cleanImportPath) || cleanImportPath.includes(nodeBaseName)) {
                    return nodePath
                }
            }
        }

        return null
    }

    // Create dependency edges (import statements)
    nodes.forEach(node => {
        if (node.type !== 'file') return
        if (!node.data.dependencies || node.data.dependencies.length === 0) return

        node.data.dependencies.forEach((dep, index) => {
            const targetPath = resolveImport(node.id, dep.raw)

            if (targetPath) {
                edges.push({
                    id: `import-${node.id}-${targetPath}-${index}`,
                    source: node.id,
                    target: targetPath,
                    type: "bezier",
                    label: dep.raw,
                    animated: false,
                    style: {
                        stroke: "#ff9100",
                        strokeWidth: 2
                    },
                    labelStyle: {
                        fill: "#000000",
                        fontSize: 10
                    }
                })
            } else {
                console.warn(`Could not resolve import "${dep.raw}" from ${path.basename(node.id)}`)
            }
        })
    })

    // Create function declaration edges
    const functionMap = new Map()

    nodes.forEach(node => {
        if (node.type !== "file") return
        if (!node.data.functions) return

        node.data.functions.forEach(func => {
            if (!functionMap.has(func.name)) {
                functionMap.set(func.name, [])
            }

            functionMap.get(func.name).push({
                nodeId: node.id,
                handleId: func.name + "-in",
                line: func.line,
                fileName: node.label
            })
        })
    })

    // Create edges for function calls
    nodes.forEach(sourceNode => {
        if (sourceNode.type !== 'file') return
        if (!sourceNode.data.calls) return

        sourceNode.data.calls.forEach(call => {
            const definitions = functionMap.get(call.name)

            if (!definitions || definitions.length === 0) return

            definitions.forEach(def => {
                // Skip self-calls
                // if (def.nodeId === sourceNode.id) return

                edges.push({
                    id: `call-${sourceNode.id}-line${call.line}-${def.nodeId}`,
                    source: sourceNode.id,
                    sourceHandle: `call-${call.name}-line-${call.line}`,
                    target: def.nodeId,
                    targetHandle: def.handleId,
                    type: "bezier",
                    animated: true,
                    label: `${call.name}()`,
                    style: {
                        stroke: "#77fa60",
                        strokeWidth: 2
                    },
                    labelStyle: {
                        fill: "#000000",
                        fontSize: 10
                    }
                })
            })
        })
    })

    console.log(`Graph created: ${nodes.length} nodes (${nodes.filter(n => n.type === 'directory').length} dirs, ${nodes.filter(n => n.type === 'file').length} files), ${edges.length} edges`)
    console.log(`   - ${edges.filter(e => e.id.startsWith('import')).length} import edges`)
    console.log(`   - ${edges.filter(e => e.id.startsWith('call')).length} function call edges`)

    return { nodes, edges }
}
