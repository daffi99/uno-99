import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const { title, description, start_date, end_date, status, priority, recurring } = body

    // Validate recurring value before sending to database
    const validRecurringValues = ["no", "daily", "weekly", "monthly"]
    if (recurring && !validRecurringValues.includes(recurring)) {
      return NextResponse.json({ error: `Invalid recurring value: ${recurring}` }, { status: 400 })
    }

    console.log("Updating task with data:", { title, description, start_date, end_date, status, priority, recurring, start_time: body.start_time })

    const updatePayload: Record<string, any> = {
      title,
      description,
      start_date,
      end_date,
      status,
      priority,
      recurring,
    }

    if (body.start_time !== undefined) {
      updatePayload.start_time = body.start_time
    }
    if (body.end_time !== undefined) {
      updatePayload.end_time = body.end_time
    }

    let { data: task, error } = await supabase
      .from("tasks")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single()

    // Graceful fallback if start_time or end_time columns do not exist yet in Supabase
    if (error && error.message && (error.message.includes("end_time") || error.message.includes("start_time"))) {
      if (error.message.includes("end_time")) delete updatePayload.end_time
      if (error.message.includes("start_time")) delete updatePayload.start_time
      const retry = await supabase
        .from("tasks")
        .update(updatePayload)
        .eq("id", id)
        .select()
        .single()
      task = retry.data
      error = retry.error
    }

    if (error) {
      console.error("Supabase error updating task:", error)
      return NextResponse.json({ error: `Failed to update task: ${error.message}` }, { status: 500 })
    }

    return NextResponse.json({
      task: {
        ...task,
        ...(body.start_time !== undefined ? { start_time: body.start_time } : {}),
        ...(body.end_time !== undefined ? { end_time: body.end_time } : {}),
      },
    })
  } catch (error) {
    console.error("Error in PUT /api/tasks/[id]:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { error } = await supabase.from("tasks").delete().eq("id", id)

    if (error) {
      console.error("Error deleting task:", error)
      return NextResponse.json({ error: "Failed to delete task" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in DELETE /api/tasks/[id]:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
