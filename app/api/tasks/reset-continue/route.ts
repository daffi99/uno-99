import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST() {
  try {
    // Find all tasks with "Continue Next Day" status
    const { data: tasksToReset, error: fetchError } = await supabase
      .from("tasks")
      .select("*")
      .eq("status", "Continue Next Day")

    if (fetchError) {
      return Response.json({ error: fetchError.message }, { status: 400 })
    }

    if (!tasksToReset || tasksToReset.length === 0) {
      return Response.json({ message: "No tasks to reset", count: 0 }, { status: 200 })
    }

    // Reset all these tasks to "Not Started"
    const { error: updateError } = await supabase
      .from("tasks")
      .update({ status: "Not Started" })
      .eq("status", "Continue Next Day")

    if (updateError) {
      return Response.json({ error: updateError.message }, { status: 400 })
    }

    return Response.json({ message: "Tasks reset successfully", count: tasksToReset.length }, { status: 200 })
  } catch (error) {
    console.error("Error resetting tasks:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
