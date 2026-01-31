const { contextBridge, ipcRenderer } = require("electron")

contextBridge.exposeInMainWorld("api", {
    openDirectoryDialog: () => ipcRenderer.send("open-directory-dialog"),
    onDirectorySelectionCanceled: (callback) => ipcRenderer.on("directory-selection-canceled", () => callback()),
    onSelectedDirectory: (callback) => ipcRenderer.on("selected-directory", (event, path) => callback(path)),
    readDirectoryContents: (repoPath) => ipcRenderer.invoke("read-directory-tree", repoPath),
    readFileContents: (filePath) => ipcRenderer.invoke("read-file-contents", filePath),
    openPath: (filePath) => ipcRenderer.invoke("open-path", filePath),
    getRecentlyUsedRepositories: () => ipcRenderer.invoke("get-recently-used-repositories"),
    removeRecentlyUsedRepository: (repoPath) => ipcRenderer.invoke("remove-recently-used-repository", repoPath),
    fetchIssues: (owner, name) => ipcRenderer.invoke("fetch-issues", { owner, name }),
    saveIssuesCache: (repoPath, issues) => ipcRenderer.invoke("save-issues-cache", { repoPath, issues }),
    loadIssuesCache: (repoPath) => ipcRenderer.invoke("load-issues-cache", repoPath),
    loadRepoState: (repoPath) => ipcRenderer.invoke("loadRepoState", repoPath),
    saveRepoState: (repoPath, state) => ipcRenderer.invoke("saveRepoState", repoPath, state),
    cloneRepository: (url, localPath) => ipcRenderer.invoke("clone-repository", { url, localPath }),
    openTargetDirectoryDialog: (url, localPath) => ipcRenderer.invoke("open-target-directory-dialog"),
    saveRepository: (repoPath) => ipcRenderer.invoke("save-repository", repoPath),
    sendChatbotMessage: (model, chatHistory) => ipcRenderer.invoke("send-chatbot-message", { model, chatHistory }),
    onChatbotResponseChunk: (callback) => ipcRenderer.on("chatbot-response-chunk", (event, chunk) => callback(chunk)),
    onChatbotResponseAborted: (callback) => ipcRenderer.on("chatbot-response-aborted", () => callback()),
    abortChatbotResponse: () => ipcRenderer.invoke("abort-chatbot-response"),
    parseCode: (code) => ipcRenderer.invoke("parse-code", code),
    processRepoFiles: (filePaths) => ipcRenderer.invoke("process-repo-files", filePaths),
    analyzeChunk: (model, messages) => ipcRenderer.invoke("analyze-chunk", { model, messages }),
    fetchOllamaModels: (model, messages) => ipcRenderer.invoke("fetch-ollama-models", { model, messages })
})
