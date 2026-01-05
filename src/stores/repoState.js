import { defineStore } from 'pinia'
import { ref, computed, toRaw } from 'vue'

const ANALYZE_PROJECT = false

export const useRepoStateStore = defineStore('repoState', () => {
    const graphNodes = ref([])
    const graphEdges = ref([])

    ////////////////////
    // Refs
    ////////////////////

    // Persistent
    const repoPath = ref("")
    const repoInfo = ref()

    // Non-persistent
    const fileTree = ref(null)
    const isRepoOpen = ref(false)
    const isLoading = ref(false)

    const progress = ref(0)
    const currentFileName = ref("")
    const totalFilesToBeAnalysedCount = ref(0)
    const currentFileIndex = ref(0)
    const totalChunkCount = ref(0)
    const currentChunkIndex = ref(0)

    // Issues
    const issues = ref([])
    const targetedIssueId = ref(null)
    const currentlyViewedIssue = ref({})

    // File explorer
    const fileExplorerState = ref({})
    const searchQuery = ref("")

    // Chatbot
    const chatbotHistory = ref([])

    ////////////////////
    // Computed properties
    ////////////////////
    const currentFileTree = computed(() => fileTree.value )
    const currentSearchQuery = computed(() => searchQuery.value)
    const currentChatbotHistory = computed(() => chatbotHistory.value)

    const currentTargetIssue = computed(() => {
        if (!targetedIssueId.value) return null
        return issues.value.find(i => i.id === targetedIssueId.value) || null
    })

    const getCurrentProgress = computed(() => progress.value)
    const getCurrentFileName = computed(() => currentFileName.value)

    const getFilesAnalysedDisplay = computed(() => {
        return `${currentFileIndex.value}/${totalFilesToBeAnalysedCount.value}`
    })

    const getChunksAnalysedDisplay = computed(() => {
        return `${currentChunkIndex.value}/${totalChunkCount.value}`
    })

    ////////////////////
    // Reading/loading/saving repo
    ////////////////////
    const readRepoContents = async (path) => {
        isLoading.value = true

        try {
            const { analysisResults, graphData } = await window.api.processRepoFiles(path)

            console.log('Rohe Daten vom Backend:', graphData.nodes.length, 'Nodes')

            // Organisiere Nodes: Parents zuerst, dann Kinder
            const organizedNodes = organizeNodesForVueFlow(graphData.nodes)

            console.log('Organisierte Nodes:', organizedNodes.length)
            console.log('Parents:', organizedNodes.filter(n => !n.parentNode).length)
            console.log('Children:', organizedNodes.filter(n => n.parentNode).length)

            graphNodes.value = organizedNodes
            graphEdges.value = graphData.edges

            await window.api.saveRepoState(path, { 
                graphData: {
                    nodes: organizedNodes,
                    edges: graphData.edges
                }
            })

        } catch (e) {
            console.error(e)
        } finally {
            isLoading.value = false
            isRepoOpen.value = true
        }
    }

    const organizeNodesForVueFlow = (nodes) => {
        const parentNodes = nodes.filter(n => !n.parentNode)
        const childNodes = nodes.filter(n => n.parentNode)

        console.log('Organisiere:', parentNodes.length, 'Parents,', childNodes.length, 'Children')

        const organizedParents = parentNodes.map((parent, index) => ({
            ...parent,
            type: parent.type || 'directory',
            position: { x: index * 600, y: 0 },
            style: {
                padding: '0',
            },
            extent: undefined,
            data: {
                ...parent.data,
                label: parent.label || parent.data?.label || 'Unknown Directory'
            }
        }))

        const organizedChildren = childNodes.map((child, index) => ({
            ...child,
            type: child.type || 'file',
            position: { x: 20, y: 60 + (index * 50) },
            parentNode: child.parentNode,
            extent: 'parent',
            expandParent: true,
            data: {
                ...child.data,
                label: child.label || child.data?.label || 'Unknown File'
            }
        }))

        console.log('Organisierte Parents:', organizedParents.map(p => ({
            id: p.id,
            position: p.position,
            type: p.type
        })))

        return [...organizedParents, ...organizedChildren]
    }

    /*const runLLMAnalysisInBackground = async (analysisResults) => {
        // Hier kommt deine Loop rein, die du vorher hattest.
        // ABER: Speichere die Ergebnisse nicht nur in einer Variable, 
        // sondern update direkt den spezifischen Node im Graph!
        
        for (const entry of analysisResults) {
            // ... (Dein LLM Aufruf Code) ...
            const summary = await window.api.analyzeChunk(...)

            // Update den Node im Store, damit das Icon z.B. grün wird ("Analyzed")
            const nodeId = getIdFromPath(entry.filePath)
            updateNodeData(nodeId, { summary: summary })
            
            // Nach jeder Datei kurz speichern, damit Fortschritt nicht verloren geht
            await saveProgress() 
        }
    }*/

    /*const readRepoContents = async (path) => {
        // TODO: Refactor this function
        await window.api.saveRepository(path)

        isLoading.value = true

        //error.value = null
        fileTree.value = {}

        repoInfo.value = {}

        try {
            isRepoOpen.value = true

            // probably read repo info separately
            const { fileTree: tree, repoInfo: loadedRepoInfo } = await window.api.readDirectoryContents(path)

            fileTree.value = tree

            // Here all repo state gets loaded -- important
            await loadRepoState(path)

            // Set file tree in store (not persistently)
            await setFileTree(tree)

            if (ANALYZE_PROJECT) {
                console.log("TRYING TO ANALYZE PROJECT")
                const analysis = await window.api.processRepoFiles(tree.allFilePaths)

                const modelName = "codellama"

                totalFilesToBeAnalysedCount.value = analysis.analysisResults.length

                // Count chunks
                for (const entry of analysis.analysisResults) {
                    totalChunkCount.value += entry.chunks.length
                }

                const analysisProgressStep = 1.0 / totalChunkCount.value

                let messagesCollector = []

                for (const entry of analysis.analysisResults) {
                    currentFileName.value = entry.filePath.split("/").at(-1)

                    for (const chunk of entry.chunks) {
                        const chunkPrompt = `
                            Analyze this code chunk from the repository. Explain what it does.

                            \`\`\`${entry.language}
                            ${chunk}
                            \`\`\`

                            Provide a concise, single-paragraph summary.
                        `.trim()

                        const chunkMessages = [{
                            role: "user",
                            content: chunkPrompt
                        }]

                        const chunkSummary = await window.api.analyzeChunk(
                            modelName,
                            chunkMessages
                        )

                        messagesCollector.push(chunkSummary)

                        currentChunkIndex.value += 1
                        progress.value += analysisProgressStep
                    }

                    const filePrompt = `
                        Summarize the primary function of this file based on its summarized code chunks.

                        ${messagesCollector.join("\n")}
                    `.trim()

                    const fileMessages = [{
                        role: "user",
                        content: filePrompt
                    }]

                    const chunkSummary = await window.api.analyzeChunk(
                        modelName,
                        fileMessages
                    )

                    messagesCollector = []
                    currentFileIndex.value += 1
                }
            }

            if (loadedRepoInfo && loadedRepoInfo.ownerName && loadedRepoInfo.repoName) {
                repoInfo.owner = loadedRepoInfo.ownerName
                repoInfo.name = loadedRepoInfo.repoName

                const cachedIssues = await window.api.loadIssuesCache(path)
                console.log("Cached issues:", cachedIssues)
                issues.value = cachedIssues
                console.log(`Loaded ${cachedIssues.length} issues from cache`)

                if (cachedIssues.length === 0) {
                    console.log("Cached issues length:", cachedIssues.length)
                    await fetchIssues(repoInfo.ownerName, repoInfo.repoName)
                }
            } else {
                issues.value = []
            }
        } catch(error) {
            console.error("An error occured:", error.message)
        } finally {
            isLoading.value = false
        }
    }*/

    const loadRepoState = async (path) => {
        if (!window.api) {
            console.error("API is not available.")
            return
        }

        repoPath.value = path

        const state = await window.api.loadRepoState(path)

        const cachedIssues = await window.api.loadIssuesCache(path)

        targetedIssueId.value = state.targetedIssueId || null
        fileExplorerState.value = state.fileExplorerState || {}
        chatbotHistory.value = state.chatbotHistory || []
        issues.value = cachedIssues

        console.log(issues.value)
    }

    const saveRepoState = async (updates = {}) => {
        if (!repoPath.value) return

        const stateWithProxies = {
            targetedIssueId: targetedIssueId.value,
            fileExplorerState: fileExplorerState.value,
            chatbotHistory: chatbotHistory.value,
            ...updates
        }

        const finalData = JSON.parse(JSON.stringify(stateWithProxies))

        await window.api.saveRepoState(repoPath.value, finalData)
    }

    const setFileTree = (treeData) => {
        fileTree.value = treeData
    }

    ////////////////////
    // Issues
    ////////////////////
    //const fetchAndCacheIssues = async (owner, repo, repoPath) => {
    //    console.log("Fetching fresh issues from GitHub...")

    //    try {
    //        const freshIssues = await window.api.fetchIssues(owner, repo)
    //        issues.value = freshIssues

    //        issues.value.forEach(issue => {
    //            issue["is_targeted"] = false
    //        })

    //        await window.api.saveIssuesCache(repoPath, freshIssues)

    //        console.log(`Successfully fetched and cached ${freshIssues.length} fresh open issues`)
    //    } catch(err) {
    //        console.error("Error fetching fresh issues:", err.message)
    //    }
    //}

    const targetIssue = async (issueId) => {
        if (issueId === targetedIssueId.value) {
            targetedIssueId.value = null

            issues.value.forEach(issue => {
                issue.is_targeted = false
            })
        } else {
            targetedIssueId.value = issueId

            issues.value.forEach(issue => {
                issue.is_targeted = issue.id === issueId
            })
        }

        await saveRepoState()
    }

    const fetchIssues = async () => {
        console.log("Fetching issues...")

        try {
            const fetchedIssues = await window.api.fetchIssues(repoInfo.owner, repoInfo.name)
            issues.value = fetchedIssues

            issues.value.forEach(issue => issue["is_targeted"] = false)

            const serializableIssues = JSON.parse(JSON.stringify(issues.value)) 

            await window.api.saveIssuesCache(repoPath.value, serializableIssues)

            console.log(`Successfully fetched and cached ${fetchedIssues.length} issues`)
        } catch(error) {
            console.warn("Error fetching issues:", error.message)
        }
    }

    const setDirectoryState = async (dirPath, isOpen) => {
        fileExplorerState.value[dirPath] = isOpen
        await saveRepoState({ fileExplorerState: fileExplorerState.value })
    }

    const setSearchQuery = (query) => { searchQuery.value = query }

    const saveHistory = async (history) => {
        chatbotHistory.value = history
        await saveRepoState({ chatbotHistory: chatbotHistory.value })
    }

    const clearHistory = async () => {
        chatbotHistory.value = []
        await saveRepoState({ chatbotHistory: chatbotHistory.value })
    }

    return {
        repoPath,
        isRepoOpen,
        isLoading,

        getCurrentProgress,
        getCurrentFileName,
        getFilesAnalysedDisplay,
        getChunksAnalysedDisplay,

        currentFileTree,
        fileExplorerState,
        currentSearchQuery,
        setSearchQuery,
        setDirectoryState,

        issues,
        fetchIssues,
        currentlyViewedIssue,
        currentTargetIssue,
        targetIssue,
        targetedIssueId,

        chatbotHistory,
        saveHistory,
        currentChatbotHistory,
        clearHistory,

        readRepoContents,
        organizeNodesForVueFlow,
        loadRepoState,
        saveRepoState,

        graphNodes,
        graphEdges,
    }
})
