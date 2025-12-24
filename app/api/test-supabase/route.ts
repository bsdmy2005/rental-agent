import { NextResponse } from "next/server"
import { testSupabaseConnection } from "@/lib/storage/supabase-storage"

export async function GET() {
  try {
    const isValid = await testSupabaseConnection()
    return NextResponse.json({
      success: true,
      message: "Supabase connection is valid",
      connection: isValid
    })
  } catch (error) {
    console.error("Supabase connection test failed:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

