"use server"

import { db } from "@/db"
import {
  expensesTable,
  expenseCategoriesTable,
  expenseAttachmentsTable,
  depreciationRecordsTable,
  type InsertExpense,
  type SelectExpense,
  type InsertExpenseCategory,
  type SelectExpenseCategory,
  type InsertExpenseAttachment,
  type SelectExpenseAttachment,
  type InsertDepreciationRecord,
  type SelectDepreciationRecord
} from "@/db/schema"
import { ActionState } from "@/types"
import { eq, and, desc, gte, lte } from "drizzle-orm"

// Expense CRUD Operations

export async function createExpenseAction(
  expense: InsertExpense
): Promise<ActionState<SelectExpense>> {
  try {
    const [newExpense] = await db.insert(expensesTable).values(expense).returning()

    if (!newExpense) {
      return { isSuccess: false, message: "Failed to create expense" }
    }

    return {
      isSuccess: true,
      message: "Expense created successfully",
      data: newExpense
    }
  } catch (error) {
    console.error("Error creating expense:", error)
    return { isSuccess: false, message: "Failed to create expense" }
  }
}

export async function getExpensesByPropertyIdAction(
  propertyId: string,
  filters?: {
    startDate?: Date
    endDate?: Date
    categoryId?: string
    taxYear?: number
  }
): Promise<ActionState<SelectExpense[]>> {
  try {
    const conditions = [eq(expensesTable.propertyId, propertyId)]

    if (filters?.startDate) {
      conditions.push(gte(expensesTable.expenseDate, filters.startDate))
    }
    if (filters?.endDate) {
      conditions.push(lte(expensesTable.expenseDate, filters.endDate))
    }
    if (filters?.categoryId) {
      conditions.push(eq(expensesTable.categoryId, filters.categoryId))
    }
    if (filters?.taxYear) {
      conditions.push(eq(expensesTable.taxYear, filters.taxYear))
    }

    const expenses = await db
      .select()
      .from(expensesTable)
      .where(and(...conditions))
      .orderBy(desc(expensesTable.expenseDate))

    return {
      isSuccess: true,
      message: "Expenses retrieved successfully",
      data: expenses
    }
  } catch (error) {
    console.error("Error getting expenses:", error)
    return { isSuccess: false, message: "Failed to get expenses" }
  }
}

export async function updateExpenseAction(
  expenseId: string,
  data: Partial<InsertExpense>
): Promise<ActionState<SelectExpense>> {
  try {
    const [updatedExpense] = await db
      .update(expensesTable)
      .set(data)
      .where(eq(expensesTable.id, expenseId))
      .returning()

    if (!updatedExpense) {
      return { isSuccess: false, message: "Expense not found" }
    }

    return {
      isSuccess: true,
      message: "Expense updated successfully",
      data: updatedExpense
    }
  } catch (error) {
    console.error("Error updating expense:", error)
    return { isSuccess: false, message: "Failed to update expense" }
  }
}

export async function deleteExpenseAction(expenseId: string): Promise<ActionState<void>> {
  try {
    // Attachments will be cascade deleted
    await db.delete(expensesTable).where(eq(expensesTable.id, expenseId))

    return {
      isSuccess: true,
      message: "Expense deleted successfully",
      data: undefined
    }
  } catch (error) {
    console.error("Error deleting expense:", error)
    return { isSuccess: false, message: "Failed to delete expense" }
  }
}

// Expense Category Operations

export async function createExpenseCategoryAction(
  category: InsertExpenseCategory
): Promise<ActionState<SelectExpenseCategory>> {
  try {
    const [newCategory] = await db.insert(expenseCategoriesTable).values(category).returning()

    if (!newCategory) {
      return { isSuccess: false, message: "Failed to create expense category" }
    }

    return {
      isSuccess: true,
      message: "Expense category created successfully",
      data: newCategory
    }
  } catch (error) {
    console.error("Error creating expense category:", error)
    return { isSuccess: false, message: "Failed to create expense category" }
  }
}

export async function getExpenseCategoriesAction(
  userId?: string
): Promise<ActionState<SelectExpenseCategory[]>> {
  try {
    // Get all standard categories (userId is null for standard categories)
    const standardCategories = await db
      .select()
      .from(expenseCategoriesTable)
      .where(eq(expenseCategoriesTable.isStandard, true))

    // Get user's custom categories if userId provided
    let customCategories: SelectExpenseCategory[] = []
    if (userId) {
      customCategories = await db
        .select()
        .from(expenseCategoriesTable)
        .where(
          and(
            eq(expenseCategoriesTable.isStandard, false),
            eq(expenseCategoriesTable.userId, userId)
          )
        )
    }

    return {
      isSuccess: true,
      message: "Expense categories retrieved successfully",
      data: [...standardCategories, ...customCategories]
    }
  } catch (error) {
    console.error("Error getting expense categories:", error)
    return { isSuccess: false, message: "Failed to get expense categories" }
  }
}

// Expense Attachment Operations

export async function uploadExpenseAttachmentAction(
  attachment: InsertExpenseAttachment
): Promise<ActionState<SelectExpenseAttachment>> {
  try {
    const [newAttachment] = await db
      .insert(expenseAttachmentsTable)
      .values(attachment)
      .returning()

    if (!newAttachment) {
      return { isSuccess: false, message: "Failed to upload expense attachment" }
    }

    return {
      isSuccess: true,
      message: "Expense attachment uploaded successfully",
      data: newAttachment
    }
  } catch (error) {
    console.error("Error uploading expense attachment:", error)
    return { isSuccess: false, message: "Failed to upload expense attachment" }
  }
}

export async function getExpenseAttachmentsByExpenseIdAction(
  expenseId: string
): Promise<ActionState<SelectExpenseAttachment[]>> {
  try {
    const attachments = await db
      .select()
      .from(expenseAttachmentsTable)
      .where(eq(expenseAttachmentsTable.expenseId, expenseId))
      .orderBy(desc(expenseAttachmentsTable.uploadedAt))

    return {
      isSuccess: true,
      message: "Expense attachments retrieved successfully",
      data: attachments
    }
  } catch (error) {
    console.error("Error getting expense attachments:", error)
    return { isSuccess: false, message: "Failed to get expense attachments" }
  }
}

export async function deleteExpenseAttachmentAction(
  attachmentId: string
): Promise<ActionState<void>> {
  try {
    await db.delete(expenseAttachmentsTable).where(eq(expenseAttachmentsTable.id, attachmentId))

    return {
      isSuccess: true,
      message: "Expense attachment deleted successfully",
      data: undefined
    }
  } catch (error) {
    console.error("Error deleting expense attachment:", error)
    return { isSuccess: false, message: "Failed to delete expense attachment" }
  }
}

// Depreciation Operations

export async function createDepreciationRecordAction(
  record: InsertDepreciationRecord
): Promise<ActionState<SelectDepreciationRecord>> {
  try {
    const [newRecord] = await db
      .insert(depreciationRecordsTable)
      .values(record)
      .returning()

    if (!newRecord) {
      return { isSuccess: false, message: "Failed to create depreciation record" }
    }

    return {
      isSuccess: true,
      message: "Depreciation record created successfully",
      data: newRecord
    }
  } catch (error) {
    console.error("Error creating depreciation record:", error)
    return { isSuccess: false, message: "Failed to create depreciation record" }
  }
}

export async function calculateDepreciationAction(
  recordId: string
): Promise<ActionState<SelectDepreciationRecord>> {
  try {
    const [record] = await db
      .select()
      .from(depreciationRecordsTable)
      .where(eq(depreciationRecordsTable.id, recordId))

    if (!record) {
      return { isSuccess: false, message: "Depreciation record not found" }
    }

    const purchaseDate = new Date(record.purchaseDate)
    const now = new Date()
    const yearsElapsed = (now.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 365)
    const purchaseCost = parseFloat(record.purchaseCost)
    const depreciationRate = parseFloat(record.depreciationRate)

    let currentValue: number
    if (record.depreciationMethod === "straight_line") {
      // Straight-line: (cost - (cost * rate * years))
      const totalDepreciation = purchaseCost * depreciationRate * Math.min(yearsElapsed, record.usefulLifeYears)
      currentValue = Math.max(0, purchaseCost - totalDepreciation)
    } else {
      // Declining balance: cost * (1 - rate) ^ years
      currentValue = purchaseCost * Math.pow(1 - depreciationRate, Math.min(yearsElapsed, record.usefulLifeYears))
      currentValue = Math.max(0, currentValue)
    }

    const [updatedRecord] = await db
      .update(depreciationRecordsTable)
      .set({ currentValue: currentValue.toString() })
      .where(eq(depreciationRecordsTable.id, recordId))
      .returning()

    if (!updatedRecord) {
      return { isSuccess: false, message: "Failed to update depreciation record" }
    }

    return {
      isSuccess: true,
      message: "Depreciation calculated successfully",
      data: updatedRecord
    }
  } catch (error) {
    console.error("Error calculating depreciation:", error)
    return { isSuccess: false, message: "Failed to calculate depreciation" }
  }
}

export async function getDepreciationRecordsByPropertyIdAction(
  propertyId: string,
  taxYear?: number
): Promise<ActionState<SelectDepreciationRecord[]>> {
  try {
    const conditions = [eq(depreciationRecordsTable.propertyId, propertyId)]

    if (taxYear) {
      conditions.push(eq(depreciationRecordsTable.taxYear, taxYear))
    }

    const records = await db
      .select()
      .from(depreciationRecordsTable)
      .where(and(...conditions))
      .orderBy(desc(depreciationRecordsTable.purchaseDate))

    return {
      isSuccess: true,
      message: "Depreciation records retrieved successfully",
      data: records
    }
  } catch (error) {
    console.error("Error getting depreciation records:", error)
    return { isSuccess: false, message: "Failed to get depreciation records" }
  }
}

export async function generateTaxReportAction(
  propertyId: string,
  taxYear: number
): Promise<ActionState<{ expenses: SelectExpense[]; depreciation: SelectDepreciationRecord[] }>> {
  try {
    const expensesResult = await getExpensesByPropertyIdAction(propertyId, { taxYear })
    const depreciationResult = await getDepreciationRecordsByPropertyIdAction(propertyId, taxYear)

    if (!expensesResult.isSuccess) {
      return {
        isSuccess: false,
        message: expensesResult.message || "Failed to get expenses"
      }
    }

    if (!depreciationResult.isSuccess) {
      return {
        isSuccess: false,
        message: depreciationResult.message || "Failed to get depreciation records"
      }
    }

    return {
      isSuccess: true,
      message: "Tax report generated successfully",
      data: {
        expenses: expensesResult.data || [],
        depreciation: depreciationResult.data || []
      }
    }
  } catch (error) {
    console.error("Error generating tax report:", error)
    return { isSuccess: false, message: "Failed to generate tax report" }
  }
}

