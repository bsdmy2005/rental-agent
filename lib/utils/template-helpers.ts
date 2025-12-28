/**
 * Utility functions for lease template manipulation
 */

export interface TemplateSection {
  id: string
  type: "header" | "section" | "signatures"
  title: string
  subtitle?: string
  content?: string | string[]
  fields?: TemplateField[]
  subsections?: TemplateSubsection[]
  footer?: string
  order?: number
  pageBreakBefore?: boolean // Force section to start on a new page
}

export interface TemplateField {
  id: string
  label: string
  type: "text" | "number" | "currency" | "date" | "email" | "tel" | "textarea"
  required: boolean
  suffix?: string
  placeholder?: string
  defaultValue?: string
}

export interface TemplateSubsection {
  id: string
  title: string
  fields: TemplateField[]
}

export interface TemplateData {
  name: string
  sections: TemplateSection[]
}

/**
 * Generate a unique ID for sections/fields
 */
export function generateId(): string {
  return `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Add a new section to the template
 */
export function addSection(
  sections: TemplateSection[],
  type: "header" | "section" | "signatures",
  insertIndex?: number
): TemplateSection[] {
  const newSection: TemplateSection = {
    id: generateId(),
    type,
    title: type === "header" ? "RESIDENTIAL LEASE AGREEMENT" : type === "signatures" ? "SIGNATURES" : "New Section",
    subtitle: type === "header" ? "(South Africa)" : undefined,
    content: type === "section" ? ["Enter section content here..."] : undefined,
    fields: [],
    subsections: [],
    order: sections.length
  }

  if (insertIndex !== undefined && insertIndex >= 0 && insertIndex < sections.length) {
    const updated = [...sections]
    updated.splice(insertIndex, 0, newSection)
    return updated.map((s, i) => ({ ...s, order: i }))
  }

  return [...sections, newSection].map((s, i) => ({ ...s, order: i }))
}

/**
 * Remove a section from the template
 */
export function removeSection(sections: TemplateSection[], sectionId: string): TemplateSection[] {
  return sections
    .filter((s) => s.id !== sectionId)
    .map((s, i) => ({ ...s, order: i }))
}

/**
 * Duplicate a section
 */
export function duplicateSection(sections: TemplateSection[], sectionId: string): TemplateSection[] {
  const sectionIndex = sections.findIndex((s) => s.id === sectionId)
  if (sectionIndex === -1) return sections

  const section = sections[sectionIndex]
  const duplicated: TemplateSection = {
    ...section,
    id: generateId(),
    title: `${section.title} (Copy)`,
    order: section.order || sectionIndex
  }

  // Deep clone fields and subsections
  if (duplicated.fields) {
    duplicated.fields = duplicated.fields.map((f) => ({ ...f, id: generateId() }))
  }
  if (duplicated.subsections) {
    duplicated.subsections = duplicated.subsections.map((sub) => ({
      ...sub,
      id: generateId(),
      fields: sub.fields.map((f) => ({ ...f, id: generateId() }))
    }))
  }

  const updated = [...sections]
  updated.splice(sectionIndex + 1, 0, duplicated)
  return updated.map((s, i) => ({ ...s, order: i }))
}

/**
 * Reorder sections
 */
export function reorderSections(
  sections: TemplateSection[],
  sourceIndex: number,
  destinationIndex: number
): TemplateSection[] {
  const result = Array.from(sections)
  const [removed] = result.splice(sourceIndex, 1)
  result.splice(destinationIndex, 0, removed)
  return result.map((s, i) => ({ ...s, order: i }))
}

/**
 * Update a section
 */
export function updateSection(
  sections: TemplateSection[],
  sectionId: string,
  updates: Partial<TemplateSection>
): TemplateSection[] {
  return sections.map((s) => (s.id === sectionId ? { ...s, ...updates } : s))
}

/**
 * Add a field to a section or subsection
 */
export function addField(
  sections: TemplateSection[],
  sectionId: string,
  subsectionId?: string
): TemplateSection[] {
  return sections.map((section) => {
    if (section.id !== sectionId) return section

    const newField: TemplateField = {
      id: generateId(),
      label: "New Field",
      type: "text",
      required: false
    }

    if (subsectionId && section.subsections) {
      return {
        ...section,
        subsections: section.subsections.map((sub) =>
          sub.id === subsectionId
            ? { ...sub, fields: [...(sub.fields || []), newField] }
            : sub
        )
      }
    }

    return {
      ...section,
      fields: [...(section.fields || []), newField]
    }
  })
}

/**
 * Update a field
 */
export function updateField(
  sections: TemplateSection[],
  sectionId: string,
  fieldId: string,
  updates: Partial<TemplateField>,
  subsectionId?: string
): TemplateSection[] {
  return sections.map((section) => {
    if (section.id !== sectionId) return section

    if (subsectionId && section.subsections) {
      return {
        ...section,
        subsections: section.subsections.map((sub) =>
          sub.id === subsectionId
            ? {
                ...sub,
                fields: sub.fields.map((f) => (f.id === fieldId ? { ...f, ...updates } : f))
              }
            : sub
        )
      }
    }

    return {
      ...section,
      fields: (section.fields || []).map((f) => (f.id === fieldId ? { ...f, ...updates } : f))
    }
  })
}

/**
 * Remove a field
 */
export function removeField(
  sections: TemplateSection[],
  sectionId: string,
  fieldId: string,
  subsectionId?: string
): TemplateSection[] {
  return sections.map((section) => {
    if (section.id !== sectionId) return section

    if (subsectionId && section.subsections) {
      return {
        ...section,
        subsections: section.subsections.map((sub) =>
          sub.id === subsectionId
            ? {
                ...sub,
                fields: sub.fields.filter((f) => f.id !== fieldId)
              }
            : sub
        )
      }
    }

    return {
      ...section,
      fields: (section.fields || []).filter((f) => f.id !== fieldId)
    }
  })
}

/**
 * Add a subsection to a section
 */
export function addSubsection(sections: TemplateSection[], sectionId: string): TemplateSection[] {
  return sections.map((section) => {
    if (section.id !== sectionId) return section

    const newSubsection: TemplateSubsection = {
      id: generateId(),
      title: "New Subsection",
      fields: []
    }

    return {
      ...section,
      subsections: [...(section.subsections || []), newSubsection]
    }
  })
}

/**
 * Update a subsection
 */
export function updateSubsection(
  sections: TemplateSection[],
  sectionId: string,
  subsectionId: string,
  updates: Partial<TemplateSubsection>
): TemplateSection[] {
  return sections.map((section) => {
    if (section.id !== sectionId) return section

    return {
      ...section,
      subsections: (section.subsections || []).map((sub) =>
        sub.id === subsectionId ? { ...sub, ...updates } : sub
      )
    }
  })
}

/**
 * Remove a subsection
 */
export function removeSubsection(
  sections: TemplateSection[],
  sectionId: string,
  subsectionId: string
): TemplateSection[] {
  return sections.map((section) => {
    if (section.id !== sectionId) return section

    return {
      ...section,
      subsections: (section.subsections || []).filter((sub) => sub.id !== subsectionId)
    }
  })
}

/**
 * Validate template structure
 */
export function validateTemplate(template: TemplateData): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!template.name || template.name.trim() === "") {
    errors.push("Template name is required")
  }

  if (!template.sections || template.sections.length === 0) {
    errors.push("Template must have at least one section")
  }

  template.sections?.forEach((section, index) => {
    if (!section.id) {
      errors.push(`Section at index ${index} is missing an ID`)
    }
    if (!section.title || section.title.trim() === "") {
      errors.push(`Section "${section.id}" is missing a title`)
    }

    section.fields?.forEach((field, fieldIndex) => {
      if (!field.id) {
        errors.push(`Field at index ${fieldIndex} in section "${section.id}" is missing an ID`)
      }
      if (!field.label || field.label.trim() === "") {
        errors.push(`Field "${field.id}" in section "${section.id}" is missing a label`)
      }
    })

    section.subsections?.forEach((subsection, subIndex) => {
      if (!subsection.id) {
        errors.push(`Subsection at index ${subIndex} in section "${section.id}" is missing an ID`)
      }
      if (!subsection.title || subsection.title.trim() === "") {
        errors.push(`Subsection "${subsection.id}" in section "${section.id}" is missing a title`)
      }
    })
  })

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Convert content array to string (for rich text editor)
 */
export function contentToString(content: string | string[] | undefined): string {
  if (!content) return ""
  if (typeof content === "string") return content
  return content.join("\n\n")
}

/**
 * Convert string to content array (for storage)
 */
export function stringToContent(str: string): string[] {
  if (!str) return []
  return str.split("\n\n").filter((p) => p.trim() !== "")
}

