/**
 * Convert HTML directly to React-PDF components
 * Simple, reliable parser using node-html-parser
 */

import React from "react"
import { View, Text as PdfText, StyleSheet } from "@react-pdf/renderer"
import { parse, HTMLElement, Node } from "node-html-parser"

type PdfStyle = {
  [key: string]: string | number | undefined
}

interface RenderOptions {
  data?: Record<string, unknown>
  replaceVariables?: (text: string, data?: Record<string, unknown>) => string
  renderField?: (fieldId: string) => string
  renderSignature?: (signatureType: "tenant_signature" | "landlord_signature") => React.ReactNode
  styles?: {
    listContainer?: PdfStyle
    listItem?: PdfStyle
    listBullet?: PdfStyle
    listContent?: PdfStyle
    paragraph?: PdfStyle
  }
}

/**
 * Extract plain text from HTML node (excluding nested lists)
 */
function extractTextFromNode(node: HTMLElement | { nodeType: number; rawText?: string; tagName?: string; childNodes?: Array<HTMLElement | { nodeType: number; rawText?: string; tagName?: string }> }): string {
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
      .filter((child): child is HTMLElement | { nodeType: number; rawText?: string; tagName?: string; childNodes?: Array<HTMLElement | { nodeType: number; rawText?: string; tagName?: string }> } => {
        // Skip nested lists
        if ("tagName" in child && child.tagName) {
          return child.tagName.toLowerCase() !== "ul" && child.tagName.toLowerCase() !== "ol"
        }
        return true
      })
      .map((child) => extractTextFromNode(child))
      .join("")
  }
  
  return ""
}

/**
 * Render HTML to React-PDF components
 */
export function renderHtmlToPdf(html: string, options: RenderOptions = {}): React.ReactNode[] {
  const { data = {}, replaceVariables, renderField, renderSignature, styles } = options

  if (!html || !html.trim()) {
    return []
  }

  try {
    const root = parse(html)
    const result: React.ReactNode[] = []

    /**
     * Render inline content (text with formatting and fields) recursively
     */
    function renderInlineContent(node: HTMLElement | { nodeType: number; rawText?: string; tagName?: string; getAttribute?: (attr: string) => string | null; childNodes?: Array<HTMLElement | { nodeType: number; rawText?: string; tagName?: string; getAttribute?: (attr: string) => string | null }> }): React.ReactNode[] {
      const result: React.ReactNode[] = []

      if (!node) return result

      if (node.nodeType === 3) {
        // Text node
        const text = node.rawText || ""
        if (text) {
          const processed = replaceVariables ? replaceVariables(text, data) : text
          if (processed) {
            result.push(processed)
          }
        }
      } else if (node.tagName) {
        const tagName = node.tagName.toLowerCase()

        // Handle field placeholder
        if (tagName === "span" && node.getAttribute?.("data-field-id")) {
          const fieldId = node.getAttribute("data-field-id")
          if (fieldId && renderField) {
            const fieldValue = renderField(fieldId)
            if (fieldValue) {
              result.push(fieldValue)
            }
          }
          return result
        }

        // Handle signature placeholder
        if (tagName === "span" && node.getAttribute?.("data-signature-type")) {
          const signatureType = node.getAttribute("data-signature-type") as "tenant_signature" | "landlord_signature"
          if (signatureType && renderSignature) {
            const signatureComponent = renderSignature(signatureType)
            if (signatureComponent) {
              result.push(signatureComponent)
            }
          }
          return result
        }

        // Handle formatting tags
        let style: { fontWeight?: "bold" | "normal"; fontStyle?: "italic" | "normal" } = {}
        if (tagName === "strong" || tagName === "b") {
          style = { fontWeight: "bold" as const }
        } else if (tagName === "em" || tagName === "i") {
          style = { fontStyle: "italic" as const }
        }

        // Process children
        const children: React.ReactNode[] = []
        if (node.childNodes && node.childNodes.length > 0) {
          node.childNodes.forEach((child) => {
            children.push(...renderInlineContent(child))
          })
        }

        if (children.length > 0) {
          if (style.fontWeight || style.fontStyle) {
            // Apply formatting by wrapping in a styled Text component
            result.push(
              <PdfText key={`format-${Math.random()}`} style={style}>
                {children}
              </PdfText>
            )
          } else {
            // No formatting, just add children directly
            result.push(...children)
          }
        }
      } else if (node.childNodes && node.childNodes.length > 0) {
        // Process child nodes
        node.childNodes.forEach((child) => {
          result.push(...renderInlineContent(child))
        })
      }

      return result
    }

    /**
     * Render a list element (ul or ol) recursively
     */
    function renderList(listNode: HTMLElement | { tagName?: string; childNodes?: Array<HTMLElement | { tagName?: string; childNodes?: Array<HTMLElement | { tagName?: string }> }> }, depth: number = 0): React.ReactNode[] {
      const items: React.ReactNode[] = []
      const isOrdered = listNode.tagName?.toLowerCase() === "ol"
      const listItems = (listNode.childNodes || []).filter((node): node is HTMLElement | { tagName?: string; childNodes?: Array<HTMLElement | { tagName?: string }> } => {
        if ("tagName" in node && node.tagName) {
          return node.tagName.toLowerCase() === "li"
        }
        return false
      })

      listItems.forEach((li, index: number) => {
        // Separate formatted content from nested lists
        const contentNodes: React.ReactNode[] = []
        const nestedLists: Array<HTMLElement | { tagName?: string; childNodes?: Array<HTMLElement | { tagName?: string }> }> = []

        ;(li.childNodes || []).forEach((child) => {
          if ("tagName" in child && child.tagName) {
            const tagName = child.tagName.toLowerCase()
            if (tagName === "ul" || tagName === "ol") {
              nestedLists.push(child as HTMLElement | { tagName?: string; childNodes?: Array<HTMLElement | { tagName?: string }> })
            } else {
              // Use renderInlineContent to preserve formatting
              const inlineContent = renderInlineContent(child as HTMLElement | { nodeType: number; rawText?: string; tagName?: string; getAttribute?: (attr: string) => string | null; childNodes?: Array<HTMLElement | { nodeType: number; rawText?: string; tagName?: string; getAttribute?: (attr: string) => string | null }> })
              if (inlineContent.length > 0) {
                contentNodes.push(...inlineContent)
              }
            }
          } else {
            // Use renderInlineContent to preserve formatting
            const inlineContent = renderInlineContent(child as HTMLElement | { nodeType: number; rawText?: string; tagName?: string; getAttribute?: (attr: string) => string | null; childNodes?: Array<HTMLElement | { nodeType: number; rawText?: string; tagName?: string; getAttribute?: (attr: string) => string | null }> })
            if (inlineContent.length > 0) {
              contentNodes.push(...inlineContent)
            }
          }
        })

        if (contentNodes.length > 0 || nestedLists.length > 0) {
          // Render the list item with bullet/number and formatted content on same line
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
              {contentNodes.length > 0 && (
                <PdfText style={{ flex: 1, lineHeight: 1.5 }} wrap>
                  {contentNodes}
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
     * Render a paragraph with inline field placeholders and formatting
     */
    function renderParagraphWithFields(paragraphNode: HTMLElement | { nodeType: number; rawText?: string; tagName?: string; getAttribute?: (attr: string) => string | null; childNodes?: Array<HTMLElement | { nodeType: number; rawText?: string; tagName?: string; getAttribute?: (attr: string) => string | null }> }): React.ReactNode[] {
      const nodes: React.ReactNode[] = []

      // Render inline content (handles text, formatting, and fields)
      const inlineContent = renderInlineContent(paragraphNode)

      if (inlineContent.length > 0) {
        const paragraphStyle = styles?.paragraph || { marginBottom: 8, lineHeight: 1.5 }
        nodes.push(
          <PdfText key={`p-${Math.random()}`} style={paragraphStyle as any} wrap>
            {inlineContent}
          </PdfText>
        )
      }

      return nodes
    }

    /**
     * Process all nodes in the HTML
     */
    function processNode(node: HTMLElement | { nodeType: number; rawText?: string; tagName?: string; getAttribute?: (attr: string) => string | null; childNodes?: Array<HTMLElement | { nodeType: number; rawText?: string; tagName?: string; getAttribute?: (attr: string) => string | null }> }): React.ReactNode[] {
      const nodes: React.ReactNode[] = []

      if (!node) return nodes

        if (node.nodeType === 3) {
        // Text node
        const text = node.rawText?.trim()
        if (text) {
          const processed = replaceVariables ? replaceVariables(text, data) : text
          if (processed) {
            const textStyle = styles?.paragraph || { marginBottom: 8, lineHeight: 1.5 }
            nodes.push(
              <PdfText key={`text-${Math.random()}`} style={textStyle as any} wrap>
                {processed}
              </PdfText>
            )
          }
        }
      } else if (node.tagName) {
        const tagName = node.tagName.toLowerCase()

        // Check if this is a field placeholder
        if (tagName === "span" && node.getAttribute?.("data-field-id")) {
          const fieldId = node.getAttribute("data-field-id")
          if (fieldId && renderField) {
            const fieldValue = renderField(fieldId)
            if (fieldValue) {
              const fieldStyle = styles?.paragraph || { marginBottom: 8, lineHeight: 1.5 }
              nodes.push(
                <PdfText key={`field-${Math.random()}`} style={fieldStyle as any} wrap>
                  {fieldValue}
                </PdfText>
              )
            }
          }
          // Don't process children of field placeholders
          return nodes
        }

        if (tagName === "ul" || tagName === "ol") {
          // List element
          const listItems = renderList(node, 0)
          if (listItems.length > 0) {
            const listContainerStyle = styles?.listContainer || { marginBottom: 8 }
            nodes.push(
              <View key={`list-${Math.random()}`} style={listContainerStyle as any}>
                {listItems}
              </View>
            )
          }
        } else if (tagName === "p") {
          // Paragraph - need to handle inline field placeholders
          const paragraphNodes = renderParagraphWithFields(node)
          if (paragraphNodes.length > 0) {
            nodes.push(...paragraphNodes)
          }
        } else {
          // Other elements - process children recursively
          node.childNodes?.forEach((child) => {
            nodes.push(...processNode(child))
          })
        }
      } else {
        // Process child nodes
        node.childNodes?.forEach((child) => {
          nodes.push(...processNode(child))
        })
      }

      return nodes
    }

    // Process root node
    root.childNodes.forEach((child) => {
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
