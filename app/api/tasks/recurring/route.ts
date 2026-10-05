import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tasks: tasksToAdd } = body

    if (!Array.isArray(tasksToAdd) || tasksToAdd.length === 0) {
      return NextResponse.json({ error: "No tasks provided" }, { status: 400 })
    }

    console.log("Creating recurring tasks:", tasksToAdd)

    // Validate each task before inserting
    const validRecurringValues = ["no", "daily", "weekly", "monthly"]
    const validatedTasks = tasksToAdd.map((task) => {
      const recurringValue = task.recurring || "no"
      if (!validRecurringValues.includes(recurringValue)) {
        throw new Error(`Invalid recurring value: ${recurringValue}`)
      }

      const item: Record<string, any> = {
        title: task.title,
        description: task.description || null,
        start_date: task.start_date,
        end_date: task.end_date,
        status: task.status || "Not started",
        priority: task.priority || "medium",
        recurring: recurringValue,
        type: task.type,
      }

      if (task.start_time !== undefined && task.start_time !== null) {
        item.start_time = task.start_time
      }
      if (task.end_time !== undefined && task.end_time !== null) {
        item.end_time = task.end_time
      }

      return item
    })

    let { data: tasks, error } = await supabase.from("tasks").insert(validatedTasks).select()

    // Graceful fallback if end_time doesn't exist in DB: retry keeping start_time!
    if (error && error.message && error.message.includes("end_time")) {
      const fallbackWithoutEndTime = validatedTasks.map((t) => {
        const copy = { ...t }
        delete copy.end_time
        return copy
      })
      const retry = await supabase.from("tasks").insert(fallbackWithoutEndTime).select()
      tasks = retry.data
      error = retry.error
    }

    // Secondary fallback if start_time also doesn't exist in DB
    if (error && error.message && error.message.includes("start_time")) {
      const fallbackWithoutTime = validatedTasks.map((t) => {
        const copy = { ...t }
        delete copy.start_time
        delete copy.end_time
        return copy
      })
      const retry = await supabase.from("tasks").insert(fallbackWithoutTime).select()
      tasks = retry.data
      error = retry.error
    }

    if (error) {
      console.error("Supabase error creating recurring tasks:", error)
      return NextResponse.json({ error: `Failed to create recurring tasks: ${error.message}` }, { status: 500 })
    }

    // Merge start_time and end_time back into response so frontend has accurate time values
    const finalTasks = (tasks || []).map((t, idx) => ({
      ...t,
      ...(validatedTasks[idx]?.start_time ? { start_time: validatedTasks[idx].start_time } : {}),
      ...(validatedTasks[idx]?.end_time ? { end_time: validatedTasks[idx].end_time } : {}),
    }))

    console.log("Successfully created recurring tasks:", finalTasks)
    return NextResponse.json({ tasks: finalTasks }, { status: 201 })
  } catch (error) {
    console.error("Error in POST /api/tasks/recurring:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    )
  }
}
