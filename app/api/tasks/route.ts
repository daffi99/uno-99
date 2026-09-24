import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    let query = supabase.from("tasks").select("*").order("start_date", { ascending: true })

    // Filter by date range if provided
    if (startDate && endDate) {
      query = query.or(
        `and(start_date.gte.${startDate},start_date.lte.${endDate}),and(end_date.gte.${startDate},end_date.lte.${endDate}),and(start_date.lte.${startDate},end_date.gte.${endDate})`,
      )
    }

    const { data: tasks, error } = await query

    if (error) {
      console.error("Error fetching tasks:", error)
      return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 })
    }

    return NextResponse.json({ tasks })
  } catch (error) {
    console.error("Error in GET /api/tasks:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, description, start_date, end_date, status, priority, recurring, type } = body

    if (!title || !start_date || !end_date) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Validate recurring value before sending to database
    const validRecurringValues = ["no", "daily", "weekly", "monthly"]
    const recurringValue = recurring || "no"
    if (!validRecurringValues.includes(recurringValue)) {
      return NextResponse.json({ error: `Invalid recurring value: ${recurringValue}` }, { status: 400 })
    }

    console.log("Creating task with data:", {
      title,
      description,
      start_date,
      end_date,
      status,
      priority,
      recurring: recurringValue,
      type,
    })

    const insertPayload: Record<string, any> = {
      title,
      description,
      start_date,
      end_date,
      status: status || "Not started",
      priority: priority || "medium",
      recurring: recurringValue,
      type,
    }

    if (body.start_time !== undefined) {
      insertPayload.start_time = body.start_time
    }
    if (body.end_time !== undefined) {
      insertPayload.end_time = body.end_time
    }

    let { data: task, error } = await supabase
      .from("tasks")
      .insert(insertPayload)
      .select()
      .single()

    // Graceful fallback if start_time or end_time don't exist yet
    if (error && error.message && (error.message.includes("end_time") || error.message.includes("start_time"))) {
      if (error.message.includes("end_time")) delete insertPayload.end_time
      if (error.message.includes("start_time")) delete insertPayload.start_time
      const retry = await supabase
        .from("tasks")
        .insert(insertPayload)
        .select()
        .single()
      task = retry.data
      error = retry.error
    }

    if (error) {
      console.error("Supabase error creating task:", error)
      return NextResponse.json({ error: `Failed to create task: ${error.message}` }, { status: 500 })
    }

    return NextResponse.json({
      task: {
        ...task,
        ...(body.start_time !== undefined ? { start_time: body.start_time } : {}),
        ...(body.end_time !== undefined ? { end_time: body.end_time } : {}),
      },
    }, { status: 201 })
  } catch (error) {
    console.error("Error in POST /api/tasks:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
