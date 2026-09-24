import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    const { updates } = await request.json()

    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json({ error: "Missing or empty updates array" }, { status: 400 })
    }

    const results: Array<{ id: string; success: boolean; error?: string }> = []

    for (const item of updates) {
      const payload: Record<string, any> = {}
      if (item.start_time !== undefined) payload.start_time = item.start_time
      if (item.end_time !== undefined) payload.end_time = item.end_time
      if (item.start_date) payload.start_date = item.start_date
      if (item.end_date) payload.end_date = item.end_date

      let { error } = await supabase.from("tasks").update(payload).eq("id", item.id)

      if (error && error.message && (error.message.includes("end_time") || error.message.includes("start_time"))) {
        if (error.message.includes("end_time")) delete payload.end_time
        if (error.message.includes("start_time")) delete payload.start_time
        const retry = await supabase.from("tasks").update(payload).eq("id", item.id)
        error = retry.error
      }

      if (error) {
        results.push({ id: item.id, success: false, error: error.message })
      } else {
        results.push({ id: item.id, success: true })
      }
    }

    const successCount = results.filter((r) => r.success).length
    const failCount = results.length - successCount

    return NextResponse.json({
      success: true,
      updated: successCount,
      failed: failCount,
      results,
    })
  } catch (error) {
    console.error("Error in POST /api/tasks/sync-times:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
