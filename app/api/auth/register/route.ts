import { NextRequest, NextResponse } from "next/server"
import { createUser, createSession } from "@/lib/auth"

export async function POST(req: NextRequest) {
  try {
    const { email, password, name, remember30Days } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 })
    }

    const { user, error } = createUser({ email, password, name })
    if (error || !user) {
      return NextResponse.json({ error: error || "Failed to create user" }, { status: 400 })
    }

    const session = createSession(user.id, remember30Days ?? true)

    return NextResponse.json({
      user,
      token: session.token,
      expiresAt: session.expiresAt,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 })
  }
}
