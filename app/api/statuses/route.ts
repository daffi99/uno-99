import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET() {
  const { data: statuses, error } = await supabase.from("statuses").select("*").order("name")

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ statuses })
}

export async function POST(request: NextRequest) {
  const { name, color, hex, category } = await request.json()

  if (!name || !color || !hex || !category) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  const { data: status, error } = await supabase
    .from("statuses")
    .insert({ name, color, hex, category })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ status }, { status: 201 })
} 