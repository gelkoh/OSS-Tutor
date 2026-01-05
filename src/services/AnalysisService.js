import Parser from "tree-sitter"
import JavaScript from "tree-sitter-javascript"
import path from "path"

// Singleton-Instanz des Parsers, damit wir ihn nicht ständig neu erstellen müssen
const parser = new Parser()
parser.setLanguage(JavaScript)

// Konfiguration
const MAX_CHUNK_SIZE = 1000 // In Zeichen (nicht exakte Token, aber gute Näherung)

/**
 * Analysiert den Code und gibt Chunks zurück.
 * Optimiert durch direkte String-Slicing Operationen statt Array-Loops.
 */
export const chunkCode = (codeContent) => {
    // Wenn die Datei leer ist, sofort zurück
    if (!codeContent || codeContent.trim().length === 0) return []

    const tree = parser.parse(codeContent)
    const chunks = []    

    // Wir nutzen einen Cursor, das ist oft performanter als children array Zugriff
    // Aber für Top-Level Chunking reicht die children-Iteration der rootNode
    const rootNode = tree.rootNode
    const childCount = rootNode.childCount

    // Falls die Datei extrem klein ist, einfach als ganzes zurückgeben
    if (codeContent.length <= MAX_CHUNK_SIZE) {
        return [sanitizeCode(codeContent)]
    }

    let currentChunkStart = 0
    let currentChunkEnd = 0
    let currentSize = 0

    for (let i = 0; i < childCount; i++) {
        const child = rootNode.child(i)
        
        // Die "Länge" des Nodes in Zeichen
        const nodeLength = child.endIndex - child.startIndex
        
        // Distanz zum vorherigen Node (um Kommentare/Whitespace zwischen Funktionen nicht zu verlieren)
        // Wenn child.startIndex > currentChunkEnd, gibt es eine Lücke (z.B. Newlines)
        const gap = child.startIndex - currentChunkEnd
        
        // Würde dieser Node das Fass zum Überlaufen bringen?
        if (currentSize + gap + nodeLength > MAX_CHUNK_SIZE && currentSize > 0) {
            // 1. Den aktuellen Chunk abschließen (Slice vom Start des Batches bis Ende des letzten Nodes)
            // Wir nehmen alles von currentChunkStart bis zum Ende des VORHERIGEN Nodes
            // (oder bis child.startIndex, um Whitespace noch mitzunehmen, Geschmackssache)
            const chunkText = codeContent.substring(currentChunkStart, currentChunkEnd)
            chunks.push(sanitizeCode(chunkText))

            // 2. Reset für neuen Chunk
            currentChunkStart = child.startIndex
            currentChunkEnd = child.endIndex
            currentSize = nodeLength
        } else {
            // Node passt noch rein -> Erweitere den aktuellen Bereich
            // Wenn dies der erste Node im Chunk ist, setze Start
            if (currentSize === 0) {
                currentChunkStart = child.startIndex
            }
            
            // Ende verschiebt sich immer zum Ende des aktuellen Nodes
            currentChunkEnd = child.endIndex
            
            // Größe addieren (inklusive Lücke zum Vorgänger)
            currentSize += (gap > 0 ? gap : 0) + nodeLength
        }
    }

    // Den letzten verbleibenden Rest noch hinzufügen
    if (currentSize > 0) {
        const chunkText = codeContent.substring(currentChunkStart, currentChunkEnd)
        chunks.push(sanitizeCode(chunkText))
    }

    return chunks
}

/**
 * Hilfsfunktion zum Bereinigen von Whitespace.
 * Ausgelagert, falls man das später ändern will.
 */
const sanitizeCode = (text) => {
    // Ersetzt multiple Leerzeichen/Tabs durch ein einzelnes Leerzeichen
    // und entfernt führende/abschließende Leerzeichen.
    return text.replace(/[\t ]+/g, " ").trim()
}



const functionQuery = new Parser.Query(JavaScript, `
  (function_declaration name: (identifier) @name) @def
  (variable_declarator 
    name: (identifier) @name 
    value: [(arrow_function) (function_expression)]
  ) @def
  (method_definition name: (property_identifier) @name) @def
`)

// Query, um Imports zu finden
const importQuery = new Parser.Query(JavaScript, `
  (import_statement source: (string) @import_path)
  (call_expression
    function: (identifier) @func_name
    arguments: (arguments (string) @import_path)
    (#eq? @func_name "require"))
`)

// FUNCTION CALLS
const callQuery = new Parser.Query(JavaScript, `
    (call_expression
        function: (identifier) @func_name
    ) @call
`)


export const analyzeFile = (filePath, codeContent) => {
    const tree = parser.parse(codeContent)
    
    // 1. Chunking (Deine bestehende Logik - hier gekürzt)
    // const chunks = performChunking(tree, codeContent) ...
    const chunks = chunkCode(codeContent)

    const lineCount = codeContent.split('\n').length
    //console.log(lineCount)

    // 2. Dependencies finden (Für die Pfeile)
    const dependencies = []
    const captures = importQuery.captures(tree.rootNode)

    for (const capture of captures) {
        // Entferne Anführungszeichen vom Import-Pfad
        const rawImportPath = capture.node.text.slice(1, -1)
        
        // Versuche, den absoluten Pfad der importierten Datei zu erraten
        // Das ist wichtig, um die Node-ID der Ziel-Datei zu finden
        const directoryOfCurrentFile = path.dirname(filePath)
        const absoluteTarget = path.resolve(directoryOfCurrentFile, rawImportPath)
        
        dependencies.push({
            raw: rawImportPath,
            targetAbsolutePath: absoluteTarget // Wir speichern das für später
        })
    }

    // 3. Funktionen finden (Optional, für File-Details)
    // Hier könnte man noch nach function_declaration suchen

    //console.log("CHUNKS FROM ANALYSIS SERVICE: ", chunks)
    // 3. Funktionen extrahieren (NEU!)
    const functions = []
    const functionCaptures = functionQuery.captures(tree.rootNode)
    
    // Wir filtern nur die '@name' captures, um Duplikate zu vermeiden
    functionCaptures.forEach(capture => {
        if (capture.name === 'name') {
            functions.push({
                name: capture.node.text,
                // Tree-sitter ist 0-basiert, deine CSS-Logik erwartet das auch
                line: capture.node.startPosition.row 
            })
        }
    })

    // FUNCTION CALLS
    const calls = []
    const callCaptures = callQuery.captures(tree.rootNode)

    callCaptures.forEach(capture => {
        if (capture.name === 'func_name') {
            calls.push({
                name: capture.node.text, // z.B. "add"
                line: capture.node.startPosition.row 
            })
        }
    })

    console.log(calls)

    return {
        filePath,
        language: "js",
        chunks,
        dependencies,
        lineCount: lineCount,
        functions,
        calls
    }
}
