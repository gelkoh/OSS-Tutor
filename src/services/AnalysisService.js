import Parser from "tree-sitter"
import JavaScript from "tree-sitter-javascript"
import Python from "tree-sitter-python"
import Java from "tree-sitter-java"
import Cpp from "tree-sitter-cpp"
import path from "path"

const parser = new Parser()
const MAX_CHUNK_SIZE = 2000

const LANGUAGE_CONFIG = {
    "js": {
        name: "javascript",
        parser: JavaScript,
        queries: {
            functions: `
                (function_declaration name: (identifier) @name) @def
                (variable_declarator 
                    name: (identifier) @name 
                    value: [(arrow_function) (function_expression)]
                ) @def
                (method_definition name: (property_identifier) @name) @def
            `,
            imports: `
                (import_statement source: (string) @import_path)
                (call_expression
                    function: (identifier) @func_name
                    arguments: (arguments (string) @import_path)
                    (#eq? @func_name "require"))
            `,
            calls: `
                (call_expression
                    function: (identifier) @func_name
                ) @call

                (call_expression
                    function: (member_expression
                        property: (property_identifier) @func_name
                    )
                ) @call
            `
        }
    },
    "jsx": {
        name: "javascript",
        parser: JavaScript,
        queries: {
            functions: `
                (function_declaration name: (identifier) @name) @def
                (variable_declarator 
                    name: (identifier) @name 
                    value: [(arrow_function) (function_expression)]
                ) @def
                (method_definition name: (property_identifier) @name) @def
            `,
            imports: `
                (import_statement source: (string) @import_path)
                (call_expression
                    function: (identifier) @func_name
                    arguments: (arguments (string) @import_path)
                    (#eq? @func_name "require"))
            `,
            calls: `
                (call_expression
                    function: (identifier) @func_name
                ) @call
            `
        }
    },
}

const detectLanguage = (filePath) => {
    const ext = path.extname(filePath).slice(1)
    return LANGUAGE_CONFIG[ext] || null
}

export const chunkCode = (codeContent, language = "javascript") => {
    if (!codeContent || codeContent.trim().length === 0) return []

    const langConfig = LANGUAGE_CONFIG[language] || LANGUAGE_CONFIG["js"]
    parser.setLanguage(langConfig.parser)

    const tree = parser.parse(codeContent)
    const chunks = []
    const rootNode = tree.rootNode
    const childCount = rootNode.childCount

    if (codeContent.length <= MAX_CHUNK_SIZE) {
        return [sanitizeCode(codeContent)]
    }

    let currentChunkStart = 0
    let currentChunkEnd = 0
    let currentSize = 0

    for (let i = 0; i < childCount; i++) {
        const child = rootNode.child(i)
        const nodeLength = child.endIndex - child.startIndex
        const gap = child.startIndex - currentChunkEnd

        if (currentSize + gap + nodeLength > MAX_CHUNK_SIZE && currentSize > 0) {
            const chunkText = codeContent.substring(currentChunkStart, currentChunkEnd)
            chunks.push(sanitizeCode(chunkText))

            currentChunkStart = child.startIndex
            currentChunkEnd = child.endIndex
            currentSize = nodeLength
        } else {
            if (currentSize === 0) {
                currentChunkStart = child.startIndex
            }

            currentChunkEnd = child.endIndex
            currentSize += (gap > 0 ? gap : 0) + nodeLength
        }
    }

    if (currentSize > 0) {
        const chunkText = codeContent.substring(currentChunkStart, currentChunkEnd)
        chunks.push(sanitizeCode(chunkText))
    }

    return chunks
}

const sanitizeCode = (text) => {
    return text.trim()
}

export const analyzeFile = (filePath, codeContent) => {
    const langConfig = detectLanguage(filePath)

    if (!langConfig) {
        const ext = path.extname(filePath).slice(1)
        console.warn(`Unsupported file type: .${ext} (${path.basename(filePath)})`)

        return {
            filePath,
            language: ext || "unknown",
            chunks: [codeContent],
            dependencies: [],
            lineCount: codeContent.split("\n").length,
            functions: [],
            calls: [],
            fullContent: codeContent,
        }
    }

    parser.setLanguage(langConfig.parser)
    const tree = parser.parse(codeContent)

    const chunks = chunkCode(codeContent, langConfig.name)
    const lineCount = codeContent.split("\n").length

    const dependencies = []

    try {
        const importQuery = new Parser.Query(langConfig.parser, langConfig.queries.imports)
        const captures = importQuery.captures(tree.rootNode)

        for (const capture of captures) {
            if (capture.name === "import_path") {
                const rawImportPath = capture.node.text.slice(1, -1) // Remove quotes
                const directoryOfCurrentFile = path.dirname(filePath)
                const absoluteTarget = path.resolve(directoryOfCurrentFile, rawImportPath)

                dependencies.push({
                    raw: rawImportPath,
                    targetAbsolutePath: absoluteTarget
                })
            }
        }
    } catch (error) {
        console.warn(`Failed to parse imports for ${path.basename(filePath)}:`, error.message)
    }

    const functions = []

    try {
        const functionQuery = new Parser.Query(langConfig.parser, langConfig.queries.functions)
        const functionCaptures = functionQuery.captures(tree.rootNode)

        functionCaptures.forEach(capture => {
            if (capture.name === "name") {
                functions.push({
                    name: capture.node.text,
                    line: capture.node.startPosition.row
                })
            }
        })
    } catch (error) {
        console.warn(`Failed to parse functions for ${path.basename(filePath)}:`, error.message)
    }

    const calls = []

    try {
        const callQuery = new Parser.Query(langConfig.parser, langConfig.queries.calls)
        const callCaptures = callQuery.captures(tree.rootNode)

        callCaptures.forEach(capture => {
            if (capture.name === "func_name") {
                calls.push({
                    name: capture.node.text,
                    line: capture.node.startPosition.row
                })
            }
        })
    } catch (error) {
        console.warn(`Failed to parse calls for ${path.basename(filePath)}:`, error.message)
    }

    return {
        filePath,
        language: langConfig.name,
        chunks,
        dependencies,
        lineCount,
        functions,
        calls,
        fullContent: codeContent
    }
}
