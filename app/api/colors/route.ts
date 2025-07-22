import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET() {
  try {
    const { data: colors, error } = await supabase.from("colors").select("*").order("name")

    if (error) {
      console.error("Error fetching colors:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ colors })
  } catch (error) {
    console.error("Error in GET /api/colors:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, hex, tailwind_class } = await request.json() // Added tailwind_class

    if (!name || !hex || !tailwind_class) {
      // Validate tailwind_class
      return NextResponse.json({ error: "Missing required fields: name, hex, tailwind_class" }, { status: 400 })
    }

    const { data: color, error } = await supabase.from("colors").insert({ name, hex, tailwind_class }).select().single() // Insert tailwind_class

    if (error) {
      console.error("Supabase error creating color:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ color }, { status: 201 })
  } catch (error) {
    console.error("Error in POST /api/colors:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
