import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const { name, hex } = await request.json()

    if (!name || !hex) {
      return NextResponse.json({ error: "Missing required fields: name, hex" }, { status: 400 })
    }

    const { data: color, error } = await supabase.from("colors").update({ name, hex }).eq("id", id).select().single()

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

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params

    const { error } = await supabase.from("colors").delete().eq("id", id)

    if (error) {
      console.error("Error deleting color:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return new Response(null, { status: 204 })
  } catch (error) {
    console.error("Error in DELETE /api/colors/[id]:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
