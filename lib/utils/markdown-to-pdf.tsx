/**
 * Convert Markdown AST to React-PDF components
 * Uses remark to parse Markdown and preserve indentation structure
 */

import { remark } from "remark"
import type { Root, List, ListItem } from "mdast"
import React from "react"
import { View, Text as PdfText } from "@react-pdf/renderer"

interface ListStyles {
  container: any
  item: any
  bullet: any
  content: any
  nested: any
}

interface RenderOptions {
  data?: Record<string, any>
  listStyles?: ListStyles
  replaceVariables?: (text: string, data?: Record<string, any>) => string
}

/**
 * Render Markdown AST nodes to React-PDF components
 */
export function renderMarkdownToPdf(
  markdown: string,
  options: RenderOptions = {}
): React.ReactNode[] {
  const { data = {}, listStyles, replaceVariables } = options

  // Parse Markdown to AST
  const processor = remark()
  const ast = processor.parse(markdown)

  const result: React.ReactNode[] = []

  function renderNode(node: any, depth: number = 0): React.ReactNode[] {
    const nodes: React.ReactNode[] = []

    switch (node.type) {
      case "root":
        node.children.forEach((child: any) => {
          nodes.push(...renderNode(child, depth))
        })
        break

      case "paragraph":
        const paraText = extractText(node)
        if (paraText.trim()) {
          const processedText = replaceVariables ? replaceVariables(paraText, data) : paraText
          nodes.push(
            <PdfText key={`para-${Math.random()}`} style={{ marginBottom: 8, lineHeight: 1.5 }}>
              {processedText}
            </PdfText>
          )
        }
        break

      case "list":
        nodes.push(renderList(node as List, depth, options))
        break

      case "listItem":
        // This shouldn't be called directly, but handle it
        const itemText = extractText(node)
        if (itemText.trim()) {
          const processedText = replaceVariables ? replaceVariables(itemText, data) : itemText
          nodes.push(
            <PdfText key={`item-${Math.random()}`} style={{ marginBottom: 4 }}>
              {processedText}
            </PdfText>
          )
        }
        break

      case "text":
        const textContent = replaceVariables ? replaceVariables(node.value, data) : node.value
        return [<React.Fragment key={`text-${Math.random()}`}>{textContent}</React.Fragment>]

      case "strong":
      case "emphasis":
        const strongText = extractText(node)
        const processedStrongText = replaceVariables ? replaceVariables(strongText, data) : strongText
        return [<React.Fragment key={`strong-${Math.random()}`}>{processedStrongText}</React.Fragment>]

      default:
        // For other node types, try to extract text
        if (node.children) {
          node.children.forEach((child: any) => {
            nodes.push(...renderNode(child, depth))
          })
        }
    }

    return nodes
  }

  ast.children.forEach((child) => {
    result.push(...renderNode(child, 0))
  })

  return result
}

/**
 * Render a list node with proper nesting
 */
function renderList(
  listNode: List,
  depth: number,
  options: RenderOptions
): React.ReactNode {
  const { data = {}, listStyles, replaceVariables } = options
  const isOrdered = listNode.ordered || false
  const paddingLeft = depth * 24 // 24 points per level

  const defaultStyles: ListStyles = {
    container: { marginBottom: 8 },
    item: {
      flexDirection: "row",
      marginBottom: 4,
      paddingLeft: paddingLeft,
      alignItems: "flex-start"
    },
    bullet: {
      width: 15,
      paddingRight: 8,
      fontSize: 10,
      flexShrink: 0
    },
    content: {
      flex: 1,
      lineHeight: 1.5,
      textAlign: "justify"
    },
    nested: {
      marginTop: 0
    }
  }

  const styles = listStyles || defaultStyles

  return (
    <View key={`list-${Math.random()}`} style={styles.container}>
      {listNode.children.map((item: ListItem, index: number) => {
        // Separate paragraph content from nested lists
        const paragraphs: any[] = []
        const nestedLists: any[] = []

        item.children.forEach((child: any) => {
          if (child.type === "paragraph") {
            paragraphs.push(child)
          } else if (child.type === "list") {
            nestedLists.push(child)
          }
        })

        // Extract text from paragraphs
        const itemText = paragraphs.map((p) => extractText(p)).join(" ").trim()
        const processedText = replaceVariables ? replaceVariables(itemText, data) : itemText

        return (
          <View key={`item-${index}`}>
            <View style={styles.item}>
              <PdfText style={styles.bullet}>
                {isOrdered ? `${index + 1}.` : "•"}
              </PdfText>
              <PdfText style={styles.content} wrap>
                {processedText}
              </PdfText>
            </View>
            {/* Render nested lists with increased depth */}
            {nestedLists.map((nestedList, nestedIndex) => (
              <View key={`nested-${nestedIndex}`}>
                {renderList(nestedList, depth + 1, options)}
              </View>
            ))}
          </View>
        )
      })}
    </View>
  )
}

/**
 * Extract plain text from a node
 */
function extractText(node: any): string {
  if (node.type === "text") {
    return node.value || ""
  }

  if (node.children && Array.isArray(node.children)) {
    return node.children.map((child: any) => extractText(child)).join("")
  }

  return ""
}

/**
 * Extract text from a list item, excluding nested lists
 */
function extractTextFromListItem(item: ListItem): string {
  const textParts: string[] = []

  item.children.forEach((child: any) => {
    if (child.type === "paragraph") {
      textParts.push(extractText(child))
    } else if (child.type === "text") {
      textParts.push(child.value || "")
    }
    // Skip nested lists - they'll be handled separately
  })

  return textParts.join(" ").trim()
}

