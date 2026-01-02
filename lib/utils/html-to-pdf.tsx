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
  renderField?: (fieldId: string) => string
  renderSignature?: (signatureType: "tenant_signature" | "landlord_signature") => React.ReactNode
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
    function renderInlineContent(node: any): React.ReactNode[] {
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
        let style: any = {}
        if (tagName === "strong" || tagName === "b") {
          style = { fontWeight: "bold" }
        } else if (tagName === "em" || tagName === "i") {
          style = { fontStyle: "italic" }
        }

        // Process children
        const children: React.ReactNode[] = []
        if (node.childNodes && node.childNodes.length > 0) {
          node.childNodes.forEach((child: any) => {
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
        node.childNodes.forEach((child: any) => {
          result.push(...renderInlineContent(child))
        })
      }

      return result
    }

    /**
     * Render a list element (ul or ol) recursively
     */
    function renderList(listNode: any, depth: number = 0): React.ReactNode[] {
      const items: React.ReactNode[] = []
      const isOrdered = listNode.tagName?.toLowerCase() === "ol"
      const listItems = listNode.childNodes.filter((node: any) => node.tagName?.toLowerCase() === "li")

      listItems.forEach((li: any, index: number) => {
        // Separate formatted content from nested lists
        const contentNodes: React.ReactNode[] = []
        const nestedLists: any[] = []

        li.childNodes.forEach((child: any) => {
          const tagName = child.tagName?.toLowerCase()
          if (tagName === "ul" || tagName === "ol") {
            nestedLists.push(child)
          } else {
            // Use renderInlineContent to preserve formatting
            const inlineContent = renderInlineContent(child)
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
    function renderParagraphWithFields(paragraphNode: any): React.ReactNode[] {
      const nodes: React.ReactNode[] = []

      // Render inline content (handles text, formatting, and fields)
      const inlineContent = renderInlineContent(paragraphNode)

      if (inlineContent.length > 0) {
        nodes.push(
          <PdfText key={`p-${Math.random()}`} style={styles?.paragraph || { marginBottom: 8, lineHeight: 1.5 }} wrap>
            {inlineContent}
          </PdfText>
        )
      }

      return nodes
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

        // Check if this is a field placeholder
        if (tagName === "span" && node.getAttribute?.("data-field-id")) {
          const fieldId = node.getAttribute("data-field-id")
          if (fieldId && renderField) {
            const fieldValue = renderField(fieldId)
            if (fieldValue) {
              nodes.push(
                <PdfText key={`field-${Math.random()}`} style={styles?.paragraph || { marginBottom: 8, lineHeight: 1.5 }} wrap>
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
            nodes.push(
              <View key={`list-${Math.random()}`} style={styles?.listContainer || { marginBottom: 8 }}>
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
