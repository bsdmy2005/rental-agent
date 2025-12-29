"use server"

import { db } from "@/db"
import { whatsappContactsTable, type InsertWhatsappContact, type SelectWhatsappContact } from "@/db/schema"
import { auth } from "@clerk/nextjs/server"
import { eq, and } from "drizzle-orm"
import { ActionState } from "@/types"

/**
 * Create a new contact
 */
export async function createContactAction(
  sessionId: string,
  phoneNumber: string,
  displayName?: string,
  notes?: string
): Promise<ActionState<SelectWhatsappContact>> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { isSuccess: false, message: "Unauthorized" }
    }

    // Verify session belongs to user
    const userProfile = await db.query.userProfiles.findFirst({
      where: (profiles, { eq }) => eq(profiles.clerkUserId, userId)
    })

    if (!userProfile) {
      return { isSuccess: false, message: "User profile not found" }
    }

    const session = await db.query.whatsappSessions.findFirst({
      where: (sessions, { and, eq }) =>
        and(
          eq(sessions.id, sessionId),
          eq(sessions.userProfileId, userProfile.id)
        )
    })

    if (!session) {
      return { isSuccess: false, message: "Session not found" }
    }

    // Check if contact already exists
    const existingContact = await db.query.whatsappContacts.findFirst({
      where: (contacts, { and, eq }) =>
        and(
          eq(contacts.sessionId, sessionId),
          eq(contacts.phoneNumber, phoneNumber)
        )
    })

    if (existingContact) {
      return {
        isSuccess: false,
        message: "Contact with this phone number already exists"
      }
    }

    const [newContact] = await db
      .insert(whatsappContactsTable)
      .values({
        sessionId,
        phoneNumber,
        displayName: displayName || null,
        notes: notes || null,
        isFavorite: false
      })
      .returning()

    return {
      isSuccess: true,
      message: "Contact created successfully",
      data: newContact
    }
  } catch (error) {
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to create contact"
    }
  }
}

/**
 * Get all contacts for a session
 */
export async function getContactsAction(
  sessionId: string
): Promise<ActionState<SelectWhatsappContact[]>> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { isSuccess: false, message: "Unauthorized" }
    }

    const userProfile = await db.query.userProfiles.findFirst({
      where: (profiles, { eq }) => eq(profiles.clerkUserId, userId)
    })

    if (!userProfile) {
      return { isSuccess: false, message: "User profile not found" }
    }

    // Verify session belongs to user
    const session = await db.query.whatsappSessions.findFirst({
      where: (sessions, { and, eq }) =>
        and(
          eq(sessions.id, sessionId),
          eq(sessions.userProfileId, userProfile.id)
        )
    })

    if (!session) {
      return { isSuccess: false, message: "Session not found" }
    }

    const contacts = await db.query.whatsappContacts.findMany({
      where: (contacts, { eq }) => eq(contacts.sessionId, sessionId),
      orderBy: (contacts, { desc, asc }) => [
        desc(contacts.isFavorite),
        asc(contacts.displayName || contacts.phoneNumber)
      ]
    })

    return {
      isSuccess: true,
      message: "Contacts retrieved successfully",
      data: contacts
    }
  } catch (error) {
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to get contacts"
    }
  }
}

/**
 * Update a contact
 */
export async function updateContactAction(
  contactId: string,
  data: Partial<Pick<InsertWhatsappContact, "displayName" | "notes" | "isFavorite">>
): Promise<ActionState<SelectWhatsappContact>> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { isSuccess: false, message: "Unauthorized" }
    }

    const userProfile = await db.query.userProfiles.findFirst({
      where: (profiles, { eq }) => eq(profiles.clerkUserId, userId)
    })

    if (!userProfile) {
      return { isSuccess: false, message: "User profile not found" }
    }

    // Verify contact belongs to user's session
    const contact = await db.query.whatsappContacts.findFirst({
      where: (contacts, { eq }) => eq(contacts.id, contactId)
    })

    if (!contact) {
      return { isSuccess: false, message: "Contact not found" }
    }

    // Verify session belongs to user
    const session = await db.query.whatsappSessions.findFirst({
      where: (sessions, { and, eq }) =>
        and(
          eq(sessions.id, contact.sessionId),
          eq(sessions.userProfileId, userProfile.id)
        )
    })

    if (!session) {
      return { isSuccess: false, message: "Contact not found" }
    }

    const [updatedContact] = await db
      .update(whatsappContactsTable)
      .set(data)
      .where(eq(whatsappContactsTable.id, contactId))
      .returning()

    return {
      isSuccess: true,
      message: "Contact updated successfully",
      data: updatedContact
    }
  } catch (error) {
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to update contact"
    }
  }
}

/**
 * Delete a contact
 */
export async function deleteContactAction(
  contactId: string
): Promise<ActionState<void>> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { isSuccess: false, message: "Unauthorized" }
    }

    const userProfile = await db.query.userProfiles.findFirst({
      where: (profiles, { eq }) => eq(profiles.clerkUserId, userId)
    })

    if (!userProfile) {
      return { isSuccess: false, message: "User profile not found" }
    }

    // Verify contact belongs to user's session
    const contact = await db.query.whatsappContacts.findFirst({
      where: (contacts, { eq }) => eq(contacts.id, contactId)
    })

    if (!contact) {
      return { isSuccess: false, message: "Contact not found" }
    }

    // Verify session belongs to user
    const session = await db.query.whatsappSessions.findFirst({
      where: (sessions, { and, eq }) =>
        and(
          eq(sessions.id, contact.sessionId),
          eq(sessions.userProfileId, userProfile.id)
        )
    })

    if (!session) {
      return { isSuccess: false, message: "Contact not found" }
    }

    await db.delete(whatsappContactsTable).where(eq(whatsappContactsTable.id, contactId))

    return {
      isSuccess: true,
      message: "Contact deleted successfully",
      data: undefined
    }
  } catch (error) {
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to delete contact"
    }
  }
}

/**
 * Get contact by phone number
 */
export async function getContactByPhoneAction(
  sessionId: string,
  phoneNumber: string
): Promise<ActionState<SelectWhatsappContact | null>> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { isSuccess: false, message: "Unauthorized" }
    }

    const userProfile = await db.query.userProfiles.findFirst({
      where: (profiles, { eq }) => eq(profiles.clerkUserId, userId)
    })

    if (!userProfile) {
      return { isSuccess: false, message: "User profile not found" }
    }

    // Verify session belongs to user
    const session = await db.query.whatsappSessions.findFirst({
      where: (sessions, { and, eq }) =>
        and(
          eq(sessions.id, sessionId),
          eq(sessions.userProfileId, userProfile.id)
        )
    })

    if (!session) {
      return { isSuccess: false, message: "Session not found" }
    }

    const contact = await db.query.whatsappContacts.findFirst({
      where: (contacts, { and, eq }) =>
        and(
          eq(contacts.sessionId, sessionId),
          eq(contacts.phoneNumber, phoneNumber)
        )
    })

    return {
      isSuccess: true,
      message: "Contact retrieved successfully",
      data: contact || null
    }
  } catch (error) {
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to get contact"
    }
  }
}

