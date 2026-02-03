import ollama from "ollama"
import path from "path"

// Vector store for code chunks
let codeChunkVectorStore = []

export const buildVectorStore = async (analysisResults) => {
    codeChunkVectorStore = []

    for (const file of analysisResults) {
        const filePath = file.filePath || file.id || file.path || "unknown"

        for (const [index, chunk] of (file.chunks || []).entries()) {
            try {
                const response = await ollama.embeddings({
                    model: "nomic-embed-text",
                    prompt: `File: ${filePath}\nCode:\n${chunk}`
                })

                codeChunkVectorStore.push({
                    filePath: filePath,
                    code: chunk,
                    embedding: response.embedding,
                    metadata: {
                        language: file.language || "javascript",
                        chunkIndex: index
                    }
                })
            } catch (err) {
                console.error("Embedding failed for", filePath, err)
            }
        }
    }
    console.log(`Vector store built with ${codeChunkVectorStore.length} chunks`)
}

// Calculates cosine similarity between two vectors
const cosineSimilarity = (vecA, vecB) => {
    let dotProduct = 0
    let normA = 0
    let normB = 0

    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i]
        normA += vecA[i] * vecA[i]
        normB += vecB[i] * vecB[i]
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}

// Retrieval => find most relevant chunks for a user question
export const retrieveRelevantChunks = async (query, topK = 20, targetIssue = null) => {
    if (codeChunkVectorStore.length === 0) {
        console.warn('Vector store is empty. Run buildVectorStore first.')
        return []
    }

    // Extend query with issue-context (if existent)
    let enhancedQuery = query

    if (targetIssue && targetIssue.body) {
        enhancedQuery = `${query}\n\nRelated issue: ${targetIssue.title}\n${targetIssue.body}`
    }

    console.log(`Retrieving relevant chunks for query: "${query.substring(0, 50)}..."`)

    // Create embeddings for the query
    const queryEmbedding = await ollama.embeddings({
        model: "nomic-embed-text",
        prompt: enhancedQuery
    })

    // Calculate similarity to all chunks
    const rankedChunks = codeChunkVectorStore.map(chunk => ({
        ...chunk,
        similarity: cosineSimilarity(queryEmbedding.embedding, chunk.embedding)
    }))

    // Sort by similarity and select top-k
    rankedChunks.sort((a, b) => b.similarity - a.similarity)
    const topChunks = rankedChunks.slice(0, topK)

    console.log(`Retrieved ${topChunks.length} chunks (similarities: ${topChunks.map(c => c.similarity.toFixed(3)).join(', ')})`)

    return topChunks
}


// Hybrid retrieval strategy => semantic search (embeddings), keywword-based (if file/function mentioned), graph-based
export const hybridRetrieval = async (query, graphData, targetIssue = null, topK = 30) => {
    const retrievedChunks = new Map()

    // If issue selected => scan issue for file names
    if (targetIssue && targetIssue.body) {
        const fileInIssuePattern = /([a-zA-Z0-9_/.-]+\.(js|ts|jsx|tsx))/g
        const filesFromIssue = [...targetIssue.body.matchAll(fileInIssuePattern)].map(m => m[1])

        filesFromIssue.forEach(fileName => {
            const node = graphData.nodes.find(n => n.id.endsWith(fileName))

            if (node) {
                addNodeToChunks(node, retrievedChunks, "issue-context")
            }
        })
    }

    // Semantic retrieval
    const semanticResults = await retrieveRelevantChunks(query, topK, targetIssue)

    semanticResults.forEach(chunk => {
        if (!retrievedChunks.has(chunk.filePath)) {
            retrievedChunks.set(chunk.filePath, [])
        }

        retrievedChunks.get(chunk.filePath).push({
            code: chunk.code,
            filePath: chunk.filePath,
            similarity: chunk.similarity,
            retrievalMethod: "semantic",
            language: chunk.metadata?.language || "javascript"
        })
    })

    // Keyword retrieval
    const filePathPattern = /`([^`]+\.(js|ts|jsx|tsx|py|java|go|rs))`/g
    const mentionedFiles = [...query.matchAll(filePathPattern)].map(m => m[1])

    if (mentionedFiles.length > 0) {
        mentionedFiles.forEach(mentionedFile => {
            const node = graphData.nodes.find(n => 
                n.id.endsWith(mentionedFile) || n.label === mentionedFile
            )

            if (node && node.data.chunks) {
                if (!retrievedChunks.has(node.id)) retrievedChunks.set(node.id, [])

                node.data.chunks.forEach((chunk, idx) => {
                    retrievedChunks.get(node.id).push({
                        filePath: node.id,
                        chunkIndex: idx,
                        code: chunk,
                        similarity: 1.0,
                        retrievalMethod: "keyword",
                        language: node.data.language
                    })
                })
            }
        })
    }

    // Graph-based retrieval
    // If file is mentioned explicitly => get its imports aswell
    mentionedFiles.forEach(mentionedFile => {
        const node = graphData.nodes.find(n =>
            n.id.endsWith(mentionedFile) || n.label === mentionedFile
        )

        if (node && node.data.dependencies) {
            const importedFiles = graphData.edges
                .filter(e => e.source === node.id && e.id.startsWith("import"))
                .map(e => e.target)

            importedFiles.forEach(importedFile => {
                const importedNode = graphData.nodes.find(n => n.id === importedFile)

                if (importedNode && importedNode.data.chunks) {
                    importedNode.data.chunks.slice(0, 2).forEach((chunk, idx) => {
                        if (!retrievedChunks.has(importedNode.id)) {
                            retrievedChunks.set(importedNode.id, [])
                        }

                        retrievedChunks.get(importedNode.id).push({
                            filePath: importedNode.id,
                            chunkIndex: idx,
                            code: chunk,
                            similarity: 0.8,
                            retrievalMethod: 'graph'
                        })
                    })
                }
            })
        }
    })

    return Array.from(retrievedChunks.entries())
}

// Builds context-string for the LLM from the retrieved chunks
export const buildContextFromChunks = (retrievedContext, targetIssue = null, projectRoot = null) => {
    let contextString = "RELEVANT CODE CONTEXT:\n\n"

    retrievedContext.forEach(([filePath, chunks]) => {
        let displayPath = filePath || "unknown-file"

        if (projectRoot && filePath) {
            const relativePath = path.relative(projectRoot, filePath)
            displayPath = relativePath !== "" ? relativePath : filePath
        }

        contextString += `\nFile: \`${displayPath}\`\n`

        chunks.forEach(chunk => {
            const language = chunk.metadata?.language || chunk.language || "javascript"
            const code = chunk.code || ""
            contextString += `\n\`\`\`${language}\n${code}\n\`\`\`\n`
        })
    })

    if (retrievedContext.length === 0) {
        contextString = "No relevant code context found. Answering based on general knowledge."
    }

    // Issue context
    if (targetIssue && targetIssue.body) {
        contextString += `\n\nCURRENT GITHUB ISSUE:\nTitle: ${targetIssue.title}\nBody: ${targetIssue.body}`
    }

    return contextString
}

function addNodeToChunks(node, map, method) {
    if (!node.data.chunks) return
    if (!map.has(node.id)) map.set(node.id, [])

    node.data.chunks.forEach((code, idx) => {
        map.get(node.id).push({
            filePath: node.id,
            code,
            similarity: 1.0,
            retrievalMethod: method
        })
    })
}
