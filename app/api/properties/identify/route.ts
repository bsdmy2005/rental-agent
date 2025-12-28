import { NextRequest, NextResponse } from "next/server"
import { validatePropertyCodeAction } from "@/actions/property-codes-actions"
import { identifyPropertyByPhoneAction, searchPropertiesByAddressAction } from "@/actions/property-identification-actions"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { method, value } = body

    if (!method || !value) {
      return NextResponse.json(
        { error: "Method and value are required" },
        { status: 400 }
      )
    }

    switch (method) {
      case "code": {
        const result = await validatePropertyCodeAction(value)
        if (!result.isSuccess || !result.data) {
          return NextResponse.json(
            { error: result.message },
            { status: 404 }
          )
        }
        return NextResponse.json({
          success: true,
          data: result.data
        })
      }

      case "phone": {
        const result = await identifyPropertyByPhoneAction(value)
        if (!result.isSuccess || !result.data) {
          return NextResponse.json(
            { error: result.message },
            { status: 404 }
          )
        }
        return NextResponse.json({
          success: true,
          data: result.data
        })
      }

      case "address": {
        const result = await searchPropertiesByAddressAction(value)
        if (!result.isSuccess) {
          return NextResponse.json(
            { error: result.message },
            { status: 500 }
          )
        }
        return NextResponse.json({
          success: true,
          data: result.data || []
        })
      }

      default:
        return NextResponse.json(
          { error: "Invalid identification method" },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error("Error identifying property:", error)
    return NextResponse.json(
      { error: "Failed to identify property" },
      { status: 500 }
    )
  }
}

