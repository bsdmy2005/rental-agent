import { compareInspectionsAction } from "@/actions/moving-inspection-comparisons-actions"
import { movingInspectionComparisonsTable } from "@/db/schema"

const mockAuth = jest.fn()
const mockDb = {
  query: {
    movingInspections: {
      findFirst: jest.fn()
    }
  },
  insert: jest.fn()
}

jest.mock("@/db", () => ({ db: mockDb }))
jest.mock("@clerk/nextjs/server", () => ({
  auth: (...args: unknown[]) => mockAuth(...args)
}))

describe("moving inspection comparisons", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("compares moving-in/out items and computes condition changes", async () => {
    mockAuth.mockResolvedValue({ userId: "user-1" })
    mockDb.query.movingInspections.findFirst
      .mockResolvedValueOnce({
        id: "inspection-in-1",
        inspectionType: "moving_in",
        items: [
          { id: "in-1", name: "Wall", categoryId: "cat-1", condition: "good" },
          { id: "in-2", name: "Door", categoryId: "cat-1", condition: "poor" },
          { id: "in-3", name: "Window", categoryId: "cat-2", condition: "fair" }
        ]
      })
      .mockResolvedValueOnce({
        id: "inspection-out-1",
        inspectionType: "moving_out",
        items: [
          { id: "out-1", name: "Wall", categoryId: "cat-1", condition: "fair" },
          { id: "out-2", name: "Door", categoryId: "cat-1", condition: "good" },
          { id: "out-3", name: "Window", categoryId: "cat-2", condition: "defective" }
        ]
      })

    const returningMock = jest.fn().mockImplementation(async (comparisons: any[]) =>
      comparisons.map((comparison, index) => ({ id: `cmp-${index + 1}`, ...comparison }))
    )
    const valuesMock = jest.fn().mockReturnValue({ returning: returningMock })
    mockDb.insert.mockImplementation((table: unknown) => {
      if (table === movingInspectionComparisonsTable) {
        return { values: valuesMock }
      }
      return { values: jest.fn().mockReturnValue({ returning: jest.fn() }) }
    })

    const result = await compareInspectionsAction("inspection-in-1", "inspection-out-1")

    expect(valuesMock).toHaveBeenCalledWith([
      expect.objectContaining({
        movingInInspectionId: "inspection-in-1",
        movingOutInspectionId: "inspection-out-1",
        itemId: "out-1",
        conditionChange: "deteriorated",
        damageChargeApplicable: true
      }),
      expect.objectContaining({
        movingInInspectionId: "inspection-in-1",
        movingOutInspectionId: "inspection-out-1",
        itemId: "out-2",
        conditionChange: "improved",
        damageChargeApplicable: false
      }),
      expect.objectContaining({
        movingInInspectionId: "inspection-in-1",
        movingOutInspectionId: "inspection-out-1",
        itemId: "out-3",
        conditionChange: "new_defect",
        damageChargeApplicable: true
      })
    ])
    expect(result.isSuccess).toBe(true)
    expect(result.data?.length).toBe(3)
  })
})
