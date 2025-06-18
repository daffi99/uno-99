import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const { title, description, start_date, end_date, status, priority, recurring } = body

    // Validate recurring value before sending to database
    const validRecurringValues = ["no", "daily", "weekly", "monthly"]
    if (recurring && !validRecurringValues.includes(recurring)) {
      return NextResponse.json({ error: `Invalid recurring value: ${recurring}` }, { status: 400 })
    }

    console.log("Updating task with data:", { title, description, start_date, end_date, status, priority, recurring })

    const { data: task, error } = await supabase
      .from("tasks")
      .update({
        title,
        description,
        start_date,
        end_date,
        status,
        priority,
        recurring,
      })
      .eq("id", params.id)
      .select()
      .single()

    if (error) {
      console.error("Supabase error updating task:", error)
      return NextResponse.json({ error: `Failed to update task: ${error.message}` }, { status: 500 })
    }

    return NextResponse.json({ task })
  } catch (error) {
    console.error("Error in PUT /api/tasks/[id]:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { error } = await supabase.from("tasks").delete().eq("id", params.id)

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
