import { signLeaseAgreementAction } from "@/actions/digital-signing-actions"

const mockAuth = jest.fn()
const mockDb = {
  query: {
    leaseAgreements: {
      findFirst: jest.fn()
    }
  },
  update: jest.fn()
}

jest.mock("@/db", () => ({ db: mockDb }))
jest.mock("@clerk/nextjs/server", () => ({
  auth: (...args: unknown[]) => mockAuth(...args)
}))

describe("lease lifecycle signing", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("rejects signing when user is not authenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null })

    const result = await signLeaseAgreementAction("lease-1", "tenant", {
      dataUrl: "sig"
    })

    expect(result.isSuccess).toBe(false)
    expect(result.message).toBe("Unauthorized")
    expect(mockDb.query.leaseAgreements.findFirst).not.toHaveBeenCalled()
  })

  it("marks lease signed when second signature is added", async () => {
    mockAuth.mockResolvedValue({ userId: "user-1" })
    mockDb.query.leaseAgreements.findFirst.mockResolvedValue({
      id: "lease-1",
      signedByTenant: false,
      signedByLandlord: true
    })

    const returningMock = jest.fn().mockResolvedValue([
      {
        id: "lease-1",
        signedByTenant: true,
        signedByLandlord: true,
        lifecycleState: "signed"
      }
    ])
    const whereMock = jest.fn().mockReturnValue({ returning: returningMock })
    const setMock = jest.fn().mockReturnValue({ where: whereMock })
    mockDb.update.mockReturnValue({ set: setMock })

    const signatureData = { dataUrl: "sig-tenant" }
    const result = await signLeaseAgreementAction("lease-1", "tenant", signatureData)

    expect(setMock).toHaveBeenCalledWith(
      expect.objectContaining({
        signedByTenant: true,
        tenantSignatureData: signatureData,
        signedAt: expect.any(Date),
        lifecycleState: "signed",
        updatedAt: expect.any(Date)
      })
    )
    expect(result.isSuccess).toBe(true)
    expect(result.data?.id).toBe("lease-1")
  })
})
