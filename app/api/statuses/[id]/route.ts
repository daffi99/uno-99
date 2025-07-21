import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params
  const { name, color, hex, category } = await request.json()

  if (!name || !color || !hex || !category) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  const { data: status, error } = await supabase
    .from("statuses")
    .update({ name, color, hex, category })
    .eq("id", id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ status })
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params

  const { error } = await supabase.from("statuses").delete().eq("id", id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return new Response(null, { status: 204 })
}
