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

      return {
        title: task.title,
        description: task.description || null,
        start_date: task.start_date,
        end_date: task.end_date,
        status: task.status || "Not started",
        priority: task.priority || "medium",
        recurring: recurringValue,
      }
    })

    const { data: tasks, error } = await supabase.from("tasks").insert(validatedTasks).select()

    if (error) {
      console.error("Supabase error creating recurring tasks:", error)
      return NextResponse.json({ error: `Failed to create recurring tasks: ${error.message}` }, { status: 500 })
    }

    console.log("Successfully created recurring tasks:", tasks)
    return NextResponse.json({ tasks }, { status: 201 })
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
