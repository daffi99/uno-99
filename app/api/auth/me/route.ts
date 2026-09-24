import { NextRequest, NextResponse } from "next/server"
import { getUserByToken, updateUser, deleteUser } from "@/lib/auth"

function getToken(req: NextRequest): string | null {
  const authHeader = req.headers.get("authorization")
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7)
  }
  return null
}

// Read current user
export async function GET(req: NextRequest) {
  try {
    const token = getToken(req)
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = getUserByToken(token)
    if (!user) {
      return NextResponse.json({ error: "Session expired or invalid" }, { status: 401 })
    }

    return NextResponse.json({ user })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 })
  }
}

// Update profile / password
export async function PUT(req: NextRequest) {
  try {
    const token = getToken(req)
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const currentUser = getUserByToken(token)
    if (!currentUser) {
      return NextResponse.json({ error: "Session expired or invalid" }, { status: 401 })
    }

    const body = await req.json()
    const { user, error } = updateUser(currentUser.id, body)

    if (error || !user) {
      return NextResponse.json({ error: error || "Failed to update profile" }, { status: 400 })
    }

    return NextResponse.json({ user })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 })
  }
}

// Delete account
export async function DELETE(req: NextRequest) {
  try {
    const token = getToken(req)
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const currentUser = getUserByToken(token)
    if (!currentUser) {
      return NextResponse.json({ error: "Session expired or invalid" }, { status: 401 })
    }

    const result = deleteUser(currentUser.id)
    if (!result.success) {
      return NextResponse.json({ error: result.error || "Failed to delete account" }, { status: 400 })
    }

    return NextResponse.json({ success: true, message: "Account deleted successfully" })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 })
  }
}
