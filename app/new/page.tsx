"use client"

import React, { useState, useEffect, useMemo, useRef } from "react"
import Link from "next/link"
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Plus,
  Search,
  Settings,
  ListTodo,
  UserCheck,
  Clock,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Loader2,
  Repeat,
  Info,
  User,
  LogOut,
  Palette,
  Tag,
  Check,
  Eye,
  EyeOff,
  ShieldCheck,
  Lock,
  Mail,
  Camera,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DatePicker } from "@/components/date-picker"

interface Task {
  id: string
  title: string
  description: string | null
  start_date: string
  end_date: string
  status: string
  priority: "low" | "medium" | "high"
  recurring: "no" | "daily" | "weekly" | "monthly"
  start_time?: string | null
  end_time?: string | null
  created_at?: string
  updated_at?: string
  type?: string
  due_date?: string
}

const CHECKLISTS = [
  {
    key: "reel",
    label: "Checklist for reel",
    platforms: ["Facebook", "Instagram", "TikTok", "YouTube", "LinkedIn", "Threads"],
  },
  {
    key: "image",
    label: "Checklist for image",
    platforms: ["Facebook", "Instagram", "LinkedIn", "Google Business", "Threads"],
  },
]

// Fixed grid column definition to guarantee 100% equal and fixed day column widths
const GRID_TEMPLATE = "56px repeat(7, minmax(140px, 1fr))"

// Deterministic slots for card loading skeleton shimmer
const SKELETON_SLOTS: Record<string, number[]> = {
  "10:00": [0, 2, 4], // Mon, Wed, Fri
  "11:00": [1, 3],    // Tue, Thu
  "13:00": [0, 3],    // Mon, Thu
  "14:00": [1, 4],    // Tue, Fri
  "15:00": [2, 3],    // Wed, Thu
  "16:00": [0, 4],    // Mon, Fri
  "17:00": [1, 2],    // Tue, Wed
}

// Time slots after 09:00
const MORNING_TIME_SLOTS = [
  { slot: "10:00", label: "10:00", timeText: "10:00AM - 11:00AM" },
  { slot: "11:00", label: "11:00", timeText: "11:00AM - 12:00PM" },
]

const AFTERNOON_TIME_SLOTS = [
  { slot: "13:00", label: "13:00", timeText: "01:00PM - 02:00PM" },
  { slot: "14:00", label: "14:00", timeText: "02:00PM - 03:00PM" },
  { slot: "15:00", label: "15:00", timeText: "03:00PM - 04:00PM" },
  { slot: "16:00", label: "16:00", timeText: "04:00PM - 05:00PM" },
  { slot: "17:00", label: "17:00", timeText: "05:00PM - 06:00PM" },
]

const REMAINING_TIME_SLOTS = [...MORNING_TIME_SLOTS, ...AFTERNOON_TIME_SLOTS]

const MORNING_SLOTS = ["10:00", "11:00"]
const AFTERNOON_SLOTS = ["13:00", "14:00", "15:00", "16:00", "17:00"]

function getTaskOccupiedSlots(startTime: string, endTime?: string | null): string[] {
  const normStart = startTime === "12:00" ? "13:00" : (startTime || "10:00")
  const isMorning = MORNING_SLOTS.includes(normStart)
  const allowedSlots = isMorning ? MORNING_SLOTS : AFTERNOON_SLOTS

  const startIdx = allowedSlots.indexOf(normStart)
  if (startIdx === -1) {
    return [normStart]
  }

  const normEnd = !endTime || endTime === "12:00" ? normStart : endTime
  const endIdx = allowedSlots.indexOf(normEnd)
  if (endIdx === -1 || endIdx < startIdx) {
    return [normStart]
  }

  return allowedSlots.slice(startIdx, endIdx + 1)
}

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  let cleanHex = hex.replace("#", "").trim()
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split("").map((c) => c + c).join("")
  }
  if (cleanHex.length !== 6) {
    return { h: 210, s: 15, l: 50 }
  }

  const r = parseInt(cleanHex.slice(0, 2), 16) / 255
  const g = parseInt(cleanHex.slice(2, 4), 16) / 255
  const b = parseInt(cleanHex.slice(4, 6), 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0)
        break
      case g:
        h = (b - r) / d + 2
        break
      case b:
        h = (r - g) / d + 4
        break
    }
    h /= 6
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  }
}

function getCardTheme(status: string, statusHex?: string) {
  let hex = statusHex
  if (!hex && status) {
    const s = status.toLowerCase()
    if (s.includes("done") || s.includes("complete")) hex = "#0bc144"
    else if (s.includes("skipped")) hex = "#7ed321"
    else if (s.includes("pending")) hex = "#ec4899"
    else if (s.includes("holiday")) hex = "#3d3d3b"
    else if (s.includes("wait") && s.includes("asset")) hex = "#f1ca1c"
    else if (s.includes("wait") && s.includes("confirm")) hex = "#a78bfa"
    else if (s.includes("wait") && s.includes("approval")) hex = "#ef4444"
    else hex = "#6366f1"
  }

  const { h, s } = hexToHsl(hex || "#6366f1")
  const isYellow = h >= 35 && h <= 68
  const bgL = isYellow ? 93 : 95
  const borderL = isYellow ? 78 : 82
  const textL = isYellow ? 15 : 16
  const subtextL = isYellow ? 28 : 32

  const effectiveS = s < 10 ? s : Math.min(Math.max(s, 60), 85)

  return {
    bg: "",
    border: "",
    text: "",
    subtext: "",
    cardStyle: {
      backgroundColor: `hsl(${h}, ${effectiveS}%, ${bgL}%)`,
      borderColor: `hsl(${h}, ${Math.min(effectiveS, 75)}%, ${borderL}%)`,
    },
    textStyle: {
      color: `hsl(${h}, ${Math.min(effectiveS, 90)}%, ${textL}%)`,
    },
    subtextStyle: {
      color: `hsl(${h}, ${Math.min(effectiveS, 70)}%, ${subtextL}%)`,
    },
    badgeBg: hex || "#6366f1",
  }
}

function getGradientForStatus(status: string) {
  const s = status.toLowerCase()
  if (s.includes("done") || s.includes("complete")) {
    return "from-[#34d399] via-[#6ee7b7] to-[#d1fae5]"
  }
  if (s.includes("progress") || s.includes("follow") || s.includes("revision")) {
    return "from-[#fb923c] via-[#fdba74] to-[#ffedd5]"
  }
  if (s.includes("meet") || s.includes("confirm")) {
    return "from-[#818cf8] via-[#a5b4fc] to-[#e0e7ff]"
  }
  if (s.includes("post") || s.includes("render") || s.includes("finalize")) {
    return "from-[#c084fc] via-[#e879f9] to-[#fae8ff]"
  }
  if (s.includes("wait") || s.includes("approval") || s.includes("next day")) {
    return "from-[#f87171] via-[#fca5a5] to-[#fee2e2]"
  }
  if (s.includes("holiday")) {
    return "from-[#9ca3af] via-[#d1d5db] to-[#f3f4f6]"
  }
  if (s.includes("skipped")) {
    return "from-[#a3e635] via-[#bef264] to-[#ecfccb]"
  }
  return "from-[#6366f1] via-[#818cf8] to-[#c7d2fe]"
}

function isTaskSkipped(task?: { status?: string | null } | null): boolean {
  if (!task || !task.status) return false
  const s = task.status.toLowerCase().trim()
  return s === "skipped" || s.includes("skipped")
}

function compressAndResizeImage(file: File, maxSize: number = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement("canvas")
        const width = img.width
        const height = img.height

        const minDim = Math.min(width, height)
        const startX = (width - minDim) / 2
        const startY = (height - minDim) / 2

        canvas.width = maxSize
        canvas.height = maxSize
        const ctx = canvas.getContext("2d")
        if (!ctx) {
          resolve(e.target?.result as string)
          return
        }

        ctx.drawImage(img, startX, startY, minDim, minDim, 0, 0, maxSize, maxSize)
        const dataUrl = canvas.toDataURL("image/jpeg", 0.85)
        resolve(dataUrl)
      }
      img.onerror = () => reject(new Error("Failed to load image"))
      img.src = e.target?.result as string
    }
    reader.onerror = () => reject(new Error("Failed to read file"))
    reader.readAsDataURL(file)
  })
}

function formatDate(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function getWeekStart(date: Date) {
  const start = new Date(date)
  const day = start.getDay()
  const diff = start.getDate() - day + (day === 0 ? -6 : 1) // Monday start
  start.setDate(diff)
  return start
}

function getWeekDays(startDate: Date) {
  const days = []
  const start = getWeekStart(startDate)
  for (let i = 0; i < 7; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    days.push(d)
  }
  return days
}

function getDaysDifference(startDate: string, endDate: string) {
  const start = new Date(startDate)
  const end = new Date(endDate)
  const diffTime = Math.abs(end.getTime() - start.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}

function addDays(date: string, days: number) {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result.toISOString().split("T")[0]
}

export default function NewCalendarPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [statusOptions, setStatusOptions] = useState<Record<string, { color: string; hex: string; category: string }>>({})
  const [statusesLoaded, setStatusesLoaded] = useState(false)
  const [loading, setLoading] = useState(true)

  // Real Current Date (Today)
  const [currentWeekDate, setCurrentWeekDate] = useState<Date>(() => new Date())
  const [searchQuery, setSearchQuery] = useState("")

  // Exact Modal States from original app
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isRecurringModalOpen, setIsRecurringModalOpen] = useState(false)
  const [recurringTasksToAdd, setRecurringTasksToAdd] = useState<Task[]>([])
  const [recurringType, setRecurringType] = useState<"daily" | "weekly">("weekly")

  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [duplicateLoading, setDuplicateLoading] = useState(false)
  const [modalLoading, setModalLoading] = useState({
    create: false,
    update: false,
    delete: false,
    recurring: false,
  })

  // Custom Notification Modal State (replaces browser alerts)
  const [notificationModal, setNotificationModal] = useState<{
    isOpen: boolean
    title: string
    message: string
    type: "info" | "warning" | "error" | "success"
  }>({
    isOpen: false,
    title: "Notification",
    message: "",
    type: "info",
  })

  const showNotification = (
    message: string,
    title: string = "Notification",
    type: "info" | "warning" | "error" | "success" = "info"
  ) => {
    setNotificationModal({
      isOpen: true,
      title,
      message,
      type,
    })
  }

  // Custom Confirmation Modal State (replaces browser confirm)
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean
    title: string
    message: string
    confirmText?: string
    cancelText?: string
    isDanger?: boolean
    onConfirm: () => void
  }>({
    isOpen: false,
    title: "",
    message: "",
    confirmText: "Confirm",
    cancelText: "Cancel",
    isDanger: false,
    onConfirm: () => {},
  })

  const showConfirm = ({
    title = "Confirmation",
    message = "Are you sure you want to proceed?",
    confirmText = "Confirm",
    cancelText = "Cancel",
    isDanger = false,
    onConfirm,
  }: {
    title?: string
    message?: string
    confirmText?: string
    cancelText?: string
    isDanger?: boolean
    onConfirm: () => void
  }) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      confirmText,
      cancelText,
      isDanger,
      onConfirm,
    })
  }


  // Profile Dropdown state (Image 2)
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false)

  const [authChecking, setAuthChecking] = useState(true)
  const [currentUser, setCurrentUser] = useState<{
    id: string
    email: string
    name: string
    avatar?: string
  } | null>(null)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [authModalMode, setAuthModalMode] = useState<"login" | "register" | "profile">("login")
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  const [authForm, setAuthForm] = useState({
    email: "daffi yashir",
    password: "",
    name: "daffi yashir",
    confirmPassword: "",
    currentPassword: "",
    newPassword: "",
    avatar: "",
    remember30Days: true,
  })

  const avatarFileInputRef = useRef<HTMLInputElement>(null)
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)
  const [showAvatarUrlInput, setShowAvatarUrlInput] = useState(false)

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      setAuthError("Please select a valid image file (PNG, JPG, WEBP, etc.)")
      return
    }

    try {
      setIsUploadingPhoto(true)
      const dataUrl = await compressAndResizeImage(file, 256)
      setAuthForm((prev) => ({ ...prev, avatar: dataUrl }))
      setAuthError(null)
    } catch (err: any) {
      setAuthError(err?.message || "Failed to process image")
    } finally {
      setIsUploadingPhoto(false)
      if (avatarFileInputRef.current) {
        avatarFileInputRef.current.value = ""
      }
    }
  }

  // Restore auth session on mount
  useEffect(() => {
    const token =
      localStorage.getItem("uno_auth_token") || sessionStorage.getItem("uno_auth_token")
    if (token) {
      fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.user) {
            setCurrentUser(data.user)
          } else {
            localStorage.removeItem("uno_auth_token")
            sessionStorage.removeItem("uno_auth_token")
          }
        })
        .catch(() => {
          localStorage.removeItem("uno_auth_token")
          sessionStorage.removeItem("uno_auth_token")
        })
        .finally(() => {
          setAuthChecking(false)
        })
    } else {
      setAuthChecking(false)
    }
  }, [])

  const openAuthModal = (mode: "login" | "register" | "profile") => {
    setAuthModalMode(mode)
    setAuthError(null)
    setShowPassword(false)
    setShowAvatarUrlInput(false)
    if (mode === "profile" && currentUser) {
      setAuthForm((prev) => ({
        ...prev,
        name: currentUser.name,
        email: currentUser.email,
        avatar: currentUser.avatar || "",
        currentPassword: "",
        newPassword: "",
      }))
    }
    setIsAuthModalOpen(true)
  }

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthLoading(true)
    setAuthError(null)
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: authForm.email,
          password: authForm.password,
          remember30Days: authForm.remember30Days,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to sign in")
      }
      if (authForm.remember30Days) {
        localStorage.setItem("uno_auth_token", data.token)
        sessionStorage.removeItem("uno_auth_token")
      } else {
        sessionStorage.setItem("uno_auth_token", data.token)
        localStorage.removeItem("uno_auth_token")
      }
      setCurrentUser(data.user)
      setIsAuthModalOpen(false)
      showNotification(`Welcome back, ${data.user.name}!`, "Signed In", "success")
    } catch (err: any) {
      setAuthError(err?.message || "Sign in failed")
    } finally {
      setAuthLoading(false)
    }
  }

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthLoading(true)
    setAuthError(null)
    if (authForm.password !== authForm.confirmPassword) {
      setAuthError("Passwords do not match")
      setAuthLoading(false)
      return
    }
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: authForm.name,
          email: authForm.email,
          password: authForm.password,
          remember30Days: authForm.remember30Days,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to create account")
      }
      if (authForm.remember30Days) {
        localStorage.setItem("uno_auth_token", data.token)
        sessionStorage.removeItem("uno_auth_token")
      } else {
        sessionStorage.setItem("uno_auth_token", data.token)
        localStorage.removeItem("uno_auth_token")
      }
      setCurrentUser(data.user)
      setIsAuthModalOpen(false)
      showNotification(`Account created successfully! Welcome, ${data.user.name}!`, "Registered", "success")
    } catch (err: any) {
      setAuthError(err?.message || "Registration failed")
    } finally {
      setAuthLoading(false)
    }
  }

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthLoading(true)
    setAuthError(null)
    const token =
      localStorage.getItem("uno_auth_token") || sessionStorage.getItem("uno_auth_token")
    try {
      const res = await fetch("/api/auth/me", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: authForm.name,
          email: authForm.email,
          avatar: authForm.avatar,
          currentPassword: authForm.currentPassword || undefined,
          newPassword: authForm.newPassword || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to update profile")
      }
      setCurrentUser(data.user)
      setIsAuthModalOpen(false)
      showNotification("Profile updated successfully!", "Profile Updated", "success")
    } catch (err: any) {
      setAuthError(err?.message || "Failed to update profile")
    } finally {
      setAuthLoading(false)
    }
  }

  const handleDeleteAccount = () => {
    showConfirm({
      title: "Delete Account",
      message: "Are you sure you want to permanently delete your account? This action cannot be undone.",
      confirmText: "Delete Account",
      isDanger: true,
      onConfirm: async () => {
        const token =
          localStorage.getItem("uno_auth_token") || sessionStorage.getItem("uno_auth_token")
        try {
          const res = await fetch("/api/auth/me", {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          })
          if (!res.ok) {
            const data = await res.json()
            throw new Error(data.error || "Failed to delete account")
          }
          localStorage.removeItem("uno_auth_token")
          sessionStorage.removeItem("uno_auth_token")
          setCurrentUser(null)
          setIsAuthModalOpen(false)
          showNotification("Your account has been deleted.", "Account Deleted", "info")
        } catch (err: any) {
          showNotification(err?.message || "Failed to delete account", "Error", "error")
        }
      },
    })
  }

  const handleLogout = async () => {
    const token =
      localStorage.getItem("uno_auth_token") || sessionStorage.getItem("uno_auth_token")
    if (token) {
      fetch("/api/auth/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {})
    }
    localStorage.removeItem("uno_auth_token")
    sessionStorage.removeItem("uno_auth_token")
    setCurrentUser(null)
    showNotification("You have been signed out.", "Signed Out", "info")
  }

  // Drag and drop state
  const [draggedTask, setDraggedTask] = useState<Task | null>(null)
  const [dropTarget, setDropTarget] = useState<string | null>(null)
  const [isSyncingTimes, setIsSyncingTimes] = useState(false)
  const [openPopovers, setOpenPopovers] = useState<{ [key: string]: boolean }>({})

  // Drag-to-resize duration state
  const isResizingRef = useRef(false)
  const [resizingTask, setResizingTask] = useState<{
    taskId: string
    startY: number
    initialEndSlot: string
    currentEndSlot: string
    allowedSlots: string[]
  } | null>(null)

  const [newTask, setNewTask] = useState<Omit<Task, "id" | "created_at" | "updated_at">>({
    title: "",
    description: "",
    start_date: "",
    end_date: "",
    status: "Not started",
    priority: "medium",
    recurring: "no",
    type: "descriptive",
    start_time: "10:00",
    end_time: "10:00",
  })

  // Real today date string
  const todayDateStr = useMemo(() => formatDate(new Date()), [])

  // Week days
  const weekDays = useMemo(() => getWeekDays(currentWeekDate), [currentWeekDate])
  const previousWeek = useMemo(() => getWeekDays(new Date(currentWeekDate.getTime() - 7 * 24 * 60 * 60 * 1000)), [currentWeekDate])
  const nextWeek = useMemo(() => getWeekDays(new Date(currentWeekDate.getTime() + 7 * 24 * 60 * 60 * 1000)), [currentWeekDate])

  const weekStartStr = formatDate(weekDays[0])
  const weekEndStr = formatDate(weekDays[6])

  // Pure white background effect for /new
  useEffect(() => {
    document.body.style.backgroundColor = "#ffffff"
    const parentWrapper = document.querySelector("body > div") as HTMLElement | null
    if (parentWrapper) {
      parentWrapper.style.backgroundColor = "#ffffff"
    }
    return () => {
      document.body.style.backgroundColor = "#f7f6ed"
      if (parentWrapper) {
        parentWrapper.style.backgroundColor = "#f7f6ed"
      }
    }
  }, [])

  // Fetch real statuses
  useEffect(() => {
    async function fetchStatuses() {
      try {
        const res = await fetch("/api/statuses")
        const data = await res.json()
        if (data.statuses) {
          const options = data.statuses.reduce((acc: any, status: any) => {
            acc[status.name] = { color: status.color, hex: status.hex, category: status.category }
            return acc
          }, {})
          setStatusOptions(options)
          setStatusesLoaded(true)
        }
      } catch (err) {
        console.error("Failed to fetch statuses:", err)
      }
    }
    fetchStatuses()
  }, [])

  // Grouped statuses for the exact Select dropdown
  const selectGroupedStatuses = useMemo(() => {
    if (!statusesLoaded) return {}
    const categories: Record<string, string[]> = { "To-do": [], "In progress": [], Completed: [] }
    Object.entries(statusOptions).forEach(([statusName, config]) => {
      if (categories[config.category]) {
        categories[config.category].push(statusName)
      }
    })
    Object.values(categories).forEach((list) => list.sort())
    return categories
  }, [statusOptions, statusesLoaded])

  // Two-column grouped statuses for quick status changer popover (matching Image 1)
  const groupedStatuses = useMemo((): {
    "Column 1": { [key: string]: string[] }
    "Column 2": { [key: string]: string[] }
  } => {
    if (!statusesLoaded) return { "Column 1": { "To-do": [], Completed: [] }, "Column 2": { "In progress": [] } }

    const columns: {
      "Column 1": { [key: string]: string[] }
      "Column 2": { [key: string]: string[] }
    } = {
      "Column 1": { "To-do": [], Completed: [] },
      "Column 2": { "In progress": [] },
    }

    const allStatuses = Object.entries(statusOptions)

    for (const [statusName, config] of allStatuses) {
      if (config.category === "In progress") {
        columns["Column 2"]["In progress"].push(statusName)
      } else if (config.category === "To-do") {
        columns["Column 1"]["To-do"].push(statusName)
      } else if (config.category === "Completed") {
        columns["Column 1"]["Completed"].push(statusName)
      }
    }

    // Sort statuses within each category
    Object.values(columns).forEach((column) => {
      Object.values(column).forEach((statusList) => {
        statusList.sort()
      })
    })

    return columns
  }, [statusOptions, statusesLoaded])

  // Fetch real tasks with date range
  const fetchTasks = async () => {
    try {
      setLoading(true)
      const prevMonday = new Date(weekDays[0])
      prevMonday.setDate(prevMonday.getDate() - 7)
      const nextSunday = new Date(weekDays[6])
      nextSunday.setDate(nextSunday.getDate() + 7)

      const startQuery = formatDate(prevMonday)
      const endQuery = formatDate(nextSunday)

      const res = await fetch(`/api/tasks?startDate=${startQuery}&endDate=${endQuery}`)
      const data = await res.json()

      if (data.tasks) {
        setTasks(data.tasks)
      }
    } catch (err) {
      console.error("Error loading tasks:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTasks()
  }, [currentWeekDate])

  // Filter tasks for current week
  const weekTasks = useMemo(() => {
    return tasks.filter((t) => {
      const matchWeek =
        (t.start_date >= weekStartStr && t.start_date <= weekEndStr) ||
        (t.end_date >= weekStartStr && t.end_date <= weekEndStr) ||
        (t.start_date <= weekStartStr && t.end_date >= weekEndStr)
      if (!matchWeek) return false
      if (searchQuery.trim()) {
        return (
          t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.status.toLowerCase().includes(searchQuery.toLowerCase())
        )
      }
      return true
    })
  }, [tasks, weekStartStr, weekEndStr, searchQuery])

  // Metrics for current week
  const metrics = useMemo(() => {
    const total = weekTasks.length
    const done = weekTasks.filter((t) => t.status.toLowerCase() === "done").length
    const incomplete = weekTasks.filter(
      (t) =>
        t.status.toLowerCase() !== "done" &&
        !isTaskSkipped(t) &&
        t.status.toLowerCase() !== "holiday"
    ).length
    const skipped = weekTasks.filter((t) => isTaskSkipped(t)).length

    return {
      total,
      assigned: total,
      incomplete,
      complete: done,
      overdue: skipped,
    }
  }, [weekTasks])

  // Separate multi-day tasks (2-3+ days) vs single-day tasks
  const { multiDayTracks, singleDaySlotMap, masterSpanMap, slaveSlotSet } = useMemo(() => {
    const multiDayList: Task[] = []
    const singleDayList: Task[] = []

    weekTasks.forEach((t) => {
      if (t.start_date !== t.end_date) {
        multiDayList.push(t)
      } else {
        singleDayList.push(t)
      }
    })

    // 1. Process Multi-day Tasks -> place at 09:00 AM with exact column spans
    const mappedMulti = multiDayList.map((task) => {
      let startCol = 0
      let endCol = 6

      for (let i = 0; i < 7; i++) {
        const dStr = formatDate(weekDays[i])
        if (dStr === task.start_date) startCol = i
        if (dStr === task.end_date) endCol = i
      }
      if (task.start_date < weekStartStr) startCol = 0
      if (task.end_date > weekEndStr) endCol = 6

      startCol = Math.max(0, Math.min(6, startCol))
      endCol = Math.max(startCol, Math.min(6, endCol))
      const span = endCol - startCol + 1

      return { task, startCol, endCol, span }
    })

    // Auto sort: non-skipped first, skipped placed at lowest available position
    const activeMulti = mappedMulti
      .filter((item) => !isTaskSkipped(item.task))
      .sort((a, b) => a.startCol - b.startCol || b.span - a.span)

    const skippedMulti = mappedMulti
      .filter((item) => isTaskSkipped(item.task))
      .sort((a, b) => a.startCol - b.startCol || b.span - a.span)

    const tracks: Array<Array<{ task: Task; startCol: number; endCol: number; span: number }>> = []

    // Place active multi-day tasks into upper tracks
    activeMulti.forEach((item) => {
      let placedTrack = -1
      for (let tr = 0; tr < tracks.length; tr++) {
        const collides = tracks[tr].some(
          (existing) => !(item.endCol < existing.startCol || item.startCol > existing.endCol)
        )
        if (!collides) {
          placedTrack = tr
          break
        }
      }
      if (placedTrack === -1) {
        placedTrack = tracks.length
        tracks.push([])
      }
      tracks[placedTrack].push(item)
    })

    // Opsi 2: Place skipped multi-day tasks into lowest existing track that has room without collision
    skippedMulti.forEach((item) => {
      let placedTrack = -1
      for (let tr = tracks.length - 1; tr >= 0; tr--) {
        const collides = tracks[tr].some(
          (existing) => !(item.endCol < existing.startCol || item.startCol > existing.endCol)
        )
        if (!collides) {
          placedTrack = tr
          break
        }
      }
      if (placedTrack === -1) {
        placedTrack = tracks.length
        tracks.push([])
      }
      tracks[placedTrack].push(item)
    })

    // Ensure items within each track are sorted by start column
    tracks.forEach((track) => {
      track.sort((a, b) => a.startCol - b.startCol)
    })

    // 2. Process Single-day Tasks -> distribute across remaining slots (10:00 - 17:00)
    const slotMap: Record<string, Task[]> = {}
    const singleByDate: Record<string, Task[]> = {}
    const masterSpans: Record<string, number> = {}
    const slaves = new Set<string>()

    const getTaskStartTime = (t: Task): string => {
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem(`uno_task_starttime_${t.id}`)
        if (saved) return saved === "12:00" ? "13:00" : saved
      }
      if (t.start_time) return t.start_time === "12:00" ? "13:00" : t.start_time
      if (t.start_date === "2026-09-22" && t.title.toLowerCase().includes("chelsea content")) {
        return "13:00"
      }
      return "10:00"
    }

    const getTaskEndTime = (t: Task): string => {
      if (resizingTask && resizingTask.taskId === t.id) {
        return resizingTask.currentEndSlot
      }
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem(`uno_task_endtime_${t.id}`)
        if (saved) return saved === "12:00" ? "13:00" : saved
      }
      if (t.end_time) return t.end_time === "12:00" ? "13:00" : t.end_time
      if (t.start_date === "2026-09-22" && t.title.toLowerCase().includes("chelsea content")) {
        return "14:00"
      }
      return getTaskStartTime(t)
    }

    singleDayList.forEach((t) => {
      if (!singleByDate[t.start_date]) singleByDate[t.start_date] = []
      singleByDate[t.start_date].push(t)
    })

    Object.entries(singleByDate).forEach(([dateStr, dayTasks]) => {
      const activeTasks = dayTasks.filter((t) => !isTaskSkipped(t))
      const skippedTasks = dayTasks.filter((t) => isTaskSkipped(t))

      const remainingActive: Task[] = []

      // Place active tasks: if start_time is set in DB or title match, place directly!
      activeTasks.forEach((t) => {
        let placed = false
        if (t.start_time || (t.start_date === "2026-09-22" && t.title.toLowerCase().includes("chelsea content"))) {
          const effectiveStart = getTaskStartTime(t)
          const effectiveEnd = getTaskEndTime(t)
          const occupied = getTaskOccupiedSlots(effectiveStart, effectiveEnd)
          const masterSlot = occupied[0]
          const key = `${dateStr}_${masterSlot}`
          if (!slotMap[key]) slotMap[key] = []
          slotMap[key].push(t)
          masterSpans[t.id] = occupied.length
          for (let i = 1; i < occupied.length; i++) {
            slaves.add(`${dateStr}_${occupied[i]}`)
          }
          placed = true
        } else {
          for (const slotItem of REMAINING_TIME_SLOTS) {
            const regexDot = new RegExp(`^${slotItem.slot.replace(":", "\\.")}`, "i")
            const regexColon = new RegExp(`^${slotItem.slot}`, "i")
            if (regexDot.test(t.title) || regexColon.test(t.title)) {
              const effectiveEnd = getTaskEndTime(t)
              const occupied = getTaskOccupiedSlots(slotItem.slot, effectiveEnd)
              const masterSlot = occupied[0]
              const key = `${dateStr}_${masterSlot}`
              if (!slotMap[key]) slotMap[key] = []
              slotMap[key].push(t)
              masterSpans[t.id] = occupied.length
              for (let i = 1; i < occupied.length; i++) {
                slaves.add(`${dateStr}_${occupied[i]}`)
              }
              placed = true
              break
            }
          }
        }
        if (!placed) remainingActive.push(t)
      })

      // Distribute remaining active tasks across non-slave slots
      let sIdx = 0
      remainingActive.forEach((t) => {
        let attempts = 0
        while (attempts < REMAINING_TIME_SLOTS.length) {
          const candidateSlot = REMAINING_TIME_SLOTS[sIdx % REMAINING_TIME_SLOTS.length].slot
          sIdx++
          attempts++
          if (!slaves.has(`${dateStr}_${candidateSlot}`)) {
            const key = `${dateStr}_${candidateSlot}`
            if (!slotMap[key]) slotMap[key] = []
            slotMap[key].push(t)
            masterSpans[t.id] = 1
            break
          }
        }
      })

      // For skipped tasks: if start_time is set in DB, place directly; otherwise distribute to bottom slots
      const remainingSkipped: Task[] = []
      skippedTasks.forEach((t) => {
        if (t.start_time) {
          const effectiveStart = getTaskStartTime(t)
          const effectiveEnd = getTaskEndTime(t)
          const occupied = getTaskOccupiedSlots(effectiveStart, effectiveEnd)
          const masterSlot = occupied[0]
          const key = `${dateStr}_${masterSlot}`
          if (!slotMap[key]) slotMap[key] = []
          slotMap[key].push(t)
          masterSpans[t.id] = occupied.length
          for (let i = 1; i < occupied.length; i++) {
            slaves.add(`${dateStr}_${occupied[i]}`)
          }
        } else {
          remainingSkipped.push(t)
        }
      })

      const lastSlotIndex = REMAINING_TIME_SLOTS.length - 1
      remainingSkipped.forEach((t, i) => {
        const targetSlotIndex = Math.max(0, lastSlotIndex - (i % REMAINING_TIME_SLOTS.length))
        const targetSlot = REMAINING_TIME_SLOTS[targetSlotIndex].slot
        const key = `${dateStr}_${targetSlot}`
        if (!slotMap[key]) slotMap[key] = []
        slotMap[key].push(t)
        masterSpans[t.id] = 1
      })
    })

    // In any slot, ensure skipped tasks are strictly sorted to the bottom of the card list
    Object.keys(slotMap).forEach((key) => {
      slotMap[key].sort((a, b) => {
        const aSkip = isTaskSkipped(a) ? 1 : 0
        const bSkip = isTaskSkipped(b) ? 1 : 0
        return aSkip - bSkip
      })
    })

    return { multiDayTracks: tracks, singleDaySlotMap: slotMap, masterSpanMap: masterSpans, slaveSlotSet: slaves }
  }, [weekTasks, weekDays, weekStartStr, weekEndStr, resizingTask])

  // Navigation handlers
  const handlePrevWeek = () => {
    const prev = new Date(currentWeekDate)
    prev.setDate(prev.getDate() - 7)
    setCurrentWeekDate(prev)
  }

  const handleNextWeek = () => {
    const next = new Date(currentWeekDate)
    next.setDate(next.getDate() + 7)
    setCurrentWeekDate(next)
  }

  const handleToday = () => {
    setCurrentWeekDate(new Date())
  }

  // Drag and drop drop handler
  const handleDropTask = async (targetDateStr: string, targetTimeSlot: string) => {
    if (!draggedTask) return
    const task = draggedTask
    setDraggedTask(null)
    setDropTarget(null)

    // Calculate duration in case it's a multi-day task
    const isMultiDay = task.start_date !== task.end_date
    let newStartDate = targetDateStr
    let newEndDate = targetDateStr

    if (isMultiDay) {
      const origStart = new Date(task.start_date).getTime()
      const origEnd = new Date(task.end_date).getTime()
      const dayDiff = Math.max(0, Math.round((origEnd - origStart) / (1000 * 60 * 60 * 24)))
      const endD = new Date(targetDateStr)
      endD.setDate(endD.getDate() + dayDiff)
      newEndDate = formatDate(endD)
    }

    // Optimistic UI update
    setTasks((prev) =>
      prev.map((t) =>
        t.id === task.id
          ? {
              ...t,
              start_date: newStartDate,
              end_date: newEndDate,
              start_time: targetTimeSlot,
            }
          : t
      )
    )

    // Persist to DB via PUT /api/tasks/[id]
    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: task.title,
          description: task.description,
          start_date: newStartDate,
          end_date: newEndDate,
          status: task.status,
          priority: task.priority,
          recurring: task.recurring,
          start_time: targetTimeSlot,
        }),
      })
      if (!response.ok) {
        console.error("Failed to update task position on server")
      }
    } catch (err) {
      console.error("Error saving task drop position:", err)
    }
  }

  // Bulk sync current week's displayed time slots to DB
  const handleSyncCurrentWeekTimesToDb = async () => {
    try {
      setIsSyncingTimes(true)
      const updates: Array<{ id: string; start_time: string; start_date?: string; end_date?: string }> = []

      // Multi-day tasks at 09:00
      multiDayTracks.forEach((track) => {
        track.forEach((item) => {
          updates.push({
            id: item.task.id,
            start_time: "09:00",
            start_date: item.task.start_date,
            end_date: item.task.end_date,
          })
        })
      })

      // Single-day tasks from singleDaySlotMap
      Object.entries(singleDaySlotMap).forEach(([key, taskList]) => {
        const parts = key.split("_")
        const slotTime = parts[1]
        taskList.forEach((t) => {
          updates.push({
            id: t.id,
            start_time: slotTime,
            start_date: t.start_date,
            end_date: t.end_date,
          })
        })
      })

      if (updates.length === 0) {
        showNotification("No tasks to sync for this week.", "Sync Times", "info")
        return
      }

      const res = await fetch("/api/tasks/sync-times", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      })
      const data = await res.json()

      if (data.success) {
        if (data.failed > 0 && data.results?.[0]?.error?.includes("start_time")) {
          showNotification(
            "Kolom 'start_time' belum ada di Supabase. Silakan jalankan script SQL di Supabase SQL Editor: ALTER TABLE tasks ADD COLUMN IF NOT EXISTS start_time VARCHAR(10) DEFAULT NULL;",
            "Perlu Eksekusi SQL",
            "warning"
          )
        } else {
          showNotification(
            `Berhasil menyimpan posisi jam untuk ${data.updated} task minggu ini ke database!`,
            "Waktu Tersimpan",
            "success"
          )
          fetchTasks()
        }
      } else {
        showNotification(`Sync failed: ${data.error || "Unknown error"}`, "Sync Error", "error")
      }
    } catch (err) {
      console.error("Failed to sync times:", err)
      showNotification("Error syncing times to database.", "Sync Error", "error")
    } finally {
      setIsSyncingTimes(false)
    }
  }

  // Quick status changer handler (matching Image 1)
  const handleQuickStatusChange = async (taskId: string, newStatus: string) => {
    // Optimistic UI update
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)))
    setOpenPopovers((prev) => ({ ...prev, [taskId]: false }))

    const task = tasks.find((t) => t.id === taskId)
    if (!task) return

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...task,
          status: newStatus,
        }),
      })
      if (!response.ok) {
        console.error("Failed to update status on server")
      }
    } catch (err) {
      console.error("Failed to update status:", err)
      showNotification("Failed to update status. Please try again.", "Error", "error")
    }
  }

  // Resize duration handlers
  const handleResizeStart = (task: Task, e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    isResizingRef.current = true

    const startTime = task.start_time || "10:00"
    const normStart = startTime === "12:00" ? "13:00" : startTime
    const isMorning = MORNING_SLOTS.includes(normStart)
    const allowedSlots = isMorning ? MORNING_SLOTS : AFTERNOON_SLOTS
    const initialEndSlot =
      (typeof window !== "undefined" && localStorage.getItem(`uno_task_endtime_${task.id}`)) ||
      task.end_time ||
      (task.start_date === "2026-09-22" && task.title.toLowerCase().includes("chelsea content")
        ? "14:00"
        : normStart)

    setResizingTask({
      taskId: task.id,
      startY: e.clientY,
      initialEndSlot,
      currentEndSlot: initialEndSlot,
      allowedSlots,
    })
  }

  useEffect(() => {
    if (!resizingTask) return

    const handleMouseMove = (e: MouseEvent) => {
      const { taskId, startY, initialEndSlot, allowedSlots } = resizingTask
      const task = tasks.find((t) => t.id === taskId)
      const startTime = task?.start_time || "10:00"
      const normStart = startTime === "12:00" ? "13:00" : startTime
      const startIdx = allowedSlots.indexOf(normStart)
      const initEndIdx = allowedSlots.indexOf(initialEndSlot)
      if (startIdx === -1 || initEndIdx === -1) return

      const deltaY = e.clientY - startY
      const step = Math.round(deltaY / 60)
      const newEndIdx = Math.max(startIdx, Math.min(allowedSlots.length - 1, initEndIdx + step))
      const newEndSlot = allowedSlots[newEndIdx]

      if (newEndSlot !== resizingTask.currentEndSlot) {
        setResizingTask((prev) => (prev ? { ...prev, currentEndSlot: newEndSlot } : null))
      }
    }

    const handleMouseUp = async () => {
      const { taskId, currentEndSlot, initialEndSlot } = resizingTask
      setResizingTask(null)
      // Keep isResizingRef true briefly to swallow any trailing click events
      setTimeout(() => {
        isResizingRef.current = false
      }, 200)

      if (currentEndSlot && currentEndSlot !== initialEndSlot) {
        if (typeof window !== "undefined") {
          localStorage.setItem(`uno_task_endtime_${taskId}`, currentEndSlot)
        }
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, end_time: currentEndSlot } : t))
        )
        try {
          await fetch(`/api/tasks/${taskId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ end_time: currentEndSlot }),
          })
          // No popup notification on resize per user request
        } catch (err) {
          console.error("Error saving task resize:", err)
        }
      }
    }

    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("mouseup", handleMouseUp)

    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
    }
  }, [resizingTask, tasks])

  // Exact Modal Handlers from app/page.tsx
  const resetForm = () => {
    setNewTask({
      title: "",
      description: "",
      start_date: "",
      end_date: "",
      status: "Not started",
      priority: "medium",
      recurring: "no",
      type: "descriptive",
      start_time: "10:00",
      end_time: "10:00",
    })
    setIsCreateModalOpen(false)
    setEditingTask(null)
  }

  const handleNewTaskClick = (prefillDate?: string, prefillTime?: string) => {
    setEditingTask(null)
    const today = prefillDate || formatDate(new Date())
    const initTime = prefillTime || "10:00"
    setNewTask({
      title: "",
      description: "",
      start_date: today,
      end_date: today,
      status: "Not started",
      priority: "medium",
      recurring: "no",
      type: "descriptive",
      start_time: initTime,
      end_time: initTime,
    })
    setIsCreateModalOpen(true)
  }

  const handleEditTask = (task: Task) => {
    const startTime = task.start_time || "10:00"
    const normStart = startTime === "12:00" ? "13:00" : startTime
    const initialEndTime =
      (typeof window !== "undefined" && localStorage.getItem(`uno_task_endtime_${task.id}`)) ||
      task.end_time ||
      (task.start_date === "2026-09-22" && task.title.toLowerCase().includes("chelsea content")
        ? "14:00"
        : normStart)

    setNewTask({
      title: task.title,
      description: task.description || "",
      start_date: task.start_date,
      end_date: task.end_date,
      status: task.status,
      priority: task.priority || "medium",
      recurring: task.recurring || "no",
      type: task.type || "descriptive",
      start_time: normStart,
      end_time: initialEndTime,
    })
    setEditingTask(task)
    setIsCreateModalOpen(true)
  }

  const handleCreateTask = async () => {
    if (!newTask.title) return

    try {
      setModalLoading((prev) => ({ ...prev, create: true }))
      const taskData = {
        ...newTask,
        start_date: newTask.start_date || formatDate(new Date()),
        end_date: newTask.end_date || newTask.start_date || formatDate(new Date()),
      }

      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(taskData),
      })

      const data = await response.json()

      if (response.ok) {
        if (typeof window !== "undefined" && newTask.end_time && data.task?.id) {
          localStorage.setItem(`uno_task_endtime_${data.task.id}`, newTask.end_time)
        }
        setTasks((prev) => [...prev, { ...data.task, end_time: newTask.end_time, start_time: newTask.start_time }])
        resetForm()
      } else {
        showNotification(`Failed to create task: ${data.error}`, "Create Task Failed", "error")
      }
    } catch (error) {
      console.error("Error creating task:", error)
      showNotification("Error creating task. Please try again.", "Error", "error")
    } finally {
      setModalLoading((prev) => ({ ...prev, create: false }))
    }
  }

  const handleUpdateTask = async () => {
    if (!editingTask || !newTask.title) return

    try {
      setModalLoading((prev) => ({ ...prev, update: true }))
      if (typeof window !== "undefined" && newTask.end_time) {
        localStorage.setItem(`uno_task_endtime_${editingTask.id}`, newTask.end_time)
      }
      if (typeof window !== "undefined" && newTask.start_time) {
        localStorage.setItem(`uno_task_starttime_${editingTask.id}`, newTask.start_time)
      }

      const response = await fetch(`/api/tasks/${editingTask.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTask),
      })

      const data = await response.json()

      if (response.ok) {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === editingTask.id
              ? { ...t, ...data.task, start_time: newTask.start_time, end_time: newTask.end_time }
              : t
          )
        )
        resetForm()
      } else {
        showNotification(`Failed to update task: ${data.error}`, "Update Task Failed", "error")
      }
    } catch (error) {
      console.error("Error updating task:", error)
      showNotification("Error updating task. Please try again.", "Error", "error")
    } finally {
      setModalLoading((prev) => ({ ...prev, update: false }))
    }
  }

  const handleDeleteTask = (taskId: string) => {
    showConfirm({
      title: "Delete Task",
      message: "Are you sure you want to delete this task? This action cannot be undone.",
      confirmText: "Delete",
      cancelText: "Cancel",
      isDanger: true,
      onConfirm: async () => {
        try {
          setModalLoading((prev) => ({ ...prev, delete: true }))
          const response = await fetch(`/api/tasks/${taskId}`, {
            method: "DELETE",
          })

          if (response.ok) {
            setTasks((prev) => prev.filter((t) => t.id !== taskId))
            resetForm()
            setConfirmModal((prev) => ({ ...prev, isOpen: false }))
          } else {
            showNotification("Failed to delete task", "Error", "error")
          }
        } catch (e) {
          console.error("Failed to delete task", e)
          showNotification("Failed to delete task", "Error", "error")
        } finally {
          setModalLoading((prev) => ({ ...prev, delete: false }))
        }
      },
    })
  }

  const handleDuplicateTask = () => {
    if (!editingTask) return
    setDuplicateLoading(true)
    const baseTitle = editingTask.title.replace(/ \d+$/, "")
    const similarTasks = tasks.filter((t) => t.title.startsWith(baseTitle) && t.type === editingTask.type)
    let maxNum = 1
    similarTasks.forEach((t) => {
      const match = t.title.match(/ (\d+)$/)
      if (match) {
        const num = Number.parseInt(match[1], 10)
        if (num > maxNum) maxNum = num
      }
    })
    const newTitle = `${baseTitle} ${maxNum + 1}`
    const newTaskData = {
      ...editingTask,
      id: undefined,
      created_at: undefined,
      updated_at: undefined,
      title: newTitle,
      type: editingTask.type,
    }
    fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newTaskData),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.task) setTasks((prev) => [...prev, data.task])
        setIsCreateModalOpen(false)
        resetForm()
      })
      .finally(() => setDuplicateLoading(false))
  }

  // Exact + Add weekly handler from app/page.tsx
  const handleRecurringTasksClick = () => {
    const prevWeekStart = formatDate(previousWeek[0])
    const prevWeekEnd = formatDate(previousWeek[6])
    const recurringTasksFromPrevWeek = tasks.filter(
      (task) =>
        task.start_date &&
        task.start_date >= prevWeekStart &&
        task.start_date <= prevWeekEnd &&
        task.recurring === "weekly",
    )

    if (recurringTasksFromPrevWeek.length === 0) {
      showNotification("No weekly recurring tasks found in the previous week.", "Weekly Tasks", "info")
      return
    }

    const currentWeekStart = formatDate(weekDays[0])
    const currentWeekEnd = formatDate(weekDays[6])

    const tasksToAdd: Task[] = []

    recurringTasksFromPrevWeek.forEach((task) => {
      const taskExistsInCurrentWeek = tasks.some(
        (t) => t.title === task.title && t.start_date >= currentWeekStart && t.start_date <= currentWeekEnd,
      )

      if (!taskExistsInCurrentWeek) {
        const originalDayIndex = previousWeek.findIndex((d) => formatDate(d) === task.start_date)
        if (originalDayIndex !== -1) {
          const newStartDate = formatDate(weekDays[originalDayIndex])
          const duration = getDaysDifference(task.start_date, task.end_date)
          const newEndDate = addDays(newStartDate, duration)

          tasksToAdd.push({
            ...task,
            start_date: newStartDate,
            end_date: newEndDate,
            status: task.status === "Meeting" || task.status === "Holiday" ? task.status : "Not started",
            type: task.type,
            description: task.type === "checklist" ? "" : task.description,
          })
        }
      }
    })

    if (tasksToAdd.length === 0) {
      showNotification("All weekly recurring tasks from the previous week are already present this week.", "Weekly Tasks", "info")
      return
    }

    setRecurringType("weekly")
    setRecurringTasksToAdd(tasksToAdd)
    setIsRecurringModalOpen(true)
  }

  const handleConfirmRecurringTasks = async () => {
    if (recurringTasksToAdd.length === 0) return

    try {
      setModalLoading((prev) => ({ ...prev, recurring: true }))
      const tasksToCreate = recurringTasksToAdd.map((task) => {
        const { id, created_at, updated_at, ...rest } = task
        return rest
      })
      const response = await fetch("/api/tasks/recurring", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ tasks: tasksToCreate }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      setTasks([...tasks, ...data.tasks])
      setIsRecurringModalOpen(false)
      setRecurringTasksToAdd([])
    } catch (error) {
      console.error("Error creating recurring tasks:", error)
      showNotification(`Failed to create recurring tasks: ${error instanceof Error ? error.message : "Unknown error"}`, "Error", "error")
    } finally {
      setModalLoading((prev) => ({ ...prev, recurring: false }))
    }
  }

  // Format month and range labels
  const monthYearLabel = weekDays[0].toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  })

  const weekRangeLabel = `${weekDays[0].toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })} - ${weekDays[6].toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })}`


  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            html, body {
              background-color: #ffffff !important;
              background: #ffffff !important;
            }
            body > div:first-child, main {
              background-color: #ffffff !important;
              background: #ffffff !important;
            }
            [data-radix-dialog-overlay] {
              background-color: rgba(0, 0, 0, 0.45) !important;
              background: rgba(0, 0, 0, 0.45) !important;
              backdrop-filter: blur(4px) !important;
              -webkit-backdrop-filter: blur(4px) !important;
              position: fixed !important;
              inset: 0 !important;
              z-index: 50 !important;
            }
          `,
        }}
      />
      <div className="w-full bg-white text-gray-900 font-sans antialiased flex flex-col gap-4">
        <div className="w-full flex flex-col gap-4">
          {/* Top Header: Clean Uno_logo on left, Search, + Add weekly, and User profile on right */}
          <header className="flex items-center justify-between gap-4 py-1">
            {/* Brand Logo: Clean Uno_logo.png */}
            <div className="flex items-center gap-3">
              <img
                src="/Uno_logo.png"
                alt="Uno Logo"
                className="h-8 sm:h-9 w-auto object-contain cursor-pointer transition-transform hover:scale-105"
              />
            </div>

            {/* Right utility items */}
            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="relative flex items-center bg-gray-50 border border-gray-200/90 rounded-full px-3.5 py-1.5 w-48 sm:w-60 focus-within:ring-2 focus-within:ring-indigo-300 shadow-2xs">
                <Search className="w-3.5 h-3.5 text-gray-400 mr-2 shrink-0" />
                <input
                  type="text"
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent text-xs text-gray-700 outline-none w-full placeholder:text-gray-400"
                />
              </div>

              {/* + Add weekly Button */}
              <button
                onClick={handleRecurringTasksClick}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-gray-300 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-800 shadow-2xs transition-all active:scale-95"
              >
                <span>+ Add weekly</span>
              </button>

              {/* + New Button */}
              <button
                onClick={() => handleNewTaskClick()}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-1.5 rounded-full shadow-md shadow-blue-200 transition-all active:scale-95 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New</span>
              </button>

              {/* Combined Profile Account & Settings Dropdown (Image 2) */}
              <Popover open={isProfileDropdownOpen} onOpenChange={setIsProfileDropdownOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="relative flex items-center justify-center w-9 h-9 rounded-full ring-2 ring-blue-500/20 hover:ring-blue-500/40 transition-all cursor-pointer shrink-0 overflow-hidden shadow-2xs active:scale-95"
                    title={currentUser ? `${currentUser.name} (${currentUser.email})` : "Account & Settings"}
                  >
                    {authChecking ? (
                      <div className="w-full h-full bg-blue-50 flex items-center justify-center">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                      </div>
                    ) : currentUser?.avatar ? (
                      <img
                        src={currentUser.avatar}
                        alt={currentUser.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold">
                        {currentUser ? (
                          currentUser.name.charAt(0).toUpperCase()
                        ) : (
                          <User className="w-4 h-4 text-white" />
                        )}
                      </div>
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  align="end"
                  sideOffset={8}
                  className="w-64 p-2 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 animate-in fade-in-50 zoom-in-95 duration-150"
                >
                  {/* Account Header */}
                  <div className="p-2.5 bg-gray-50/90 rounded-xl mb-1.5 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileDropdownOpen(false)
                        openAuthModal("profile")
                      }}
                      className="group relative w-10 h-10 rounded-full overflow-hidden bg-blue-100 shrink-0 flex items-center justify-center cursor-pointer ring-1 ring-gray-200 hover:ring-blue-500 transition-all shadow-2xs active:scale-95"
                      title="Click to change profile photo"
                    >
                      {currentUser?.avatar ? (
                        <img src={currentUser.avatar} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-5 h-5 text-blue-600" />
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Camera className="w-4 h-4 text-white" />
                      </div>
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-bold text-gray-900 truncate">
                          {currentUser ? currentUser.name : "Guest User"}
                        </p>
                        {currentUser && (
                          <span className="text-[9px] font-semibold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded-full">
                            30d
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-500 truncate">
                        {currentUser ? currentUser.email : "Not signed in"}
                      </p>
                    </div>
                  </div>

                  {/* Settings section matching Image 2 */}
                  <div className="py-1">
                    <p className="px-2.5 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      Settings
                    </p>
                    <Link
                      href="/settings"
                      onClick={() => setIsProfileDropdownOpen(false)}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                    >
                      <Tag className="w-3.5 h-3.5 text-gray-400" />
                      <span>Manage Statuses</span>
                    </Link>
                    <Link
                      href="/colors"
                      onClick={() => setIsProfileDropdownOpen(false)}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                    >
                      <Palette className="w-3.5 h-3.5 text-gray-400" />
                      <span>Manage Color</span>
                    </Link>
                  </div>

                  <div className="h-px bg-gray-100 my-1" />

                  {/* Account actions */}
                  <div className="py-1">
                    <p className="px-2.5 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      Account
                    </p>
                    {currentUser ? (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setIsProfileDropdownOpen(false)
                            openAuthModal("profile")
                          }}
                          className="w-full flex items-center justify-between px-2.5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer text-left"
                        >
                          <div className="flex items-center gap-2.5">
                            <Camera className="w-3.5 h-3.5 text-blue-600" />
                            <span>Change Photo</span>
                          </div>
                          <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full font-medium">
                            Edit
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsProfileDropdownOpen(false)
                            openAuthModal("profile")
                          }}
                          className="w-full flex items-center gap-2.5 px-2.5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer text-left"
                        >
                          <Settings className="w-3.5 h-3.5 text-gray-400" />
                          <span>Profile & Password</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsProfileDropdownOpen(false)
                            handleLogout()
                          }}
                          className="w-full flex items-center gap-2.5 px-2.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer text-left"
                        >
                          <LogOut className="w-3.5 h-3.5 text-rose-500" />
                          <span>Sign Out</span>
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setIsProfileDropdownOpen(false)
                          openAuthModal("login")
                        }}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors cursor-pointer"
                      >
                        <Lock className="w-3.5 h-3.5 text-white" />
                        <span>Sign In / Register</span>
                      </button>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </header>

          {/* Main Calendar View: Fixed Width per Day & Consistent Multi-Day Cards */}
          <section className="bg-white rounded-3xl border border-gray-200/90 p-4 sm:p-5 shadow-sm flex flex-col">
            {/* Calendar Header Controls */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                {/* Dynamic Month Year */}
                <h2 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight">
                  {monthYearLabel}
                </h2>
                {/* Dynamic Week Range */}
                <span className="text-[11px] text-gray-500 font-medium bg-gray-100 px-2.5 py-0.5 rounded-full">
                  {weekRangeLabel}
                </span>
                {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500" />}
              </div>

              {/* Navigation and Action Buttons */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {/* Prev / Next Week Controls */}
                <div className="flex items-center gap-1 mr-1">
                  <button
                    onClick={handlePrevWeek}
                    className="w-7 h-7 rounded-full border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-center text-gray-600 transition-colors shadow-2xs cursor-pointer"
                    title="Previous Week"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={handleNextWeek}
                    className="w-7 h-7 rounded-full border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-center text-gray-600 transition-colors shadow-2xs cursor-pointer"
                    title="Next Week"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Today Button */}
                <button
                  onClick={handleToday}
                  className="px-3 py-1 rounded-full border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-colors shadow-2xs active:scale-95 cursor-pointer"
                >
                  Today
                </button>

                {/* Interactive Date Picker (matching edit task popup) */}
                <DatePicker
                  value={formatDate(currentWeekDate)}
                  onChange={(dateStr) => {
                    if (dateStr) {
                      const [y, m, d] = dateStr.split("-").map(Number)
                      setCurrentWeekDate(new Date(y, m - 1, d))
                    } else {
                      setCurrentWeekDate(new Date())
                    }
                  }}
                  placeholder="Pick Date"
                  position="bottom-right"
                  variant="pill"
                />
              </div>
            </div>

            {/* Calendar Table Grid with strictly FIXED width per day */}
            <div className="overflow-x-auto">
              <div className="min-w-[1040px]">
                {/* 1. Day Headers Row (Mathematically 100% equal fixed width) */}
                <div
                  className="grid gap-2 mb-2 items-center"
                  style={{ gridTemplateColumns: GRID_TEMPLATE }}
                >
                  <div className="w-[56px] min-w-[56px]" />
                  {weekDays.map((day, idx) => {
                    const dayName = day.toLocaleDateString("en-US", { weekday: "short" })
                    const dayNum = day.getDate()
                    const dateStr = formatDate(day)
                    const isToday = dateStr === todayDateStr

                    return (
                      <div
                        key={idx}
                        className={`text-center py-1.5 px-1 rounded-xl text-xs font-semibold transition-all min-w-0 w-full overflow-hidden ${
                          isToday
                            ? "bg-blue-600 text-white shadow-sm shadow-blue-300"
                            : "text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex items-center justify-center gap-1 truncate">
                          <span>{dayName}</span>
                          <span
                            className={`text-[11px] ${
                              isToday ? "font-bold text-white" : "font-normal text-gray-400"
                            }`}
                          >
                            {dayNum}
                          </span>
                        </div>
                        {isToday && (
                          <span className="text-[9px] font-medium tracking-wide uppercase block -mt-0.5 opacity-90 truncate">
                            Today
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* 2. Jam 09:00 AM Slot with Multi-Day Cards & Single-Day 09:00 tasks */}
                {(() => {
                  const rendered0900TaskIds = new Set<string>()

                  const renderSingleDayTaskCard = (
                    task: Task,
                    isMultiInCell: boolean = false,
                    spanCount: number = 1
                  ) => {
                    const statusHex =
                      statusOptions[task.status]?.hex ||
                      (task.status.toLowerCase() === "done"
                        ? "#0bc144"
                        : isTaskSkipped(task)
                        ? "#7ed321"
                        : task.status.toLowerCase() === "pending"
                        ? "#ec4899"
                        : undefined)
                    const theme = getCardTheme(task.status, statusHex)
                    const isChelseaContent =
                      task.start_date === "2026-09-22" &&
                      task.title.toLowerCase().includes("chelsea content")
                    const effectiveEndTime =
                      (typeof window !== "undefined" &&
                        localStorage.getItem(`uno_task_endtime_${task.id}`)) ||
                      task.end_time ||
                      (isChelseaContent ? "14:00" : task.start_time || "10:00")

                    return (
                      <div
                        key={task.id}
                        draggable={!resizingTask}
                        onDragStart={(e) => {
                          e.stopPropagation()
                          e.dataTransfer.setData("text/plain", task.id)
                          setDraggedTask(task)
                        }}
                        onDragEnd={() => {
                          setDraggedTask(null)
                          setDropTarget(null)
                        }}
                        onClick={(e) => {
                          if (isResizingRef.current) {
                            e.stopPropagation()
                            e.preventDefault()
                            return
                          }
                          e.stopPropagation()
                          handleEditTask(task)
                        }}
                        style={theme.cardStyle}
                        className={`rounded-2xl px-3 py-2 border shadow-2xs hover:shadow-md transition-all duration-150 cursor-grab active:cursor-grabbing flex flex-col justify-between group/card overflow-hidden min-w-0 w-full relative ${
                          draggedTask?.id === task.id ? "opacity-40 scale-95" : ""
                        } ${
                          spanCount > 1
                            ? "h-full min-h-[116px]"
                            : isMultiInCell
                            ? "min-h-[46px]"
                            : "h-full min-h-[50px]"
                        }`}
                      >
                        <div className="space-y-1">
                          <h4
                            className={`text-[13px] font-bold ${
                              spanCount > 1
                                ? "line-clamp-4 break-words leading-snug"
                                : isMultiInCell
                                ? "truncate leading-tight"
                                : "line-clamp-2 sm:line-clamp-3 break-words leading-snug"
                            } tracking-tight group-hover/card:opacity-80 transition-opacity`}
                            style={theme.textStyle}
                            title={task.title}
                          >
                            {task.title}
                          </h4>
                        </div>

                        <div className="flex items-center justify-between mt-1">
                          <Popover
                            open={openPopovers[task.id] || false}
                            onOpenChange={(open) => setOpenPopovers((prev) => ({ ...prev, [task.id]: open }))}
                          >
                            <PopoverTrigger asChild>
                              <button
                                type="button"
                                onClick={(e) => e.stopPropagation()}
                                className="text-[10px] font-bold text-white px-2 py-0.5 rounded-full shrink-0 shadow-2xs hover:opacity-90 active:scale-95 transition-all truncate max-w-full cursor-pointer leading-tight"
                                style={{
                                  backgroundColor: theme.badgeBg,
                                }}
                                title="Click to quick change status"
                              >
                                {task.status}
                              </button>
                            </PopoverTrigger>
                            <PopoverContent
                              className="w-[440px] sm:w-[500px] p-3.5 sm:p-4 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 animate-in fade-in-50 zoom-in-95 duration-150"
                              align="start"
                              sideOffset={6}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="flex gap-3 sm:gap-4">
                                {Object.entries(groupedStatuses).map((entry) => {
                                  const [columnName, categories] = entry as [string, { [key: string]: string[] }]
                                  return (
                                    <div key={columnName} className="flex-1 space-y-3">
                                      {Object.entries(categories).map(([category, statuses]) => {
                                        if (statuses.length === 0) return null
                                        return (
                                          <div key={category} className="space-y-1">
                                            <div className="px-2.5 py-1.5 text-xs font-bold text-gray-500 bg-gray-50/90 rounded-lg">
                                              {category}
                                            </div>
                                            <div className="space-y-1">
                                              {statuses.map((status: string) => (
                                                <button
                                                  key={status}
                                                  type="button"
                                                  className={`w-full text-left px-2.5 py-1.5 text-[13px] font-medium hover:bg-gray-100 rounded-lg flex items-center gap-2.5 cursor-pointer transition-colors ${
                                                    task.status === status ? "bg-blue-50/90 font-bold text-blue-950" : ""
                                                  }`}
                                                  onClick={(e) => {
                                                    e.stopPropagation()
                                                    handleQuickStatusChange(task.id, status)
                                                  }}
                                                >
                                                  <div
                                                    className="w-3.5 h-3.5 rounded-full shrink-0 shadow-2xs"
                                                    style={{
                                                      backgroundColor:
                                                        statusOptions[status]?.hex || "#888",
                                                    }}
                                                  />
                                                  <span className="truncate text-gray-800">{status}</span>
                                                </button>
                                              ))}
                                            </div>
                                          </div>
                                        )
                                      })}
                                    </div>
                                  )
                                })}
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>

                        {/* Invisible drag-to-resize handle at bottom edge of card */}
                        <div
                          className="absolute bottom-0 left-0 right-0 h-2.5 cursor-ns-resize z-30 select-none"
                          onMouseDown={(e) => handleResizeStart(task, e)}
                          onClick={(e) => {
                            e.stopPropagation()
                            e.preventDefault()
                          }}
                          onMouseUp={(e) => {
                            e.stopPropagation()
                            e.preventDefault()
                          }}
                        />
                      </div>
                    )
                  }

                  return (
                    <>
                      <div className="flex flex-col gap-2 mb-2">
                        {loading ? (
                          <div
                            className="grid gap-2 items-stretch animate-pulse"
                            style={{ gridTemplateColumns: GRID_TEMPLATE }}
                          >
                            <div
                              style={{ gridColumn: "1 / span 1", gridRow: "1 / span 1" }}
                              className="w-[56px] min-w-[56px] text-[11px] font-medium text-gray-400 text-right pr-2 flex items-center justify-end"
                            >
                              09:00
                            </div>
                            <div
                              style={{
                                gridColumn: "2 / span 3",
                                gridRow: "1 / span 1",
                              }}
                              className="rounded-2xl min-h-[56px] h-full px-3.5 py-2.5 bg-gray-100/90 border border-gray-200/60 shadow-2xs flex items-center justify-between gap-3 overflow-hidden"
                            >
                              <div className="space-y-1.5 flex-1 min-w-0">
                                <div className="h-3.5 bg-gray-200/90 rounded-md w-3/5" />
                                <div className="h-2.5 bg-gray-200/60 rounded-md w-1/4" />
                              </div>
                              <div className="h-5 w-16 bg-gray-200/80 rounded-full shrink-0" />
                            </div>
                            <div
                              style={{
                                gridColumn: "5 / span 2",
                                gridRow: "1 / span 1",
                              }}
                              className="rounded-2xl min-h-[56px] h-full px-3.5 py-2.5 bg-gray-100/90 border border-gray-200/60 shadow-2xs flex items-center justify-between gap-3 overflow-hidden"
                            >
                              <div className="space-y-1.5 flex-1 min-w-0">
                                <div className="h-3.5 bg-gray-200/90 rounded-md w-4/6" />
                                <div className="h-2.5 bg-gray-200/60 rounded-md w-1/3" />
                              </div>
                              <div className="h-5 w-14 bg-gray-200/80 rounded-full shrink-0" />
                            </div>
                            <div
                              style={{
                                gridColumn: "7 / span 1",
                                gridRow: "1 / span 1",
                              }}
                              className="rounded-2xl border border-dashed border-gray-200/60 min-h-[56px] h-full opacity-40"
                            />
                            <div
                              style={{
                                gridColumn: "8 / span 1",
                                gridRow: "1 / span 1",
                              }}
                              className="rounded-2xl border border-dashed border-gray-200/60 min-h-[56px] h-full opacity-40"
                            />
                          </div>
                        ) : multiDayTracks.length > 0 ? (
                          multiDayTracks.map((trackItems, trackIdx) => {
                            const occupiedCols = new Set<number>()
                            trackItems.forEach((item) => {
                              for (let c = item.startCol; c <= item.endCol; c++) {
                                occupiedCols.add(c)
                              }
                            })

                            const trackTimeSlot = "09:00"
                            const trackTimeLabel = trackIdx === 0 ? "09:00" : ""

                            return (
                              <div
                                key={`track-${trackIdx}`}
                                className="grid gap-2 items-stretch"
                                style={{ gridTemplateColumns: GRID_TEMPLATE }}
                              >
                                <div
                                  style={{ gridColumn: "1 / span 1", gridRow: "1 / span 1" }}
                                  className="w-[56px] min-w-[56px] text-[11px] font-medium text-gray-400 text-right pr-2 flex items-center justify-end"
                                >
                                  {trackTimeLabel}
                                </div>

                                {trackItems.map((item) => {
                                  const statusHex =
                                    statusOptions[item.task.status]?.hex ||
                                    (item.task.status.toLowerCase() === "done"
                                      ? "#0bc144"
                                      : isTaskSkipped(item.task)
                                      ? "#7ed321"
                                      : item.task.status.toLowerCase() === "pending"
                                      ? "#ec4899"
                                      : undefined)
                                  const theme = getCardTheme(item.task.status, statusHex)
                                  return (
                                    <div
                                      key={item.task.id}
                                      draggable={true}
                                      onDragStart={(e) => {
                                        e.stopPropagation()
                                        e.dataTransfer.setData("text/plain", item.task.id)
                                        setDraggedTask(item.task)
                                      }}
                                      onDragEnd={() => {
                                        setDraggedTask(null)
                                        setDropTarget(null)
                                      }}
                                      onClick={() => handleEditTask(item.task)}
                                      style={{
                                        gridColumn: `${item.startCol + 2} / span ${item.span}`,
                                        gridRow: "1 / span 1",
                                        ...theme.cardStyle,
                                      }}
                                      className={`rounded-2xl min-h-[56px] h-full px-3.5 py-1.5 border shadow-2xs hover:shadow-md transition-all duration-150 cursor-grab active:cursor-grabbing flex items-center justify-between gap-2 overflow-hidden group/card ${
                                        draggedTask?.id === item.task.id ? "opacity-40 scale-95" : ""
                                      }`}
                                    >
                                      <div className="flex flex-col justify-center min-w-0 flex-1">
                                        <h4
                                          className="text-[13px] font-bold truncate tracking-tight group-hover/card:opacity-85 transition-opacity"
                                          style={theme.textStyle}
                                          title={item.task.title}
                                        >
                                          {item.task.title}
                                        </h4>
                                        <span
                                          className="text-[10px] font-medium truncate"
                                          style={theme.subtextStyle}
                                        >
                                          {item.span} days
                                        </span>
                                      </div>
                                      <Popover
                                        open={openPopovers[item.task.id] || false}
                                        onOpenChange={(open) => setOpenPopovers((prev) => ({ ...prev, [item.task.id]: open }))}
                                      >
                                        <PopoverTrigger asChild>
                                          <button
                                            type="button"
                                            onClick={(e) => e.stopPropagation()}
                                            className="text-[10px] font-bold text-white px-2.5 py-0.5 rounded-full shrink-0 shadow-2xs hover:opacity-90 active:scale-95 transition-all truncate max-w-[110px] cursor-pointer"
                                            style={{
                                              backgroundColor: theme.badgeBg,
                                            }}
                                            title="Click to quick change status"
                                          >
                                            {item.task.status}
                                          </button>
                                        </PopoverTrigger>
                                        <PopoverContent
                                          className="w-[440px] sm:w-[500px] p-3.5 sm:p-4 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 animate-in fade-in-50 zoom-in-95 duration-150"
                                          align="end"
                                          sideOffset={6}
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <div className="flex gap-3 sm:gap-4">
                                            {Object.entries(groupedStatuses).map((entry) => {
                                              const [columnName, categories] = entry as [string, { [key: string]: string[] }]
                                              return (
                                                <div key={columnName} className="flex-1 space-y-3">
                                                  {Object.entries(categories).map(([category, statuses]) => {
                                                    if (statuses.length === 0) return null
                                                    return (
                                                      <div key={category} className="space-y-1">
                                                        <div className="px-2.5 py-1.5 text-xs font-bold text-gray-500 bg-gray-50/90 rounded-lg">
                                                          {category}
                                                        </div>
                                                        <div className="space-y-1">
                                                          {statuses.map((status: string) => (
                                                            <button
                                                              key={status}
                                                              type="button"
                                                              className={`w-full text-left px-2.5 py-1.5 text-[13px] font-medium hover:bg-gray-100 rounded-lg flex items-center gap-2.5 cursor-pointer transition-colors ${
                                                                item.task.status === status ? "bg-blue-50/90 font-bold text-blue-950" : ""
                                                              }`}
                                                              onClick={(e) => {
                                                                e.stopPropagation()
                                                                handleQuickStatusChange(item.task.id, status)
                                                              }}
                                                            >
                                                              <div
                                                                className="w-3.5 h-3.5 rounded-full shrink-0 shadow-2xs"
                                                                style={{
                                                                  backgroundColor:
                                                                    statusOptions[status]?.hex || "#888",
                                                                }}
                                                              />
                                                              <span className="truncate text-gray-800">{status}</span>
                                                            </button>
                                                          ))}
                                                        </div>
                                                      </div>
                                                    )
                                                  })}
                                                </div>
                                              )
                                            })}
                                          </div>
                                        </PopoverContent>
                                      </Popover>
                                    </div>
                                  )
                                })}

                                {/* OPSI 1: Placeholder dashed cells or single-day tasks for unoccupied days in this track */}
                                {weekDays.map((day, colIdx) => {
                                  if (occupiedCols.has(colIdx)) return null
                                  const dateStr = formatDate(day)
                                  const isToday = dateStr === todayDateStr
                                  const cellKey = `${dateStr}_${trackTimeSlot}_track_${trackIdx}`
                                  const isDropTarget = dropTarget === cellKey

                                  // Single-day tasks at 09:00 for this day that haven't been rendered yet
                                  const cellTasks = (singleDaySlotMap[`${dateStr}_09:00`] || []).filter(
                                    (t) => !rendered0900TaskIds.has(t.id)
                                  )

                                  if (cellTasks.length > 0) {
                                    cellTasks.forEach((t) => rendered0900TaskIds.add(t.id))
                                    return (
                                      <div
                                        key={`cell-0900-${trackIdx}-${dateStr}`}
                                        style={{
                                          gridColumn: `${colIdx + 2} / span 1`,
                                          gridRow: "1 / span 1",
                                        }}
                                        className="min-h-[56px] h-full flex flex-col justify-center gap-1.5 min-w-0 w-full p-0.5"
                                      >
                                        {cellTasks.map((t) => renderSingleDayTaskCard(t, cellTasks.length > 1))}
                                      </div>
                                    )
                                  }

                                  return (
                                    <div
                                      key={`empty-${trackIdx}-${dateStr}`}
                                      onClick={() => handleNewTaskClick(dateStr)}
                                      onDragOver={(e) => {
                                        e.preventDefault()
                                        e.dataTransfer.dropEffect = "move"
                                        if (dropTarget !== cellKey) setDropTarget(cellKey)
                                      }}
                                      onDragLeave={() => {
                                        if (dropTarget === cellKey) setDropTarget(null)
                                      }}
                                      onDrop={(e) => {
                                        e.preventDefault()
                                        handleDropTask(dateStr, trackTimeSlot)
                                      }}
                                      style={{
                                        gridColumn: `${colIdx + 2} / span 1`,
                                        gridRow: "1 / span 1",
                                      }}
                                      className={`rounded-2xl border min-h-[56px] h-full p-1 relative transition-all duration-150 flex flex-col justify-center items-center min-w-0 w-full ${
                                        isDropTarget
                                          ? "border-2 border-dashed border-indigo-500 bg-indigo-50/70 scale-[1.01]"
                                          : isToday
                                          ? "border-dashed border-indigo-200 bg-indigo-50/20 hover:border-indigo-400 hover:bg-indigo-50/40 cursor-pointer group"
                                          : "border-dashed border-gray-200/90 hover:border-indigo-300 hover:bg-indigo-50/20 cursor-pointer group"
                                      }`}
                                      title={`Click to add task on ${dateStr} (${trackTimeSlot})`}
                                    >
                                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-indigo-400">
                                        <Plus className="w-3.5 h-3.5" />
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            )
                          })
                        ) : (
                          <div
                            className="grid gap-2 items-stretch"
                            style={{ gridTemplateColumns: GRID_TEMPLATE }}
                          >
                            <div
                              style={{ gridColumn: "1 / span 1", gridRow: "1 / span 1" }}
                              className="w-[56px] min-w-[56px] text-[11px] font-medium text-gray-400 text-right pr-2 flex items-center justify-end"
                            >
                              09:00
                            </div>
                            {weekDays.map((day, colIdx) => {
                              const dateStr = formatDate(day)
                              const isToday = dateStr === todayDateStr
                              const cellKey = `${dateStr}_09:00`
                              const cellTasks = singleDaySlotMap[cellKey] || []
                              const isDropTarget = dropTarget === cellKey

                              if (cellTasks.length > 0) {
                                return (
                                  <div
                                    key={dateStr}
                                    style={{
                                      gridColumn: `${colIdx + 2} / span 1`,
                                      gridRow: "1 / span 1",
                                    }}
                                    className="min-h-[56px] h-full flex flex-col justify-center gap-1.5 min-w-0 w-full p-0.5"
                                  >
                                    {cellTasks.map((t) => renderSingleDayTaskCard(t, cellTasks.length > 1))}
                                  </div>
                                )
                              }

                              return (
                                <div
                                  key={dateStr}
                                  onClick={() => handleNewTaskClick(dateStr)}
                                  onDragOver={(e) => {
                                    e.preventDefault()
                                    e.dataTransfer.dropEffect = "move"
                                    if (dropTarget !== cellKey) setDropTarget(cellKey)
                                  }}
                                  onDragLeave={() => {
                                    if (dropTarget === cellKey) setDropTarget(null)
                                  }}
                                  onDrop={(e) => {
                                    e.preventDefault()
                                    handleDropTask(dateStr, "09:00")
                                  }}
                                  style={{
                                    gridColumn: `${colIdx + 2} / span 1`,
                                    gridRow: "1 / span 1",
                                  }}
                                  className={`rounded-2xl border min-h-[56px] h-full p-1 relative transition-all duration-150 flex flex-col justify-center min-w-0 w-full ${
                                    isDropTarget
                                      ? "border-2 border-dashed border-indigo-500 bg-indigo-50/70 scale-[1.01]"
                                      : isToday
                                      ? "border-dashed border-indigo-200 bg-indigo-50/20 hover:border-indigo-400 hover:bg-indigo-50/40 cursor-pointer group"
                                      : "border-dashed border-gray-200/90 hover:border-indigo-300 hover:bg-indigo-50/20 cursor-pointer group"
                                  }`}
                                >
                                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-indigo-400">
                                    <Plus className="w-3.5 h-3.5" />
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>

                      {/* 3. Regular Single-Day: Morning Grid (10:00 - 11:00) */}
                      <div
                        className="grid gap-2"
                        style={{
                          gridTemplateColumns: GRID_TEMPLATE,
                          gridTemplateRows: "repeat(2, minmax(58px, auto))",
                        }}
                      >
                        {/* Time labels: */}
                        {MORNING_TIME_SLOTS.map((timeItem, sIdx) => (
                          <div
                            key={`m-label-${timeItem.slot}`}
                            style={{ gridRow: `${sIdx + 1} / span 1`, gridColumn: "1 / span 1" }}
                            className="w-[56px] min-w-[56px] text-[11px] font-medium text-gray-400 text-right pr-2 flex items-center justify-end"
                          >
                            {timeItem.label}
                          </div>
                        ))}

                        {/* Cells per day */}
                        {weekDays.map((day, dayIdx) => {
                          const dateStr = formatDate(day)
                          const isToday = dateStr === todayDateStr

                          return MORNING_TIME_SLOTS.map((timeItem, sIdx) => {
                            const cellKey = `${dateStr}_${timeItem.slot}`
                            if (slaveSlotSet.has(cellKey)) {
                              return null
                            }

                            const cellTasks = singleDaySlotMap[cellKey] || []
                            const isDropTarget = dropTarget === cellKey
                            const isSkeleton = loading && SKELETON_SLOTS[timeItem.slot]?.includes(dayIdx)

                            let maxSpan = 1
                            cellTasks.forEach((t) => {
                              const s = masterSpanMap[t.id] || 1
                              if (s > maxSpan) maxSpan = s
                            })
                            const allowedSpan = Math.min(maxSpan, 2 - sIdx)

                            return (
                              <div
                                key={cellKey}
                                style={{
                                  gridRow: `${sIdx + 1} / span ${allowedSpan}`,
                                  gridColumn: `${dayIdx + 2} / span 1`,
                                }}
                                onClick={() => {
                                  if (!loading && cellTasks.length === 0) {
                                    handleNewTaskClick(dateStr, timeItem.slot)
                                  }
                                }}
                                onDragOver={(e) => {
                                  if (loading) return
                                  e.preventDefault()
                                  e.dataTransfer.dropEffect = "move"
                                  if (dropTarget !== cellKey) setDropTarget(cellKey)
                                }}
                                onDragLeave={() => {
                                  if (dropTarget === cellKey) setDropTarget(null)
                                }}
                                onDrop={(e) => {
                                  if (loading) return
                                  e.preventDefault()
                                  handleDropTask(dateStr, timeItem.slot)
                                }}
                                className={`rounded-2xl border min-h-[58px] p-1 relative transition-all duration-150 flex flex-col justify-center gap-1 min-w-0 w-full overflow-hidden ${
                                  loading
                                    ? isSkeleton
                                      ? "border-transparent bg-transparent"
                                      : "border-dashed border-gray-100 bg-gray-50/20"
                                    : isDropTarget
                                    ? "border-2 border-dashed border-indigo-500 bg-indigo-50/70 scale-[1.01]"
                                    : cellTasks.length > 0
                                    ? "border-transparent bg-transparent"
                                    : isToday
                                    ? "border-dashed border-indigo-200 bg-indigo-50/20 hover:border-indigo-400 hover:bg-indigo-50/40 cursor-pointer group"
                                    : "border-dashed border-gray-200/90 hover:border-indigo-300 hover:bg-indigo-50/20 cursor-pointer group"
                                }`}
                              >
                                {loading ? (
                                  isSkeleton ? (
                                    <div className="rounded-2xl px-3 py-2 bg-gray-100/90 border border-gray-200/60 shadow-2xs animate-pulse flex flex-col justify-between h-full min-h-[50px] w-full">
                                      <div className="space-y-1.5">
                                        <div className="h-3.5 bg-gray-200/90 rounded-md w-4/5" />
                                        <div className="h-2.5 bg-gray-200/60 rounded-md w-1/2" />
                                      </div>
                                      <div className="flex justify-end mt-1.5">
                                        <div className="h-4 w-12 bg-gray-200/80 rounded-full" />
                                      </div>
                                    </div>
                                  ) : null
                                ) : (
                                  <>
                                    {cellTasks.length === 0 && (
                                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-indigo-400">
                                        <Plus className="w-3.5 h-3.5" />
                                      </div>
                                    )}

                                    {cellTasks.map((task) =>
                                      renderSingleDayTaskCard(
                                        task,
                                        cellTasks.length > 1,
                                        masterSpanMap[task.id] || 1
                                      )
                                    )}
                                  </>
                                )}
                              </div>
                            )
                          })
                        })}
                      </div>

                      {/* Lunch Break Bar */}
                      <div className="grid grid-cols-[56px_1fr] gap-2 items-center my-2.5 py-0.5">
                        <div className="text-[10px] text-gray-300 font-medium text-right pr-2">
                          12:00
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-px bg-gray-200/70 flex-1 border-dashed border-t" />
                          <span className="text-[10px] text-gray-400 font-medium px-2 py-0.5 rounded-full bg-gray-50 border border-gray-200/60">
                            Lunch Break (12:00 - 13:00)
                          </span>
                          <div className="h-px bg-gray-200/70 flex-1 border-dashed border-t" />
                        </div>
                      </div>

                      {/* Afternoon Grid (13:00 - 17:00) */}
                      <div
                        className="grid gap-2"
                        style={{
                          gridTemplateColumns: GRID_TEMPLATE,
                          gridTemplateRows: "repeat(5, minmax(58px, auto))",
                        }}
                      >
                        {/* Time labels: */}
                        {AFTERNOON_TIME_SLOTS.map((timeItem, sIdx) => (
                          <div
                            key={`a-label-${timeItem.slot}`}
                            style={{ gridRow: `${sIdx + 1} / span 1`, gridColumn: "1 / span 1" }}
                            className="w-[56px] min-w-[56px] text-[11px] font-medium text-gray-400 text-right pr-2 flex items-center justify-end"
                          >
                            {timeItem.label}
                          </div>
                        ))}

                        {/* Cells per day */}
                        {weekDays.map((day, dayIdx) => {
                          const dateStr = formatDate(day)
                          const isToday = dateStr === todayDateStr

                          return AFTERNOON_TIME_SLOTS.map((timeItem, sIdx) => {
                            const cellKey = `${dateStr}_${timeItem.slot}`
                            if (slaveSlotSet.has(cellKey)) {
                              return null
                            }

                            const cellTasks = singleDaySlotMap[cellKey] || []
                            const isDropTarget = dropTarget === cellKey
                            const isSkeleton = loading && SKELETON_SLOTS[timeItem.slot]?.includes(dayIdx)

                            let maxSpan = 1
                            cellTasks.forEach((t) => {
                              const s = masterSpanMap[t.id] || 1
                              if (s > maxSpan) maxSpan = s
                            })
                            const allowedSpan = Math.min(maxSpan, 5 - sIdx)

                            return (
                              <div
                                key={cellKey}
                                style={{
                                  gridRow: `${sIdx + 1} / span ${allowedSpan}`,
                                  gridColumn: `${dayIdx + 2} / span 1`,
                                }}
                                onClick={() => {
                                  if (!loading && cellTasks.length === 0) {
                                    handleNewTaskClick(dateStr, timeItem.slot)
                                  }
                                }}
                                onDragOver={(e) => {
                                  if (loading) return
                                  e.preventDefault()
                                  e.dataTransfer.dropEffect = "move"
                                  if (dropTarget !== cellKey) setDropTarget(cellKey)
                                }}
                                onDragLeave={() => {
                                  if (dropTarget === cellKey) setDropTarget(null)
                                }}
                                onDrop={(e) => {
                                  if (loading) return
                                  e.preventDefault()
                                  handleDropTask(dateStr, timeItem.slot)
                                }}
                                className={`rounded-2xl border min-h-[58px] p-1 relative transition-all duration-150 flex flex-col justify-center gap-1 min-w-0 w-full overflow-hidden ${
                                  loading
                                    ? isSkeleton
                                      ? "border-transparent bg-transparent"
                                      : "border-dashed border-gray-100 bg-gray-50/20"
                                    : isDropTarget
                                    ? "border-2 border-dashed border-indigo-500 bg-indigo-50/70 scale-[1.01]"
                                    : cellTasks.length > 0
                                    ? "border-transparent bg-transparent"
                                    : isToday
                                    ? "border-dashed border-indigo-200 bg-indigo-50/20 hover:border-indigo-400 hover:bg-indigo-50/40 cursor-pointer group"
                                    : "border-dashed border-gray-200/90 hover:border-indigo-300 hover:bg-indigo-50/20 cursor-pointer group"
                                }`}
                              >
                                {loading ? (
                                  isSkeleton ? (
                                    <div className="rounded-2xl px-3 py-2 bg-gray-100/90 border border-gray-200/60 shadow-2xs animate-pulse flex flex-col justify-between h-full min-h-[50px] w-full">
                                      <div className="space-y-1.5">
                                        <div className="h-3.5 bg-gray-200/90 rounded-md w-4/5" />
                                        <div className="h-2.5 bg-gray-200/60 rounded-md w-1/2" />
                                      </div>
                                      <div className="flex justify-end mt-1.5">
                                        <div className="h-4 w-12 bg-gray-200/80 rounded-full" />
                                      </div>
                                    </div>
                                  ) : null
                                ) : (
                                  <>
                                    {cellTasks.length === 0 && (
                                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-indigo-400">
                                        <Plus className="w-3.5 h-3.5" />
                                      </div>
                                    )}

                                    {cellTasks.map((task) =>
                                      renderSingleDayTaskCard(
                                        task,
                                        cellTasks.length > 1,
                                        masterSpanMap[task.id] || 1
                                      )
                                    )}
                                  </>
                                )}
                              </div>
                            )
                          })
                        })}
                      </div>
                    </>
                  )
                })()}
              </div>
            </div>
          </section>
        </div>

        {/* Exact Create/Edit Task Modal from Image 2 & original app/page.tsx */}
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingTask ? "Edit Task" : "Create New Task"}</DialogTitle>
              <DialogDescription>
                {editingTask ? "Update task details and save changes" : "Create a new task with title, dates, and other details"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  placeholder="Task title"
                />
              </div>

              {editingTask?.type === "checklist" || newTask.type === "checklist" ? (
                <div className="space-y-6">
                  {CHECKLISTS.map((checklist) => {
                    let checklistState: Record<string, string[]> = {}
                    try {
                      checklistState = newTask.description
                        ? (JSON.parse(newTask.description) as Record<string, string[]>)
                        : {}
                    } catch {
                      checklistState = {}
                    }
                    const checked = checklistState[checklist.key] || []
                    const total = checklist.platforms.length
                    const completed = checked.length
                    const percent = Math.round((completed / total) * 100)
                    return (
                      <div key={checklist.key} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-base">{checklist.label}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold">{percent}%</span>
                            <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div className="h-2 bg-blue-500" style={{ width: `${percent}%` }} />
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-4">
                          {checklist.platforms.map((platform) => (
                            <label key={platform} className="flex items-center gap-1 text-sm font-medium">
                              <input
                                type="checkbox"
                                checked={checked.includes(platform)}
                                onChange={(e) => {
                                  const newChecked = checked.includes(platform)
                                    ? checked.filter((p: string) => p !== platform)
                                    : [...checked, platform]
                                  const newState = { ...checklistState, [checklist.key]: newChecked }
                                  setNewTask({ ...newTask, description: JSON.stringify(newState) })
                                }}
                                className="form-checkbox h-4 w-4 text-blue-600 border-gray-300 rounded"
                              />
                              {platform}
                            </label>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newTask.description || ""}
                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                    placeholder="Task description"
                    rows={5}
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Start Date</Label>
                  <DatePicker
                    value={newTask.start_date}
                    onChange={(date) => setNewTask({ ...newTask, start_date: date })}
                    placeholder="Select start date"
                    position="left"
                  />
                </div>

                <div>
                  <Label>End Date</Label>
                  <DatePicker
                    value={newTask.end_date}
                    onChange={(date) => setNewTask({ ...newTask, end_date: date })}
                    placeholder="Select end date"
                    position="right"
                  />
                </div>
              </div>



              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="status" className="text-sm">
                    Status
                  </Label>
                  <Select value={newTask.status} onValueChange={(value) => setNewTask({ ...newTask, status: value })}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-80">
                      {Object.entries(selectGroupedStatuses).map(([category, statusesList]) =>
                        statusesList.length === 0 ? null : (
                          <div key={category}>
                            <div className="px-2 py-1.5 text-sm font-semibold text-gray-500 bg-gray-50">{category}</div>
                            {statusesList.map((status) => (
                              <SelectItem key={status} value={status}>
                                <div className="flex items-center gap-2">
                                  <div
                                    className="w-3 h-3 rounded-full"
                                    style={{
                                      backgroundColor:
                                        statusOptions[status as keyof typeof statusOptions]?.hex || "#888",
                                    }}
                                  />
                                  {status}
                                </div>
                              </SelectItem>
                            ))}
                          </div>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="priority" className="text-sm">
                    Priority
                  </Label>
                  <Select
                    value={newTask.priority}
                    onValueChange={(value: "low" | "medium" | "high") => setNewTask({ ...newTask, priority: value })}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="recurring" className="text-sm">
                    Recurring
                  </Label>
                  <Select
                    value={newTask.recurring}
                    onValueChange={(value: "no" | "daily" | "weekly" | "monthly") =>
                      setNewTask({ ...newTask, recurring: value })
                    }
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no">No</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={resetForm}
                  disabled={modalLoading.create || modalLoading.update || modalLoading.delete}
                >
                  Cancel
                </Button>
                {editingTask && (
                  <Button
                    variant="destructive"
                    onClick={() => handleDeleteTask(editingTask.id)}
                    disabled={modalLoading.delete}
                  >
                    {modalLoading.delete ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </>
                    )}
                  </Button>
                )}
                <Button
                  onClick={editingTask ? handleUpdateTask : handleCreateTask}
                  disabled={modalLoading.create || modalLoading.update}
                >
                  {editingTask ? (
                    modalLoading.update ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      "Update"
                    )
                  ) : modalLoading.create ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create"
                  )}
                </Button>
                {editingTask && (
                  <Button
                    style={{ backgroundColor: "#facc15", color: "#000" }}
                    className="hover:bg-yellow-500 focus:bg-yellow-500 active:bg-yellow-600 border-none"
                    onClick={handleDuplicateTask}
                    disabled={duplicateLoading}
                  >
                    {duplicateLoading ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="animate-spin w-4 h-4" /> Duplicating...
                      </span>
                    ) : (
                      "Duplicate Task"
                    )}
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Exact Recurring Modal from app/page.tsx */}
        <Dialog open={isRecurringModalOpen} onOpenChange={setIsRecurringModalOpen}>
          <DialogContent className="sm:max-w-4xl">
            <DialogHeader>
              <DialogTitle>Add {recurringType === "daily" ? "Daily" : "Weekly"} Recurring Tasks</DialogTitle>
              <DialogDescription>
                Select tasks to add to your calendar for this week
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Add {recurringTasksToAdd.length} {recurringType === "daily" ? "Daily" : "Weekly"} recurring task
                {recurringTasksToAdd.length !== 1 ? "s" : ""} to this week?
              </p>

              <div className="grid grid-cols-5 gap-2 max-h-96 overflow-y-auto p-2 border border-gray-200 rounded-lg bg-gray-50">
                {recurringTasksToAdd.map((task, index) => (
                  <div
                    key={`${task.id}-${index}`}
                    className="flex flex-col items-start gap-1 px-2 py-2 bg-white border border-gray-300 rounded text-xs font-medium hover:bg-blue-50 transition"
                  >
                    <div className="flex items-center gap-1 w-full">
                      <Repeat className="w-3 h-3 text-blue-500 flex-shrink-0" />
                      {recurringType === "daily" && <CalendarIcon className="w-3 h-3 text-green-500 flex-shrink-0" />}
                    </div>
                    <div className="truncate text-gray-800 font-semibold text-xs w-full">{task.title}</div>
                    <div className="text-xs text-gray-500">
                      {new Date(task.start_date).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsRecurringModalOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleConfirmRecurringTasks} disabled={modalLoading.recurring}>
                  {modalLoading.recurring ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    `Add ${recurringTasksToAdd.length} Task${recurringTasksToAdd.length !== 1 ? "s" : ""}`
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Custom Confirmation Modal */}
        <Dialog
          open={confirmModal.isOpen}
          onOpenChange={(open) => setConfirmModal((prev) => ({ ...prev, isOpen: open }))}
        >
          <DialogContent className="sm:max-w-md bg-white border border-gray-100 rounded-2xl shadow-2xl p-6">
            <div className="flex items-start gap-4">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                  confirmModal.isDanger
                    ? "bg-rose-50 text-rose-600 border border-rose-100"
                    : "bg-amber-50 text-amber-600 border border-amber-100"
                }`}
              >
                {confirmModal.isDanger ? (
                  <Trash2 className="w-5 h-5 text-rose-600" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                )}
              </div>

              <div className="flex-1 pt-0.5">
                <DialogTitle className="text-base font-bold text-gray-900 mb-1.5 tracking-tight">
                  {confirmModal.title}
                </DialogTitle>
                <DialogDescription className="text-sm text-gray-600 leading-relaxed">
                  {confirmModal.message}
                </DialogDescription>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2.5">
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 text-xs font-semibold rounded-xl border-gray-200 hover:bg-gray-50 text-gray-700 transition-colors"
              >
                {confirmModal.cancelText || "Cancel"}
              </Button>
              <Button
                type="button"
                onClick={() => {
                  confirmModal.onConfirm()
                }}
                disabled={modalLoading.delete}
                className={`px-5 py-2 text-xs font-semibold rounded-xl text-white shadow-xs transition-colors ${
                  confirmModal.isDanger
                    ? "bg-rose-600 hover:bg-rose-700"
                    : "bg-indigo-600 hover:bg-indigo-700"
                }`}
              >
                {modalLoading.delete ? (
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                ) : (
                  confirmModal.confirmText || "Confirm"
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Custom Notification Modal (replaces browser alerts) */}
        <Dialog
          open={notificationModal.isOpen}
          onOpenChange={(open) => setNotificationModal((prev) => ({ ...prev, isOpen: open }))}
        >
          <DialogContent className="sm:max-w-md bg-white border border-gray-100 rounded-2xl shadow-xl p-6">
            <div className="flex items-start gap-4">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                  notificationModal.type === "error"
                    ? "bg-rose-50 text-rose-500"
                    : notificationModal.type === "warning"
                    ? "bg-amber-50 text-amber-500"
                    : notificationModal.type === "success"
                    ? "bg-emerald-50 text-emerald-500"
                    : "bg-blue-50 text-blue-500"
                }`}
              >
                {notificationModal.type === "error" ? (
                  <AlertCircle className="w-5 h-5" />
                ) : notificationModal.type === "warning" ? (
                  <AlertCircle className="w-5 h-5" />
                ) : notificationModal.type === "success" ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <Info className="w-5 h-5" />
                )}
              </div>

              <div className="flex-1 pt-0.5">
                <DialogTitle className="text-base font-semibold text-gray-900 mb-1.5">
                  {notificationModal.title || "Notification"}
                </DialogTitle>
                <DialogDescription className="text-sm text-gray-600 leading-relaxed">
                  {notificationModal.message}
                </DialogDescription>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <Button
                type="button"
                onClick={() => setNotificationModal((prev) => ({ ...prev, isOpen: false }))}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 text-sm font-semibold rounded-xl shadow-xs transition-colors"
              >
                OK
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Auth / Profile Modal (CRUD login with email & password, remember 30 days) */}
        <Dialog open={isAuthModalOpen} onOpenChange={setIsAuthModalOpen}>
          <DialogContent className="sm:max-w-md bg-white border border-gray-100 rounded-3xl shadow-2xl p-6">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-gray-900">
                {authModalMode === "login" && "Sign In"}
                {authModalMode === "register" && "Create an Account"}
                {authModalMode === "profile" && "Account Settings"}
              </DialogTitle>
              <DialogDescription className="text-xs text-gray-500">
                {authModalMode === "login" && "Enter your email and password to access your account"}
                {authModalMode === "register" && "Fill in the details below to create your account"}
                {authModalMode === "profile" && "Manage your name, email, password, and account"}
              </DialogDescription>
            </DialogHeader>

            {authError && (
              <div className="p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            {authModalMode === "login" && (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="login-email" className="text-xs font-semibold text-gray-700">Email Address</Label>
                  <div className="relative mt-1">
                    <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-2.5 pointer-events-none" />
                    <Input
                      id="login-email"
                      type="email"
                      required
                      placeholder="you@example.com"
                      value={authForm.email}
                      onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                      className="pl-9 text-xs rounded-xl"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="login-password" className="text-xs font-semibold text-gray-700">Password</Label>
                  <div className="relative mt-1">
                    <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-2.5 pointer-events-none" />
                    <Input
                      id="login-password"
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="••••••••"
                      value={authForm.password}
                      onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                      className="pl-9 pr-9 text-xs rounded-xl"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={authForm.remember30Days}
                      onChange={(e) => setAuthForm({ ...authForm, remember30Days: e.target.checked })}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                    />
                    <span className="font-medium">Remember me for 30 days</span>
                  </label>
                </div>

                <div className="flex flex-col gap-2 pt-2">
                  <Button
                    type="submit"
                    disabled={authLoading}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-2 text-xs font-semibold shadow-xs"
                  >
                    {authLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sign In"}
                  </Button>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthError(null)
                      setAuthModalMode("register")
                    }}
                    className="text-xs text-indigo-600 hover:underline text-center cursor-pointer mt-1"
                  >
                    Don't have an account? Create one
                  </button>
                </div>
              </form>
            )}

            {authModalMode === "register" && (
              <form onSubmit={handleRegisterSubmit} className="space-y-3">
                <div>
                  <Label htmlFor="reg-name" className="text-xs font-semibold text-gray-700">Full Name</Label>
                  <div className="relative mt-1">
                    <User className="w-4 h-4 text-gray-400 absolute left-3 top-2.5 pointer-events-none" />
                    <Input
                      id="reg-name"
                      type="text"
                      required
                      placeholder="Your Name"
                      value={authForm.name}
                      onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })}
                      className="pl-9 text-xs rounded-xl"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="reg-email" className="text-xs font-semibold text-gray-700">Email Address</Label>
                  <div className="relative mt-1">
                    <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-2.5 pointer-events-none" />
                    <Input
                      id="reg-email"
                      type="email"
                      required
                      placeholder="you@example.com"
                      value={authForm.email}
                      onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                      className="pl-9 text-xs rounded-xl"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="reg-password" className="text-xs font-semibold text-gray-700">Password</Label>
                  <div className="relative mt-1">
                    <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-2.5 pointer-events-none" />
                    <Input
                      id="reg-password"
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="At least 6 characters"
                      value={authForm.password}
                      onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                      className="pl-9 pr-9 text-xs rounded-xl"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <Label htmlFor="reg-confirm" className="text-xs font-semibold text-gray-700">Confirm Password</Label>
                  <div className="relative mt-1">
                    <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-2.5 pointer-events-none" />
                    <Input
                      id="reg-confirm"
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="Repeat password"
                      value={authForm.confirmPassword}
                      onChange={(e) => setAuthForm({ ...authForm, confirmPassword: e.target.value })}
                      className="pl-9 text-xs rounded-xl"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={authForm.remember30Days}
                      onChange={(e) => setAuthForm({ ...authForm, remember30Days: e.target.checked })}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                    />
                    <span className="font-medium">Remember me for 30 days</span>
                  </label>
                </div>

                <div className="flex flex-col gap-2 pt-2">
                  <Button
                    type="submit"
                    disabled={authLoading}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-2 text-xs font-semibold shadow-xs"
                  >
                    {authLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Account"}
                  </Button>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthError(null)
                      setAuthModalMode("login")
                    }}
                    className="text-xs text-indigo-600 hover:underline text-center cursor-pointer mt-1"
                  >
                    Already have an account? Sign In
                  </button>
                </div>
              </form>
            )}

            {authModalMode === "profile" && (
              <form onSubmit={handleProfileSubmit} className="space-y-3.5">
                {/* Profile Photo Section */}
                <div className="p-3 bg-gradient-to-b from-gray-50 to-white rounded-2xl border border-gray-150 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-gray-800">Profile Photo</Label>
                    <button
                      type="button"
                      onClick={() => setShowAvatarUrlInput(!showAvatarUrlInput)}
                      className="text-[11px] font-medium text-indigo-600 hover:text-indigo-700 hover:underline cursor-pointer"
                    >
                      {showAvatarUrlInput ? "Hide URL input" : "Enter image URL"}
                    </button>
                  </div>

                  <div className="flex items-center gap-3.5">
                    {/* Live Preview */}
                    <div className="relative group w-14 h-14 rounded-full overflow-hidden border-2 border-indigo-200 bg-indigo-50 shrink-0 shadow-inner flex items-center justify-center">
                      {authForm.avatar ? (
                        <img
                          src={authForm.avatar}
                          alt="Avatar preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-base font-bold">
                          {authForm.name ? authForm.name.charAt(0).toUpperCase() : <User className="w-6 h-6" />}
                        </div>
                      )}
                      {isUploadingPhoto && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                          <Loader2 className="w-4 h-4 text-white animate-spin" />
                        </div>
                      )}
                    </div>

                    {/* Upload / Remove Actions */}
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <input
                          ref={avatarFileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarFileChange}
                          className="hidden"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => avatarFileInputRef.current?.click()}
                          disabled={isUploadingPhoto}
                          className="h-7.5 px-2.5 rounded-xl text-xs gap-1.5 font-semibold border-gray-200 hover:bg-gray-100 hover:border-gray-300 text-gray-700 cursor-pointer shadow-2xs"
                        >
                          <Camera className="w-3.5 h-3.5 text-indigo-600" />
                          <span>{isUploadingPhoto ? "Processing..." : "Upload Photo"}</span>
                        </Button>

                        {authForm.avatar && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setAuthForm((prev) => ({ ...prev, avatar: "" }))}
                            className="h-7.5 px-2 rounded-xl text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700 cursor-pointer"
                            title="Remove Photo"
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-1" />
                            Remove
                          </Button>
                        )}
                      </div>
                      <p className="text-[10px] text-gray-400">
                        Upload any image (JPG, PNG, WEBP). Automatically cropped & optimized.
                      </p>
                    </div>
                  </div>

                  {/* Optional Image URL Input */}
                  {showAvatarUrlInput && (
                    <div className="pt-1.5 animate-in fade-in-50 duration-150">
                      <Input
                        type="url"
                        placeholder="https://example.com/avatar.jpg"
                        value={authForm.avatar.startsWith("data:") ? "" : authForm.avatar}
                        onChange={(e) => setAuthForm({ ...authForm, avatar: e.target.value })}
                        className="text-xs rounded-xl h-8"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="prof-name" className="text-xs font-semibold text-gray-700">Display Name</Label>
                  <Input
                    id="prof-name"
                    type="text"
                    required
                    value={authForm.name}
                    onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })}
                    className="text-xs rounded-xl mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="prof-email" className="text-xs font-semibold text-gray-700">Email Address</Label>
                  <Input
                    id="prof-email"
                    type="email"
                    required
                    value={authForm.email}
                    onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                    className="text-xs rounded-xl mt-1"
                  />
                </div>

                <div className="pt-2 border-t border-gray-100">
                  <p className="text-[11px] font-bold text-gray-600 mb-2">Change Password (optional)</p>
                  <div className="space-y-2">
                    <div>
                      <Label htmlFor="prof-cur-pw" className="text-[11px] text-gray-500">Current Password</Label>
                      <Input
                        id="prof-cur-pw"
                        type="password"
                        placeholder="Current password"
                        value={authForm.currentPassword}
                        onChange={(e) => setAuthForm({ ...authForm, currentPassword: e.target.value })}
                        className="text-xs rounded-xl mt-0.5"
                      />
                    </div>
                    <div>
                      <Label htmlFor="prof-new-pw" className="text-[11px] text-gray-500">New Password</Label>
                      <Input
                        id="prof-new-pw"
                        type="password"
                        placeholder="New password (min 6 chars)"
                        value={authForm.newPassword}
                        onChange={(e) => setAuthForm({ ...authForm, newPassword: e.target.value })}
                        className="text-xs rounded-xl mt-0.5"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-3">
                  <Button
                    type="submit"
                    disabled={authLoading}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-2 text-xs font-semibold shadow-xs"
                  >
                    {authLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Changes"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsAuthModalOpen(false)}
                    className="rounded-xl text-xs"
                  >
                    Cancel
                  </Button>
                </div>

                <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-[11px] text-gray-400">Permanently remove account</span>
                  <button
                    type="button"
                    onClick={handleDeleteAccount}
                    className="text-[11px] font-bold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer"
                  >
                    Delete Account
                  </button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </>
  )
}
