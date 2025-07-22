import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const { name, hex, tailwind_class } = await request.json() // Added tailwind_class

    if (!name || !hex || !tailwind_class) {
      // Validate tailwind_class
      return NextResponse.json({ error: "Missing required fields: name, hex, tailwind_class" }, { status: 400 })
    }

    const { data: color, error } = await supabase
      .from("colors")
      .update({ name, hex, tailwind_class })
      .eq("id", id)
      .select()
      .single() // Update tailwind_class

    if (error) {
      console.error("Supabase error updating color:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ color })
  } catch (error) {
    console.error("Error in PUT /api/colors/[id]:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
