/**
 * Convert HTML to Markdown
 * Handles lists, paragraphs, bold, italic, and basic formatting
 */
export function htmlToMarkdown(html: string): string {
  if (!html) return ""
  
  let markdown = html
  
  // Simplified recursive approach: process innermost lists first
  function processListHtml(html: string, indentLevel: number = 0): string {
    const indent = "  ".repeat(indentLevel)
    let result = html
    
    // Helper to clean HTML and extract text
    function cleanHtml(html: string): string {
      return html
        .replace(/<p[^>]*>/gi, "")
        .replace(/<\/p>/gi, " ")
        .replace(/<br\s*\/?>/gi, " ")
        .replace(/<strong[^>]*>/gi, "**")
        .replace(/<\/strong>/gi, "**")
        .replace(/<b[^>]*>/gi, "**")
        .replace(/<\/b>/gi, "**")
        .replace(/<em[^>]*>/gi, "*")
        .replace(/<\/em>/gi, "*")
        .replace(/<i[^>]*>/gi, "*")
        .replace(/<\/i>/gi, "*")
        .replace(/<[^>]*>/g, "")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .trim()
    }
    
    // Find and process innermost lists (those without nested lists)
    let changed = true
    let iterations = 0
    const maxIterations = 50 // Prevent infinite loops
    
    while (changed && iterations < maxIterations) {
      changed = false
      iterations++
      
      // Find lists that don't contain other lists
      const listPattern = /<(ul|ol)[^>]*>([\s\S]*?)<\/\1>/gi
      const replacements: Array<{ start: number; end: number; replacement: string }> = []
      listPattern.lastIndex = 0
      
      let match
      while ((match = listPattern.exec(result)) !== null) {
        const listContent = match[2]
        const listTag = match[1].toLowerCase()
        
        // Check if this list contains nested lists
        if (!/<(ul|ol)[^>]*>/i.test(listContent)) {
          // This is an innermost list - convert it
          const items = listContent.match(/<li[^>]*>([\s\S]*?)<\/li>/gi) || []
          const markdownItems: string[] = []
          
          items.forEach((item: string, idx: number) => {
            // Extract content, removing li tags
            let itemContent = item.replace(/<li[^>]*>|<\/li>/gi, "")
            
            // Clean HTML and get text
            const textContent = cleanHtml(itemContent)
            
            if (textContent) {
              if (listTag === "ol") {
                markdownItems.push(`${indent}${idx + 1}. ${textContent}`)
              } else {
                markdownItems.push(`${indent}- ${textContent}`)
              }
            }
          })
          
          if (markdownItems.length > 0) {
            replacements.push({
              start: match.index!,
              end: match.index! + match[0].length,
              replacement: markdownItems.join("\n")
            })
          }
        }
      }
      
      // Apply replacements in reverse order
      for (let i = replacements.length - 1; i >= 0; i--) {
        const rep = replacements[i]
        result = result.substring(0, rep.start) + rep.replacement + result.substring(rep.end)
        changed = true
      }
    }
    
    return result
  }
  
  // Process lists first
  markdown = processListHtml(markdown)
  
  // Process headings
  markdown = markdown.replace(/<h1[^>]*>(.*?)<\/h1>/gi, "# $1\n\n")
  markdown = markdown.replace(/<h2[^>]*>(.*?)<\/h2>/gi, "## $1\n\n")
  markdown = markdown.replace(/<h3[^>]*>(.*?)<\/h3>/gi, "### $1\n\n")
  
  // Process bold and italic
  markdown = markdown.replace(/<strong[^>]*>(.*?)<\/strong>/gi, "**$1**")
  markdown = markdown.replace(/<b[^>]*>(.*?)<\/b>/gi, "**$1**")
  markdown = markdown.replace(/<em[^>]*>(.*?)<\/em>/gi, "*$1*")
  markdown = markdown.replace(/<i[^>]*>(.*?)<\/i>/gi, "*$1*")
  
  // Process paragraphs
  markdown = markdown.replace(/<p[^>]*>(.*?)<\/p>/gi, "$1\n\n")
  
  // Process line breaks
  markdown = markdown.replace(/<br\s*\/?>/gi, "\n")
  
  // Remove remaining HTML tags
  markdown = markdown.replace(/<[^>]*>/g, "")
  
  // Decode HTML entities
  markdown = markdown
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
  
  // Normalize whitespace
  markdown = markdown.replace(/\n{3,}/g, "\n\n").trim()
  
  return markdown
}

/**
 * Convert Markdown to HTML
 * Handles lists, paragraphs, bold, italic, and basic formatting
 */
export function markdownToHtml(markdown: string): string {
  if (!markdown) return ""
  
  let html = markdown
  
  // Process code blocks first (to avoid processing inside them)
  const codeBlocks: string[] = []
  html = html.replace(/```[\s\S]*?```/g, (match) => {
    const index = codeBlocks.length
    codeBlocks.push(match)
    return `__CODE_BLOCK_${index}__`
  })
  
  // Process inline code
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>")
  
  // Process headings
  html = html.replace(/^### (.*)$/gm, "<h3>$1</h3>")
  html = html.replace(/^## (.*)$/gm, "<h2>$1</h2>")
  html = html.replace(/^# (.*)$/gm, "<h1>$1</h1>")
  
  // Process bold and italic
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>")
  
  // Process lists with proper nesting support
  interface ListItemNode {
    content: string
    level: number
    type: "bullet" | "ordered"
    number?: number
  }
  
  const lines = html.split("\n")
  const result: string[] = []
  let currentListItems: ListItemNode[] = []
  
  // Build nested HTML structure from list items
  function buildNestedListHtml(items: ListItemNode[]): string {
    if (items.length === 0) return ""
    
    interface TreeNode {
      content: string
      type: "bullet" | "ordered"
      number?: number
      children: TreeNode[]
    }
    
    const root: TreeNode[] = []
    const stack: TreeNode[] = []
    
    items.forEach(item => {
      const node: TreeNode = {
        content: item.content,
        type: item.type,
        number: item.number,
        children: []
      }
      
      // Pop stack until we find the parent level
      while (stack.length > item.level) {
        stack.pop()
      }
      
      // Add to parent or root
      if (stack.length === 0) {
        root.push(node)
      } else {
        const parent = stack[stack.length - 1]
        parent.children.push(node)
      }
      
      // Push this node onto stack for potential children
      stack.push(node)
    })
    
    // Render tree to HTML recursively
    function renderNode(node: TreeNode): string {
      const childrenHtml = node.children.length > 0
        ? node.children.map(renderNode).join("")
        : ""
      
      // Determine list tag for children (use first child's type, or default to bullet)
      const childrenType = node.children.length > 0 ? node.children[0].type : "bullet"
      const listTag = childrenType === "ordered" ? "ol" : "ul"
      
      return `<li>${node.content}${childrenHtml ? `<${listTag}>${childrenHtml}</${listTag}>` : ""}</li>`
    }
    
    // Group consecutive items of the same type at root level
    const groups: Array<{ type: "bullet" | "ordered"; nodes: TreeNode[] }> = []
    let currentGroup: { type: "bullet" | "ordered"; nodes: TreeNode[] } | null = null
    
    root.forEach(node => {
      if (!currentGroup || currentGroup.type !== node.type) {
        if (currentGroup) groups.push(currentGroup)
        currentGroup = { type: node.type, nodes: [node] }
      } else {
        currentGroup.nodes.push(node)
      }
    })
    if (currentGroup) groups.push(currentGroup)
    
    return groups.map(group => {
      const listTag = group.type === "ordered" ? "ol" : "ul"
      const itemsHtml = group.nodes.map(renderNode).join("")
      return `<${listTag}>${itemsHtml}</${listTag}>`
    }).join("")
  }
  
  // Process lines and build lists
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()
    
    if (!trimmed) {
      // Empty line - flush current list if any
      if (currentListItems.length > 0) {
        result.push(buildNestedListHtml(currentListItems))
        currentListItems = []
      }
      result.push("")
      continue
    }
    
    // Check for ordered list item
    const orderedMatch = line.match(/^(\s*)(\d+)\.\s+(.+)$/)
    // Check for unordered list item
    const unorderedMatch = line.match(/^(\s*)([-*•])\s+(.+)$/)
    
    if (orderedMatch) {
      const indent = orderedMatch[1].length
      const level = Math.floor(indent / 2) // 2 spaces per level
      const number = parseInt(orderedMatch[2])
      const content = orderedMatch[3]
      currentListItems.push({ content, level, type: "ordered", number })
    } else if (unorderedMatch) {
      const indent = unorderedMatch[1].length
      const level = Math.floor(indent / 2) // 2 spaces per level
      const content = unorderedMatch[3]
      currentListItems.push({ content, level, type: "bullet" })
    } else {
      // Non-list line - flush current list if any
      if (currentListItems.length > 0) {
        result.push(buildNestedListHtml(currentListItems))
        currentListItems = []
      }
      result.push(line)
    }
  }
  
  // Flush any remaining list
  if (currentListItems.length > 0) {
    result.push(buildNestedListHtml(currentListItems))
  }
  
  html = result.join("\n")
  
  // Process paragraphs (lines that aren't already in HTML tags)
  html = html.split("\n\n").map(para => {
    const trimmed = para.trim()
    if (!trimmed) return ""
    // Don't wrap if already in HTML tags
    if (trimmed.startsWith("<") && trimmed.endsWith(">")) {
      return trimmed
    }
    return `<p>${trimmed}</p>`
  }).join("\n")
  
  // Process line breaks
  html = html.replace(/\n/g, "<br>")
  
  // Restore code blocks
  codeBlocks.forEach((block, index) => {
    html = html.replace(`__CODE_BLOCK_${index}__`, block)
  })
  
  // Encode HTML entities
  html = html
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    // But preserve HTML tags we created
    .replace(/&lt;(\/?)([a-z]+[^&]*)&gt;/gi, "<$1$2>")
  
  return html
}

