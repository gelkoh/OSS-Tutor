import { defineStore } from 'pinia'
import { ref, computed, toRaw } from 'vue'

const ANALYZE_PROJECT = false

export const useRepoStateStore = defineStore('repoState', () => {
    // ---------------------------------------------------------
    // STATE
    // ---------------------------------------------------------
    const graphNodes = ref([])
    const graphEdges = ref([])

    // Persistent data
    const repoPath = ref("")
    const repoInfo = ref()
    const fileTree = ref(null)

    // UI state
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
    const currentFileTree = computed(() => fileTree.value)
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
        repoPath.value = path

        try {
            let cachedState = await window.api.loadRepoState(path)

            // TODO: REMOVE
            cachedState = null


            if (cachedState && cachedState.graphData) {
                console.log("Loading from Cache...")

                // Step 1: Restore graph
                graphNodes.value = cachedState.graphData.nodes
                graphEdges.value = cachedState.graphData.edges

                // Step 2: Restore file explorer
                fileTree.value = cachedState.fileTree
                repoInfo.value = cachedState.repoInfo || {}

                // Step 3: Restore secondary data
                fileExplorerState.value = cachedState.fileExplorerState || {}
                chatbotHistory.value = cachedState.chatbotHistory || []

                const cachedIssues = await window.api.loadIssuesCache(path)
                issues.value = cachedIssues || []

                /////// ONLY FOR TESTING
                //await performFullAnalysis(path)
            } else {
                console.log("No cache found. Starting full analysis...")
                // await performFullAnalysis(path)
                await performFullAnalysis(path)
            }
        } catch (e) {
            console.error("Critical Error during repo loading:", e)
        } finally {
            isLoading.value = false
            isRepoOpen.value = true
        }
    }

    // ---------------------------------------------------------
    // ANALYSIS LOGIC
    // ---------------------------------------------------------
    const performFullAnalysis = async (path) => {
        // Step 1: Retrieve file tree for file explorer
        const { fileTree: tree, repoInfo: info } = await window.api.readDirectoryContents(path)

        fileTree.value = tree
        repoInfo.value = info

        // SCHRITT A: Strukturelle Analyse (Backend)
        //loadingMessage.value = "Parsing file structure & AST..."
        const { graphData } = await window.api.processRepoFiles(path)

        // SCHRITT B: LLM Analyse (Iterativ)
        // Wir iterieren direkt über die graphData.nodes, da diese schon die Chunks enthalten
        const nodesToAnalyze = graphData.nodes.filter(n => n.type === 'file' && n.data.chunks && n.data.chunks.length > 0)
        
        let processedCount = 0
        const totalCount = nodesToAnalyze.length

        console.log(`Starting LLM Analysis for ${totalCount} files...`)

        for (const node of nodesToAnalyze) {
            processedCount++

            try {
                const codeContext = node.data.chunks.join("\n\n").substring(0, 10000) // Safety Trim

                const messages = [
                    {
                        role: "system", 
                        content: "You are a senior software architect. Summarize the technical purpose of this code file in 2-3 concise sentences. Do not mention imports unless crucial. Focus on what functionality it exports." 
                    },
                    {
                        role: "user",
                        content: `Filename: ${node.label}\n\nCode:\n${codeContext}`
                    }
                ]

                // API Aufruf an Ollama (codellama, llama3, etc.)
                const modelName = "llama3.1" // oder was du lokal hast
                const summary = await window.api.analyzeChunk(modelName, messages)
                
                // ERGEBNIS SPEICHERN
                // Wir schreiben das direkt in das Node-Objekt
                node.data.summary = summary.content || summary // Je nachdem wie deine API antwortet

            } catch (err) {
                console.error(`Failed to analyze ${node.label}`, err)
                node.data.summary = "Analysis failed."
            }
        }

        // SCHRITT C: Organisation & Layout
        //loadingMessage.value = "Calculating Graph Layout..."
        const organizedNodes = organizeNodesForVueFlow(graphData.nodes)
        
        // (Optional) Layout hier schon berechnen oder dem Canvas überlassen
        // const layoutedNodes = layoutGraph(organizedNodes, graphData.edges)
        
        // State setzen
        graphNodes.value = organizedNodes
        graphEdges.value = graphData.edges

        // SCHRITT D: Speichern (Persistenz)
        //loadingMessage.value = "Saving analysis results..."
        await window.api.saveRepoState(path, { 
            graphData: {
                nodes: organizedNodes,
                edges: graphData.edges
            }
        })
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
    
    // Sicherheitsprüfung
    if (!repoInfo.value?.ownerName || !repoInfo.value?.repoName) {
        console.warn("Cannot fetch issues: GitHub repository info missing")
        console.log("Current repoInfo:", repoInfo.value)
        return
    }

    try {
        const fetchedIssues = await window.api.fetchIssues(
            repoInfo.value.ownerName, 
            repoInfo.value.repoName
        )
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

    // ---------------------------------------------------------
    // For programmatic navigation
    // ---------------------------------------------------------
    const focusedNodeSignal = ref(null)

    const focusNode = (nodeId) => {
        console.log("Fokussiere Node:", nodeId)
        focusedNodeSignal.value = { 
            id: nodeId, 
            time: Date.now() 
        }
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

        focusedNodeSignal,
        focusNode
    }
})
