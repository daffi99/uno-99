import { NextRequest, NextResponse } from "next/server"
import { authenticateUser, createSession } from "@/lib/auth"

export async function POST(req: NextRequest) {
  try {
    const { email, password, remember30Days } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
    }

    const { user, error } = authenticateUser(email, password)
    if (error || !user) {
      return NextResponse.json({ error: error || "Authentication failed" }, { status: 401 })
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
