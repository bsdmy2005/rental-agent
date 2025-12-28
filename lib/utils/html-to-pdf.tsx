/**
 * Convert HTML directly to React-PDF components
 * Simple, reliable parser using node-html-parser
 */

import React from "react"
import { View, Text as PdfText } from "@react-pdf/renderer"
import { parse } from "node-html-parser"

interface RenderOptions {
  data?: Record<string, any>
  replaceVariables?: (text: string, data?: Record<string, any>) => string
  styles?: {
    listContainer?: any
    listItem?: any
    listBullet?: any
    listContent?: any
    paragraph?: any
  }
}

/**
 * Extract plain text from HTML node (excluding nested lists)
 */
function extractTextFromNode(node: any): string {
  if (node.nodeType === 3) {
    // Text node
    return node.rawText || ""
  }
  
  if (node.tagName?.toLowerCase() === "ul" || node.tagName?.toLowerCase() === "ol") {
    // Don't extract text from nested lists
    return ""
  }
  
  if (node.childNodes && node.childNodes.length > 0) {
    return node.childNodes
      .filter((child: any) => {
        // Skip nested lists
        return child.tagName?.toLowerCase() !== "ul" && child.tagName?.toLowerCase() !== "ol"
      })
      .map((child: any) => extractTextFromNode(child))
      .join("")
  }
  
  return ""
}

/**
 * Render HTML to React-PDF components
 */
export function renderHtmlToPdf(html: string, options: RenderOptions = {}): React.ReactNode[] {
  const { data = {}, replaceVariables, styles } = options

  if (!html || !html.trim()) {
    return []
  }

  try {
    const root = parse(html)
    const result: React.ReactNode[] = []

    /**
     * Render a list element (ul or ol) recursively
     */
    function renderList(listNode: any, depth: number = 0): React.ReactNode[] {
      const items: React.ReactNode[] = []
      const isOrdered = listNode.tagName?.toLowerCase() === "ol"
      const listItems = listNode.childNodes.filter((node: any) => node.tagName?.toLowerCase() === "li")

      listItems.forEach((li: any, index: number) => {
        // Separate text content from nested lists
        const textParts: string[] = []
        const nestedLists: any[] = []

        li.childNodes.forEach((child: any) => {
          const tagName = child.tagName?.toLowerCase()
          if (tagName === "ul" || tagName === "ol") {
            nestedLists.push(child)
          } else {
            const text = extractTextFromNode(child).trim()
            if (text) {
              textParts.push(text)
            }
          }
        })

        const itemText = textParts.join(" ").trim()
        const processedText = replaceVariables ? replaceVariables(itemText, data) : itemText

        if (processedText || nestedLists.length > 0) {
          // Render the list item with bullet/number and text on same line using flexDirection: "row"
          items.push(
            <View
              key={`li-${depth}-${index}`}
              style={{
                flexDirection: "row",
                alignItems: "flex-start",
                marginBottom: 4,
                paddingLeft: depth * 24
              }}
            >
              <PdfText style={{ width: 15, paddingRight: 8, fontSize: 10, flexShrink: 0 }}>
                {isOrdered ? `${index + 1}.` : "•"}
              </PdfText>
              {processedText && (
                <PdfText style={{ flex: 1, lineHeight: 1.5 }} wrap>
                  {processedText}
                </PdfText>
              )}
            </View>
          )

          // Render nested lists AFTER the parent item
          nestedLists.forEach((nestedList) => {
            const nestedItems = renderList(nestedList, depth + 1)
            items.push(...nestedItems)
          })
        }
      })

      return items
    }

    /**
     * Process all nodes in the HTML
     */
    function processNode(node: any): React.ReactNode[] {
      const nodes: React.ReactNode[] = []

      if (!node) return nodes

      if (node.nodeType === 3) {
        // Text node
        const text = node.rawText?.trim()
        if (text) {
          const processed = replaceVariables ? replaceVariables(text, data) : text
          if (processed) {
            nodes.push(
              <PdfText key={`text-${Math.random()}`} style={styles?.paragraph || { marginBottom: 8, lineHeight: 1.5 }} wrap>
                {processed}
              </PdfText>
            )
          }
        }
      } else if (node.tagName) {
        const tagName = node.tagName.toLowerCase()

        if (tagName === "ul" || tagName === "ol") {
          // List element
          const listItems = renderList(node, 0)
          if (listItems.length > 0) {
            nodes.push(
              <View key={`list-${Math.random()}`} style={styles?.listContainer || { marginBottom: 8 }}>
                {listItems}
              </View>
            )
          }
        } else if (tagName === "p") {
          // Paragraph
          const text = extractTextFromNode(node).trim()
          if (text) {
            const processed = replaceVariables ? replaceVariables(text, data) : text
            if (processed) {
              nodes.push(
                <PdfText key={`p-${Math.random()}`} style={styles?.paragraph || { marginBottom: 8, lineHeight: 1.5 }} wrap>
                  {processed}
                </PdfText>
              )
            }
          }
        } else {
          // Other elements - process children recursively
          node.childNodes?.forEach((child: any) => {
            nodes.push(...processNode(child))
          })
        }
      } else {
        // Process child nodes
        node.childNodes?.forEach((child: any) => {
          nodes.push(...processNode(child))
        })
      }

      return nodes
    }

    // Process root node
    root.childNodes.forEach((child: any) => {
      result.push(...processNode(child))
    })

    return result
  } catch (error) {
    console.warn("HTML to PDF rendering failed:", error)
    // Fallback: extract plain text
    const plainText = html
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, " ")
      .trim()

    const finalText = replaceVariables ? replaceVariables(plainText, data) : plainText

    return [
      <PdfText key="fallback" style={{ marginBottom: 8, lineHeight: 1.5 }} wrap>
        {finalText}
      </PdfText>
    ]
  }
}
