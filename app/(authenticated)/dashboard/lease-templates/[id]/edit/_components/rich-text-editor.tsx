"use client"

import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Placeholder from "@tiptap/extension-placeholder"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Bold, Italic, List, ListOrdered, Undo, Redo, Code } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { htmlToMarkdown, markdownToHtml } from "@/lib/utils/markdown-converter"

interface RichTextEditorProps {
  content: string
  onChange: (content: string) => void
  placeholder?: string
  className?: string
}

export function RichTextEditor({
  content,
  onChange,
  placeholder = "Enter content...",
  className = ""
}: RichTextEditorProps) {
  const [editorMode, setEditorMode] = useState<"rich" | "markdown">("rich")
  const [markdownContent, setMarkdownContent] = useState("")
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3]
        }
      }),
      Placeholder.configure({
        placeholder
      })
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-none min-h-[200px] p-4"
      }
    }
  })

  // Convert content when switching modes
  useEffect(() => {
    if (editorMode === "rich") {
      // Switching to rich text - convert Markdown to HTML
      if (markdownContent && editor) {
        const html = markdownToHtml(markdownContent)
        editor.commands.setContent(html)
        onChange(html)
      }
    } else {
      // Switching to Markdown - convert HTML to Markdown
      if (content && editor) {
        const html = editor.getHTML()
        const markdown = htmlToMarkdown(html)
        setMarkdownContent(markdown)
      }
    }
  }, [editorMode]) // Only run when mode changes

  // Update editor content when prop changes (only in rich mode)
  useEffect(() => {
    if (editor && editorMode === "rich" && content !== editor.getHTML()) {
      editor.commands.setContent(content)
    }
  }, [content, editor, editorMode])

  // Handle Markdown content changes
  const handleMarkdownChange = useCallback((value: string) => {
    setMarkdownContent(value)
    // Convert to HTML and notify parent
    const html = markdownToHtml(value)
    onChange(html)
  }, [onChange])

  const toggleBold = useCallback(() => {
    editor?.chain().focus().toggleBold().run()
  }, [editor])

  const toggleItalic = useCallback(() => {
    editor?.chain().focus().toggleItalic().run()
  }, [editor])

  const toggleBulletList = useCallback(() => {
    editor?.chain().focus().toggleBulletList().run()
  }, [editor])

  const toggleOrderedList = useCallback(() => {
    editor?.chain().focus().toggleOrderedList().run()
  }, [editor])

  const undo = useCallback(() => {
    editor?.chain().focus().undo().run()
  }, [editor])

  const redo = useCallback(() => {
    editor?.chain().focus().redo().run()
  }, [editor])

  const insertVariable = useCallback(
    (variable: string) => {
      if (editorMode === "rich") {
        editor?.chain().focus().insertContent(`{{${variable}}}`).run()
      } else {
        // Insert in Markdown mode
        const textarea = document.querySelector(`textarea[data-markdown-editor]`) as HTMLTextAreaElement
        if (textarea) {
          const start = textarea.selectionStart
          const end = textarea.selectionEnd
          const text = markdownContent
          const before = text.substring(0, start)
          const after = text.substring(end)
          const newText = `${before}{{${variable}}}${after}`
          setMarkdownContent(newText)
          handleMarkdownChange(newText)
          // Restore cursor position
          setTimeout(() => {
            textarea.focus()
            textarea.setSelectionRange(start + variable.length + 4, start + variable.length + 4)
          }, 0)
        }
      }
    },
    [editor, editorMode, markdownContent, handleMarkdownChange]
  )

  const toggleMode = useCallback(() => {
    setEditorMode(prev => prev === "rich" ? "markdown" : "rich")
  }, [])

  if (!editor && editorMode === "rich") {
    return null
  }

  return (
    <div className={`border rounded-lg ${className}`}>
      <div className="flex items-center gap-1 p-2 border-b bg-muted/50">
        {/* Mode Toggle */}
        <div className="flex items-center gap-2 mr-2">
          <Label htmlFor="editor-mode" className="text-xs text-muted-foreground">
            Mode:
          </Label>
          <div className="flex items-center gap-1 border rounded-md p-0.5">
            <Button
              type="button"
              variant={editorMode === "rich" ? "default" : "ghost"}
              size="sm"
              onClick={() => setEditorMode("rich")}
              className="h-7 px-2 text-xs"
            >
              Rich Text
            </Button>
            <Button
              type="button"
              variant={editorMode === "markdown" ? "default" : "ghost"}
              size="sm"
              onClick={() => setEditorMode("markdown")}
              className="h-7 px-2 text-xs"
            >
              <Code className="h-3 w-3 mr-1" />
              Markdown
            </Button>
          </div>
        </div>
        <div className="w-px h-6 bg-border mx-1" />
        {editorMode === "rich" && (
          <>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={toggleBold}
              className={editor?.isActive("bold") ? "bg-accent" : ""}
            >
              <Bold className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={toggleItalic}
              className={editor?.isActive("italic") ? "bg-accent" : ""}
            >
              <Italic className="h-4 w-4" />
            </Button>
            <div className="w-px h-6 bg-border mx-1" />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={toggleBulletList}
              className={editor?.isActive("bulletList") ? "bg-accent" : ""}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={toggleOrderedList}
              className={editor?.isActive("orderedList") ? "bg-accent" : ""}
            >
              <ListOrdered className="h-4 w-4" />
            </Button>
            <div className="w-px h-6 bg-border mx-1" />
            <Button type="button" variant="ghost" size="sm" onClick={undo} disabled={!editor?.can().undo()}>
              <Undo className="h-4 w-4" />
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={redo} disabled={!editor?.can().redo()}>
              <Redo className="h-4 w-4" />
            </Button>
          </>
        )}
        <div className="flex-1" />
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <span>Variables:</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={() => insertVariable("tenant_name")}
          >
            tenant_name
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={() => insertVariable("property_address")}
          >
            property_address
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={() => insertVariable("monthly_rental")}
          >
            monthly_rental
          </Button>
        </div>
      </div>
      {editorMode === "rich" ? (
        <div className="min-h-[200px] p-4">
          <EditorContent editor={editor} />
        </div>
      ) : (
        <div className="min-h-[200px] p-4">
          <Textarea
            data-markdown-editor
            value={markdownContent}
            onChange={(e) => handleMarkdownChange(e.target.value)}
            placeholder={placeholder}
            className="min-h-[200px] font-mono text-sm resize-none"
          />
          <div className="mt-2 text-xs text-muted-foreground">
            <p className="mb-1 font-medium">Markdown syntax:</p>
            <ul className="list-disc list-inside space-y-0.5 ml-2">
              <li><code className="bg-muted px-1 rounded">- item</code> or <code className="bg-muted px-1 rounded">* item</code> for bullet lists</li>
              <li><code className="bg-muted px-1 rounded">1. item</code> for ordered lists</li>
              <li><code className="bg-muted px-1 rounded">  - nested</code> (2 spaces) for 1 level nested</li>
              <li><code className="bg-muted px-1 rounded">    - deeper</code> (4 spaces) for 2 levels nested</li>
              <li><code className="bg-muted px-1 rounded">      - even deeper</code> (6 spaces) for 3+ levels</li>
              <li><code className="bg-muted px-1 rounded">**bold**</code> for bold text</li>
              <li><code className="bg-muted px-1 rounded">*italic*</code> for italic text</li>
            </ul>
            <p className="mt-2 text-xs italic">Tip: Use 2 spaces per nesting level for proper indentation</p>
          </div>
        </div>
      )}
      <style jsx global>{`
        .ProseMirror {
          outline: none;
          min-height: 200px;
        }
        .ProseMirror p {
          margin: 0.5em 0;
        }
        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #adb5bd;
          pointer-events: none;
          height: 0;
        }
        .ProseMirror ul,
        .ProseMirror ol {
          padding-left: 1.5em;
          margin: 0.5em 0;
        }
        .ProseMirror ul {
          list-style-type: disc;
        }
        .ProseMirror ol {
          list-style-type: decimal;
        }
        .ProseMirror strong {
          font-weight: 600;
        }
        .ProseMirror em {
          font-style: italic;
        }
      `}</style>
    </div>
  )
}

