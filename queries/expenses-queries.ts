import { db } from "@/db"
import {
  expensesTable,
  expenseCategoriesTable,
  expenseAttachmentsTable,
  propertiesTable,
  userProfilesTable,
  type SelectExpense,
  type SelectExpenseCategory
} from "@/db/schema"
import { eq, inArray } from "drizzle-orm"

export interface ExpenseWithCategory extends SelectExpense {
  category: SelectExpenseCategory
  property: {
    id: string
    name: string
  }
  paidByUser?: {
    id: string
    firstName: string | null
    lastName: string | null
    email: string
  }
}

export async function getExpenseByIdWithCategoryQuery(
  expenseId: string
): Promise<ExpenseWithCategory | null> {
  const result = await db
    .select({
      id: expensesTable.id,
      propertyId: expensesTable.propertyId,
      categoryId: expensesTable.categoryId,
      amount: expensesTable.amount,
      description: expensesTable.description,
      expenseDate: expensesTable.expenseDate,
      paidBy: expensesTable.paidBy,
      paymentMethod: expensesTable.paymentMethod,
      isTaxDeductible: expensesTable.isTaxDeductible,
      taxYear: expensesTable.taxYear,
      createdAt: expensesTable.createdAt,
      updatedAt: expensesTable.updatedAt,
      category: {
        id: expenseCategoriesTable.id,
        name: expenseCategoriesTable.name,
        description: expenseCategoriesTable.description,
        category: expenseCategoriesTable.category,
        isStandard: expenseCategoriesTable.isStandard,
        userId: expenseCategoriesTable.userId,
        createdAt: expenseCategoriesTable.createdAt,
        updatedAt: expenseCategoriesTable.updatedAt
      },
      property: {
        id: propertiesTable.id,
        name: propertiesTable.name
      }
    })
    .from(expensesTable)
    .innerJoin(expenseCategoriesTable, eq(expensesTable.categoryId, expenseCategoriesTable.id))
    .innerJoin(propertiesTable, eq(expensesTable.propertyId, propertiesTable.id))
    .where(eq(expensesTable.id, expenseId))
    .limit(1)

  if (result.length === 0) {
    return null
  }

  const expense = result[0]

  // Get paid by user if exists
  let paidByUser = undefined
  if (expense.paidBy) {
    const [user] = await db
      .select()
      .from(userProfilesTable)
      .where(eq(userProfilesTable.id, expense.paidBy))
      .limit(1)

    if (user) {
      paidByUser = {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email
      }
    }
  }

  return {
    ...expense,
    paidByUser
  }
}

export async function getExpensesByPropertyIdWithCategoryQuery(
  propertyId: string
): Promise<ExpenseWithCategory[]> {
  const result = await db
    .select({
      id: expensesTable.id,
      propertyId: expensesTable.propertyId,
      categoryId: expensesTable.categoryId,
      amount: expensesTable.amount,
      description: expensesTable.description,
      expenseDate: expensesTable.expenseDate,
      paidBy: expensesTable.paidBy,
      paymentMethod: expensesTable.paymentMethod,
      isTaxDeductible: expensesTable.isTaxDeductible,
      taxYear: expensesTable.taxYear,
      createdAt: expensesTable.createdAt,
      updatedAt: expensesTable.updatedAt,
      category: {
        id: expenseCategoriesTable.id,
        name: expenseCategoriesTable.name,
        description: expenseCategoriesTable.description,
        category: expenseCategoriesTable.category,
        isStandard: expenseCategoriesTable.isStandard,
        userId: expenseCategoriesTable.userId,
        createdAt: expenseCategoriesTable.createdAt,
        updatedAt: expenseCategoriesTable.updatedAt
      },
      property: {
        id: propertiesTable.id,
        name: propertiesTable.name
      }
    })
    .from(expensesTable)
    .innerJoin(expenseCategoriesTable, eq(expensesTable.categoryId, expenseCategoriesTable.id))
    .innerJoin(propertiesTable, eq(expensesTable.propertyId, propertiesTable.id))
    .where(eq(expensesTable.propertyId, propertyId))

  // Get paid by users for all expenses
  const paidByUserIds = [...new Set(result.map((r) => r.paidBy).filter(Boolean) as string[])]
  let userMap = new Map()
  if (paidByUserIds.length > 0) {
    const users = await db
      .select()
      .from(userProfilesTable)
      .where(inArray(userProfilesTable.id, paidByUserIds))

    userMap = new Map(users.map((u) => [u.id, u]))
  }

  return result.map((expense) => ({
    ...expense,
    paidByUser: expense.paidBy
      ? {
          id: expense.paidBy,
          firstName: userMap.get(expense.paidBy)?.firstName || null,
          lastName: userMap.get(expense.paidBy)?.lastName || null,
          email: userMap.get(expense.paidBy)?.email || ""
        }
      : undefined
  }))
}

export async function getExpensesByPropertyIdsWithCategoryQuery(
  propertyIds: string[]
): Promise<ExpenseWithCategory[]> {
  if (propertyIds.length === 0) {
    return []
  }

  const result = await db
    .select({
      id: expensesTable.id,
      propertyId: expensesTable.propertyId,
      categoryId: expensesTable.categoryId,
      amount: expensesTable.amount,
      description: expensesTable.description,
      expenseDate: expensesTable.expenseDate,
      paidBy: expensesTable.paidBy,
      paymentMethod: expensesTable.paymentMethod,
      isTaxDeductible: expensesTable.isTaxDeductible,
      taxYear: expensesTable.taxYear,
      createdAt: expensesTable.createdAt,
      updatedAt: expensesTable.updatedAt,
      category: {
        id: expenseCategoriesTable.id,
        name: expenseCategoriesTable.name,
        description: expenseCategoriesTable.description,
        category: expenseCategoriesTable.category,
        isStandard: expenseCategoriesTable.isStandard,
        userId: expenseCategoriesTable.userId,
        createdAt: expenseCategoriesTable.createdAt,
        updatedAt: expenseCategoriesTable.updatedAt
      },
      property: {
        id: propertiesTable.id,
        name: propertiesTable.name
      }
    })
    .from(expensesTable)
    .innerJoin(expenseCategoriesTable, eq(expensesTable.categoryId, expenseCategoriesTable.id))
    .innerJoin(propertiesTable, eq(expensesTable.propertyId, propertiesTable.id))
    .where(inArray(expensesTable.propertyId, propertyIds))

  // Get paid by users for all expenses
  const paidByUserIds = [...new Set(result.map((r) => r.paidBy).filter(Boolean) as string[])]
  let userMap = new Map()
  if (paidByUserIds.length > 0) {
    const users = await db
      .select()
      .from(userProfilesTable)
      .where(inArray(userProfilesTable.id, paidByUserIds))

    userMap = new Map(users.map((u) => [u.id, u]))
  }

  return result.map((expense) => ({
    ...expense,
    paidByUser: expense.paidBy
      ? {
          id: expense.paidBy,
          firstName: userMap.get(expense.paidBy)?.firstName || null,
          lastName: userMap.get(expense.paidBy)?.lastName || null,
          email: userMap.get(expense.paidBy)?.email || ""
        }
      : undefined
  }))
}
