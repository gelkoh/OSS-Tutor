const iconMap = new Map([
    ["ts", "typescript"],
    ["js", "javascript"],
    ["html", "html5"],
    ["json", "json"],
    ["css", "css3"],
    ["vue", "vuejs"],
    ["md", "markdown"],
    ["py", "python"],
    ["jsx", "react"]
])

export function useFileIcons() {
    const getIconClass = (extension, isColored) => {
        const iconName = iconMap.get(extension)

        if (iconName !== undefined) {
            if (isColored) {
                return `devicon-${iconName}-plain colored`
            } else {
                return `devicon-${iconName}-plain`
            }
        }

        return null
    }

    return { getIconClass }
}
