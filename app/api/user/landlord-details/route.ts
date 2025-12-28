import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { getUserProfileByClerkIdQuery } from "@/queries/user-profiles-queries"
import { getLandlordByUserProfileIdQuery } from "@/queries/landlords-queries"
import { getRentalAgentByUserProfileIdQuery } from "@/queries/rental-agents-queries"
import { db } from "@/db"
import { propertiesTable } from "@/db/schema"
import { eq } from "drizzle-orm"

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userProfile = await getUserProfileByClerkIdQuery(userId)
    if (!userProfile) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 })
    }

    let landlordData: any = null

    if (userProfile.userType === "landlord") {
      const landlord = await getLandlordByUserProfileIdQuery(userProfile.id)
      if (landlord) {
        // Get property to fetch bank details
        const [property] = await db
          .select()
          .from(propertiesTable)
          .where(eq(propertiesTable.landlordId, landlord.id))
          .limit(1)

        landlordData = {
          name: landlord.companyName || `${userProfile.firstName || ""} ${userProfile.lastName || ""}`.trim() || "Landlord",
          idNumber: landlord.registrationNumber || landlord.taxId || "",
          address: landlord.address || "",
          email: landlord.contactEmail || userProfile.email,
          phone: landlord.contactPhone || userProfile.phone || "",
          bankName: property?.bankName || "",
          accountHolder: property?.accountHolderName || "",
          accountNumber: property?.accountNumber || "",
          branchCode: property?.branchCode || ""
        }
      }
    } else if (userProfile.userType === "rental_agent") {
      const rentalAgent = await getRentalAgentByUserProfileIdQuery(userProfile.id)
      if (rentalAgent) {
        landlordData = {
          name: rentalAgent.agencyName || `${userProfile.firstName || ""} ${userProfile.lastName || ""}`.trim() || "Rental Agent",
          idNumber: rentalAgent.licenseNumber || "",
          address: rentalAgent.address || "",
          email: rentalAgent.contactEmail || userProfile.email,
          phone: rentalAgent.contactPhone || userProfile.phone || "",
          bankName: "",
          accountHolder: "",
          accountNumber: "",
          branchCode: ""
        }
      }
    }

    return NextResponse.json({ landlord: landlordData })
  } catch (error) {
    console.error("Error fetching landlord details:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

