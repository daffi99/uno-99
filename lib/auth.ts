import fs from "fs"
import path from "path"
import crypto from "crypto"

export interface User {
  id: string
  email: string
  name: string
  avatar?: string
  passwordHash: string
  createdAt: string
  updatedAt: string
}

export interface Session {
  token: string
  userId: string
  expiresAt: number
}

const DATA_DIR = path.join(process.cwd(), "data")
const USERS_FILE = path.join(DATA_DIR, "users.json")
const SESSIONS_FILE = path.join(DATA_DIR, "sessions.json")

export function getVercelPassword(): string {
  return (
    process.env.DAFFI_PASSWORD ||
    process.env.ADMIN_PASSWORD ||
    process.env.AUTH_PASSWORD ||
    process.env.PASSWORD ||
    "daffi123"
  )
}

function ensureFiles() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }

  const defaultSalt = "uno99_salt"
  const vercelPass = getVercelPassword()
  const daffiHash = crypto.createHash("sha256").update(vercelPass + defaultSalt).digest("hex")

  const daffiUser: User = {
    id: "u_daffi_yashir",
    email: "daffiyashir@gmail.com",
    name: "daffi yashir",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80",
    passwordHash: daffiHash,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, JSON.stringify([daffiUser], null, 2))
  } else {
    try {
      const raw = fs.readFileSync(USERS_FILE, "utf-8")
      const users: User[] = JSON.parse(raw)
      const existingIdx = users.findIndex(
        (u) =>
          u.name.toLowerCase() === "daffi yashir" ||
          u.email.toLowerCase() === "daffiyashir@gmail.com" ||
          u.id === "u_daffi_yashir" ||
          u.id === "u_demo_1"
      )
      if (existingIdx !== -1) {
        users[existingIdx].name = "daffi yashir"
        users[existingIdx].email = users[existingIdx].email || "daffiyashir@gmail.com"
        users[existingIdx].passwordHash = daffiHash
        fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2))
      } else {
        users.unshift(daffiUser)
        fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2))
      }
    } catch {
      fs.writeFileSync(USERS_FILE, JSON.stringify([daffiUser], null, 2))
    }
  }

  if (!fs.existsSync(SESSIONS_FILE)) {
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify([], null, 2))
  }
}

function hashPassword(password: string): string {
  const salt = "uno99_salt"
  return crypto.createHash("sha256").update(password + salt).digest("hex")
}

export function getAllUsers(): User[] {
  ensureFiles()
  try {
    const raw = fs.readFileSync(USERS_FILE, "utf-8")
    return JSON.parse(raw) as User[]
  } catch {
    return []
  }
}

function saveUsers(users: User[]) {
  ensureFiles()
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2))
}

export function getAllSessions(): Session[] {
  ensureFiles()
  try {
    const raw = fs.readFileSync(SESSIONS_FILE, "utf-8")
    return JSON.parse(raw) as Session[]
  } catch {
    return []
  }
}

function saveSessions(sessions: Session[]) {
  ensureFiles()
  fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2))
}

// 1. Create (Register)
export function createUser(data: { email: string; password: string; name?: string; avatar?: string }): { user?: Omit<User, "passwordHash">; error?: string } {
  const users = getAllUsers()
  const normalizedEmail = data.email.trim().toLowerCase()

  if (users.some((u) => u.email.toLowerCase() === normalizedEmail)) {
    return { error: "Email already registered" }
  }

  const newUser: User = {
    id: `u_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    email: normalizedEmail,
    name: data.name?.trim() || normalizedEmail.split("@")[0],
    avatar: data.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80",
    passwordHash: hashPassword(data.password),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  users.push(newUser)
  saveUsers(users)

  const { passwordHash, ...safeUser } = newUser
  return { user: safeUser }
}

// 2. Read (Login verification with Vercel password support)
export function authenticateUser(identifier: string, password: string): { user?: Omit<User, "passwordHash">; error?: string } {
  ensureFiles()
  const users = getAllUsers()
  const cleanId = identifier.trim().toLowerCase()
  const vercelPass = getVercelPassword()

  const user = users.find(
    (u) =>
      u.email.toLowerCase() === cleanId ||
      u.name.toLowerCase() === cleanId ||
      (cleanId === "daffi" && u.name.toLowerCase().includes("daffi")) ||
      (cleanId === "daffiyashir" && u.name.toLowerCase().includes("daffi"))
  )

  if (!user) {
    return { error: "Invalid username/email or password" }
  }

  const hash = hashPassword(password)
  const isVercelMatch =
    password === vercelPass &&
    (user.name.toLowerCase() === "daffi yashir" || user.id === "u_daffi_yashir")
  const isHashMatch = user.passwordHash === hash

  if (!isHashMatch && !isVercelMatch) {
    return { error: "Invalid username/email or password" }
  }

  const { passwordHash, ...safeUser } = user
  return { user: safeUser }
}

// 3. Create Session with 30-day option
export function createSession(userId: string, remember30Days: boolean = true): Session {
  const sessions = getAllSessions()
  const token = `sess_${crypto.randomBytes(24).toString("hex")}`
  // 30 days = 30 * 24 * 60 * 60 * 1000 ms, or 1 day if not remembered
  const durationMs = remember30Days ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000
  const expiresAt = Date.now() + durationMs

  const newSession: Session = {
    token,
    userId,
    expiresAt,
  }

  // Filter out expired sessions
  const activeSessions = sessions.filter((s) => s.expiresAt > Date.now())
  activeSessions.push(newSession)
  saveSessions(activeSessions)

  return newSession
}

// 4. Read User by Token
export function getUserByToken(token: string): Omit<User, "passwordHash"> | null {
  const sessions = getAllSessions()
  const session = sessions.find((s) => s.token === token && s.expiresAt > Date.now())
  if (!session) return null

  const users = getAllUsers()
  const user = users.find((u) => u.id === session.userId)
  if (!user) return null

  const { passwordHash, ...safeUser } = user
  return safeUser
}

// 5. Update (Profile / Password)
export function updateUser(
  userId: string,
  data: { name?: string; email?: string; currentPassword?: string; newPassword?: string; avatar?: string }
): { user?: Omit<User, "passwordHash">; error?: string } {
  const users = getAllUsers()
  const userIndex = users.findIndex((u) => u.id === userId)
  if (userIndex === -1) {
    return { error: "User not found" }
  }

  const user = users[userIndex]

  if (data.newPassword) {
    if (!data.currentPassword) {
      return { error: "Current password is required to set new password" }
    }
    if (user.passwordHash !== hashPassword(data.currentPassword)) {
      return { error: "Incorrect current password" }
    }
    user.passwordHash = hashPassword(data.newPassword)
  }

  if (data.email && data.email.trim().toLowerCase() !== user.email.toLowerCase()) {
    const emailTaken = users.some(
      (u) => u.id !== userId && u.email.toLowerCase() === data.email!.trim().toLowerCase()
    )
    if (emailTaken) {
      return { error: "Email is already taken" }
    }
    user.email = data.email.trim().toLowerCase()
  }

  if (data.name) {
    user.name = data.name.trim()
  }

  if (data.avatar !== undefined) {
    user.avatar = data.avatar.trim() || undefined
  }

  user.updatedAt = new Date().toISOString()
  users[userIndex] = user
  saveUsers(users)

  const { passwordHash, ...safeUser } = user
  return { user: safeUser }
}

// 6. Delete (Account deletion)
export function deleteUser(userId: string): { success: boolean; error?: string } {
  const users = getAllUsers()
  const filteredUsers = users.filter((u) => u.id !== userId)
  if (filteredUsers.length === users.length) {
    return { success: false, error: "User not found" }
  }

  saveUsers(filteredUsers)

  // Remove their sessions
  const sessions = getAllSessions()
  saveSessions(sessions.filter((s) => s.userId !== userId))

  return { success: true }
}

// 7. Revoke Session (Logout)
export function revokeSession(token: string) {
  const sessions = getAllSessions()
  saveSessions(sessions.filter((s) => s.token !== token))
}
