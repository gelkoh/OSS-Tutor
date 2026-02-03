import fs from "fs/promises"
import path from "path"

export const getAllCodeFiles = async (dirPath) => {
    const filePaths = []

    const EXCLUDED_DIRS = new Set([
        "node_modules",
        ".git",
        ".vscode",
        ".idea",
        "dist",
        "build",
        "coverage",
        ".next",
        ".nuxt"
    ])

    const EXCLUDED_FILES = new Set([
        ".DS_Store",
        "Thumbs.db",
        ".gitkeep",
        "package.json",
        "package-lock.json"
    ])

    async function traverse(currentPath) {
        try {
            const entries = await fs.readdir(currentPath, { withFileTypes: true })

            for (const entry of entries) {
                const fullPath = path.join(currentPath, entry.name)

                // Skip excluded files
                if (EXCLUDED_FILES.has(entry.name)) {
                    continue
                }

                if (entry.isDirectory()) {
                    // Skip excluded directories
                    if (EXCLUDED_DIRS.has(entry.name)) {
                        continue
                    }

                    // Recursively traverse subdirectories
                    await traverse(fullPath)
                } else if (entry.isFile()) {
                    filePaths.push(fullPath)
                }
            }
        } catch (error) {
            console.warn(`Could not read directory ${currentPath}:`, error.message)
        }
    }

    await traverse(dirPath)

    return filePaths
}
