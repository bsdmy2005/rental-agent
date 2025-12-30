/// <reference types="jest" />

import {
  createMovingOutFromMovingInAction,
  signMovingInspectionAction
} from "@/actions/moving-inspections-actions"
import { movingInspectionsTable, movingInspectionItemsTable } from "@/db/schema"

const mockAuth = jest.fn()
const mockDb = {
  query: {
    movingInspections: {
      findFirst: jest.fn()
    }
  },
  insert: jest.fn(),
  update: jest.fn()
}

jest.mock("@/db", () => ({ db: mockDb }))
jest.mock("@clerk/nextjs/server", () => ({
  auth: (...args: unknown[]) => mockAuth(...args)
}))

describe("moving inspections", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("creates a moving-out inspection and copies items", async () => {
    mockAuth.mockResolvedValue({ userId: "user-1" })
    mockDb.query.movingInspections.findFirst.mockResolvedValue({
      id: "inspection-in-1",
      leaseAgreementId: "lease-1",
      inspectionType: "moving_in",
      items: [
        { id: "item-1", categoryId: "cat-1", name: "Wall", displayOrder: 0 },
        { id: "item-2", categoryId: "cat-2", name: "Door", displayOrder: 1 }
      ]
    })

    const movingOutValuesMock = jest.fn().mockReturnValue({
      returning: jest.fn().mockResolvedValue([{ id: "inspection-out-1" }])
    })
    const itemsValuesMock = jest.fn().mockResolvedValue([])

    mockDb.insert.mockImplementation((table: unknown) => {
      if (table === movingInspectionsTable) {
        return { values: movingOutValuesMock }
      }
      if (table === movingInspectionItemsTable) {
        return { values: itemsValuesMock }
      }
      return { values: jest.fn().mockResolvedValue([]) }
    })

    const result = await createMovingOutFromMovingInAction("inspection-in-1")

    expect(movingOutValuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        leaseAgreementId: "lease-1",
        inspectionType: "moving_out",
        status: "draft",
        inspectedBy: "user-1"
      })
    )
    expect(itemsValuesMock).toHaveBeenCalledWith([
      {
        inspectionId: "inspection-out-1",
        categoryId: "cat-1",
        name: "Wall",
        condition: "good",
        notes: null,
        displayOrder: 0
      },
      {
        inspectionId: "inspection-out-1",
        categoryId: "cat-2",
        name: "Door",
        condition: "good",
        notes: null,
        displayOrder: 1
      }
    ])
    expect(result.isSuccess).toBe(true)
    expect(result.data?.id).toBe("inspection-out-1")
  })

  it("signs inspection and marks it signed when both parties have signed", async () => {
    mockAuth.mockResolvedValue({ userId: "user-1" })
    mockDb.query.movingInspections.findFirst.mockResolvedValue({
      id: "inspection-1",
      signedByTenant: false,
      signedByLandlord: true
    })

    const returningMock = jest.fn().mockResolvedValue([
      {
        id: "inspection-1",
        signedByTenant: true,
        signedByLandlord: true,
        status: "signed"
      }
    ])
    const whereMock = jest.fn().mockReturnValue({ returning: returningMock })
    const setMock = jest.fn().mockReturnValue({ where: whereMock })
    mockDb.update.mockReturnValue({ set: setMock })

    const signatureData = { dataUrl: "sig-tenant" }
    const result = await signMovingInspectionAction("inspection-1", "tenant", signatureData)

    expect(setMock).toHaveBeenCalledWith(
      expect.objectContaining({
        signedByTenant: true,
        tenantSignatureData: signatureData,
        signedAt: expect.any(Date),
        status: "signed",
        updatedAt: expect.any(Date)
      })
    )
    expect(result.isSuccess).toBe(true)
    expect(result.data?.id).toBe("inspection-1")
  })
})
