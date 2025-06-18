"use client"

import React from "react"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Plus, Edit2, Trash2, ChevronUp, ChevronDown, GripVertical, Repeat, Loader2, Calendar } from "lucide-react"

interface Task {
  id: string
  title: string
  description: string | null
  start_date: string
  end_date: string
  status: string
  priority: "low" | "medium" | "high"
  recurring: "no" | "daily" | "weekly" | "monthly"
  created_at?: string
  updated_at?: string
}

interface TaskPosition {
  taskId: string
  top: number
  height: number
  dayIndex: number
  span: number
}

const statusOptions = {
  // To-do statuses
  "Follow Up": { color: "bg-amber-500", category: "To-do" },
  "Night Work": { color: "bg-purple-500", category: "To-do" },
  Pending: { color: "bg-pink-500", category: "To-do" },
  Later: { color: "bg-gray-500", category: "To-do" },
  "Search BGM & Trim SFX": { color: "bg-red-500", category: "To-do" },
  "Not started": { color: "bg-gray-400", category: "To-do" },

  // In progress statuses
  Everyday: { color: "bg-pink-500", category: "In progress" },
  "Ready To Render": { color: "bg-amber-500", category: "In progress" },
  "Rough Cut": { color: "bg-amber-600", category: "In progress" },
  "Waiting VO or assets": { color: "bg-purple-500", category: "In progress" },
  "Waiting Revision": { color: "bg-red-500", category: "In progress" },
  "On Revision": { color: "bg-amber-500", category: "In progress" },
  "In Progress": { color: "bg-amber-500", category: "In progress" },
  "Ready deliver": { color: "bg-blue-500", category: "In progress" },
  "Preview Done": { color: "bg-blue-500", category: "In progress" },
  "Series Customer Review": { color: "bg-amber-500", category: "In progress" },
  "Continue next day": { color: "bg-blue-500", category: "In progress" },

  // Completed statuses
  Done: { color: "bg-green-500", category: "Completed" },
  Meeting: { color: "bg-purple-500", category: "Completed" },
}

const formatDate = (date: Date) => {
  return date.toISOString().split("T")[0]
}

export default function UnoCalendar() {
  const currentDate = new Date()

  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingTasks, setUpdatingTasks] = useState<Set<string>>(new Set()) // Track which tasks are updating
  const [currentWeekDate, setCurrentWeekDate] = useState(currentDate)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isRecurringModalOpen, setIsRecurringModalOpen] = useState(false)
  const [recurringTasksToAdd, setRecurringTasksToAdd] = useState<Task[]>([])
  const [recurringType, setRecurringType] = useState<"daily" | "weekly">("weekly")
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [draggedTask, setDraggedTask] = useState<Task | null>(null)
  const [clickedDate, setClickedDate] = useState<string>("")
  const [resizingTask, setResizingTask] = useState<{
    taskId: string
    startX: number
    startDate: string
    originalEndDate: string
    dayWidth: number
  } | null>(null)

  const weekContainerRef = useRef<HTMLDivElement>(null)

  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    start_date: "",
    end_date: "",
    status: "Not started",
    priority: "medium" as const,
    recurring: "no" as "no" | "daily" | "weekly" | "monthly",
  })

  const [openPopovers, setOpenPopovers] = useState<Record<string, boolean>>({})
  const [modalLoading, setModalLoading] = useState({
    create: false,
    update: false,
    delete: false,
    recurring: false,
  })

  // Get three weeks: previous, current, next
  const previousWeek = getWeekDays(new Date(currentWeekDate.getTime() - 7 * 24 * 60 * 60 * 1000))
  const currentWeek = getWeekDays(currentWeekDate)
  const nextWeek = getWeekDays(new Date(currentWeekDate.getTime() + 7 * 24 * 60 * 60 * 1000))

  function getWeekStart(date: Date) {
    const start = new Date(date)
    const day = start.getDay()
    const diff = start.getDate() - day + (day === 0 ? -6 : 1)
    start.setDate(diff)
    return start
  }

  function getWeekDays(date: Date) {
    const week = []
    const startOfWeek = getWeekStart(date)

    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek)
      day.setDate(startOfWeek.getDate() + i)
      week.push(day)
    }
    return week
  }

  function addDays(date: string, days: number) {
    const result = new Date(date)
    result.setDate(result.getDate() + days)
    return result.toISOString().split("T")[0]
  }

  // Debounced update function
  const debounceTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map())

  const debouncedUpdate = (taskId: string, updateData: Partial<Task>, delay = 500) => {
    // Clear existing timeout for this task
    const existingTimeout = debounceTimeouts.current.get(taskId)
    if (existingTimeout) {
      clearTimeout(existingTimeout)
    }

    // Set new timeout
    const timeout = setTimeout(async () => {
      try {
        const response = await fetch(`/api/tasks/${taskId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updateData),
        })

        if (!response.ok) {
          const data = await response.json()
          console.error("Failed to update task:", data.error)
          // Revert optimistic update on failure
          fetchTasks()
        }
      } catch (error) {
        console.error("Error updating task:", error)
        fetchTasks()
      } finally {
        setUpdatingTasks((prev) => {
          const newSet = new Set(prev)
          newSet.delete(taskId)
          return newSet
        })
        debounceTimeouts.current.delete(taskId)
      }
    }, delay)

    debounceTimeouts.current.set(taskId, timeout)
  }

  // Fetch tasks from API
  const fetchTasks = async () => {
    try {
      setLoading(true)
      const startDate = formatDate(previousWeek[0])
      const endDate = formatDate(nextWeek[6])

      const response = await fetch(`/api/tasks?startDate=${startDate}&endDate=${endDate}`)
      const data = await response.json()

      if (response.ok) {
        setTasks(data.tasks || [])
      } else {
        console.error("Failed to fetch tasks:", data.error)
      }
    } catch (error) {
      console.error("Error fetching tasks:", error)
    } finally {
      setLoading(false)
    }
  }

  // Load tasks on component mount and when week changes
  useEffect(() => {
    fetchTasks()
  }, [currentWeekDate])

  const handleCreateTask = async () => {
    if (!newTask.title) return

    try {
      setModalLoading((prev) => ({ ...prev, create: true }))
      const taskData = {
        ...newTask,
        start_date: clickedDate || newTask.start_date,
        end_date: newTask.end_date || clickedDate || newTask.start_date,
      }

      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(taskData),
      })

      const data = await response.json()

      if (response.ok) {
        setTasks([...tasks, data.task])
        resetForm()
      } else {
        console.error("Failed to create task:", data.error)
        alert(`Failed to create task: ${data.error}`)
      }
    } catch (error) {
      console.error("Error creating task:", error)
      alert("Error creating task. Please try again.")
    } finally {
      setModalLoading((prev) => ({ ...prev, create: false }))
    }
  }

  const handleEditTask = (task: Task) => {
    setNewTask({
      title: task.title,
      description: task.description || "",
      start_date: task.start_date,
      end_date: task.end_date,
      status: task.status,
      priority: task.priority,
      recurring: task.recurring,
    })
    setEditingTask(task)
    setIsCreateModalOpen(true)
  }

  const handleUpdateTask = async () => {
    if (!editingTask || !newTask.title) return

    try {
      setModalLoading((prev) => ({ ...prev, update: true }))
      const response = await fetch(`/api/tasks/${editingTask.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTask),
      })

      const data = await response.json()

      if (response.ok) {
        setTasks(tasks.map((task) => (task.id === editingTask.id ? data.task : task)))
        setEditingTask(null)
        resetForm()
      } else {
        console.error("Failed to update task:", data.error)
        alert(`Failed to update task: ${data.error}`)
      }
    } catch (error) {
      console.error("Error updating task:", error)
      alert("Error updating task. Please try again.")
    } finally {
      setModalLoading((prev) => ({ ...prev, update: false }))
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    try {
      setModalLoading((prev) => ({ ...prev, delete: true }))
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setTasks(tasks.filter((task) => task.id !== taskId))
      } else {
        const data = await response.json()
        console.error("Failed to delete task:", data.error)
        alert(`Failed to delete task: ${data.error}`)
      }
    } catch (error) {
      console.error("Error deleting task:", error)
      alert("Error deleting task. Please try again.")
    } finally {
      setModalLoading((prev) => ({ ...prev, delete: false }))
    }
  }

  const handleQuickStatusChange = async (taskId: string, newStatus: string) => {
    // Optimistic update - update UI immediately
    setTasks(tasks.map((task) => (task.id === taskId ? { ...task, status: newStatus } : task)))
    setOpenPopovers((prev) => ({ ...prev, [taskId]: false }))

    // Show loading state
    setUpdatingTasks((prev) => new Set(prev).add(taskId))

    // Find the task and prepare update data
    const task = tasks.find((t) => t.id === taskId)
    if (!task) return

    // Debounced API call
    debouncedUpdate(taskId, { ...task, status: newStatus }, 300)
  }

  const handleRecurringTasksClick = () => {
    const recurringTasks = tasks.filter((task) => task.recurring === recurringType)

    if (recurringTasks.length === 0) {
      alert(`No ${recurringType} recurring tasks found.`)
      return
    }

    // Get current week date range
    const currentWeekStart = formatDate(currentWeek[0])
    const currentWeekEnd = formatDate(currentWeek[6])

    let tasksToAdd: Task[] = []

    if (recurringType === "weekly") {
      // Weekly logic (same as before)
      const existingTitlesInCurrentWeek = tasks
        .filter((task) => task.start_date >= currentWeekStart && task.start_date <= currentWeekEnd)
        .map((task) => task.title)

      tasksToAdd = recurringTasks.filter((task) => !existingTitlesInCurrentWeek.includes(task.title))
    } else if (recurringType === "daily") {
      // Daily logic - for each daily recurring task, create copies for each day of current week
      const existingTasksInCurrentWeek = tasks.filter(
        (task) => task.start_date >= currentWeekStart && task.start_date <= currentWeekEnd,
      )

      for (const recurringTask of recurringTasks) {
        // For each day of the current week, check if this task already exists
        for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
          const targetDate = addDays(currentWeekStart, dayOffset)
          const taskDuration = getDaysDifference(recurringTask.start_date, recurringTask.end_date)
          const targetEndDate = addDays(targetDate, taskDuration)

          // Check if a task with the same title already exists on this date
          const existsOnDate = existingTasksInCurrentWeek.some(
            (task) => task.title === recurringTask.title && task.start_date === targetDate,
          )

          if (!existsOnDate) {
            tasksToAdd.push({
              ...recurringTask,
              start_date: targetDate,
              end_date: targetEndDate,
            })
          }
        }
      }
    }

    if (tasksToAdd.length === 0) {
      alert(`No new ${recurringType} recurring tasks to add. All tasks already exist in current week.`)
      return
    }

    setRecurringTasksToAdd(tasksToAdd)
    setIsRecurringModalOpen(true)
  }

  const handleConfirmRecurringTasks = async () => {
    try {
      setModalLoading((prev) => ({ ...prev, recurring: true }))

      let newRecurringTasks: any[] = []

      if (recurringType === "weekly") {
        const currentWeekStart = formatDate(currentWeek[0])

        newRecurringTasks = recurringTasksToAdd.map((task) => {
          // Calculate days difference from original start to move to current week
          const originalDate = new Date(task.start_date)
          const currentWeekStartDate = new Date(currentWeekStart)
          const dayOfWeek = originalDate.getDay()
          const targetDate = new Date(currentWeekStartDate)
          targetDate.setDate(currentWeekStartDate.getDate() + (dayOfWeek === 0 ? 6 : dayOfWeek - 1))

          const newStartDate = formatDate(targetDate)
          const taskDuration = getDaysDifference(task.start_date, task.end_date)
          const newEndDate = addDays(newStartDate, taskDuration)

          return {
            title: task.title,
            description: task.description,
            start_date: newStartDate,
            end_date: newEndDate,
            status: "Not started",
            priority: task.priority,
            recurring: task.recurring,
          }
        })
      } else {
        // Daily tasks are already prepared with correct dates
        newRecurringTasks = recurringTasksToAdd.map((task) => ({
          title: task.title,
          description: task.description,
          start_date: task.start_date,
          end_date: task.end_date,
          status: "Not started",
          priority: task.priority,
          recurring: task.recurring,
        }))
      }

      console.log("Sending recurring tasks:", newRecurringTasks)

      const response = await fetch("/api/tasks/recurring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tasks: newRecurringTasks }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error("Response not OK:", response.status, errorText)
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
      alert(`Failed to create recurring tasks: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setModalLoading((prev) => ({ ...prev, recurring: false }))
    }
  }

  const handleDragStart = (task: Task) => {
    setDraggedTask(task)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = async (e: React.DragEvent, date: string) => {
    e.preventDefault()
    if (!draggedTask) return

    const daysDiff = getDaysDifference(draggedTask.start_date, draggedTask.end_date)
    const newEndDate = addDays(date, daysDiff)

    // Optimistic update
    const updatedTask = { ...draggedTask, start_date: date, end_date: newEndDate }
    setTasks(tasks.map((task) => (task.id === draggedTask.id ? updatedTask : task)))

    // Show loading state
    setUpdatingTasks((prev) => new Set(prev).add(draggedTask.id))

    // Debounced API call
    debouncedUpdate(draggedTask.id, updatedTask, 500)

    setDraggedTask(null)
  }

  const handleDateClick = (date: string) => {
    setClickedDate(date)
    setNewTask({ ...newTask, start_date: date, end_date: date })
    setIsCreateModalOpen(true)
  }

  const handleResizeStart = (e: React.MouseEvent, task: Task) => {
    e.preventDefault()
    e.stopPropagation()

    if (weekContainerRef.current) {
      const containerRect = weekContainerRef.current.getBoundingClientRect()
      const dayWidth = containerRect.width / 7

      setResizingTask({
        taskId: task.id,
        startX: e.clientX,
        startDate: task.start_date,
        originalEndDate: task.end_date,
        dayWidth,
      })
    }
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!resizingTask) return

    const deltaX = e.clientX - resizingTask.startX
    const daysDelta = Math.round(deltaX / resizingTask.dayWidth)

    const originalDuration = getDaysDifference(resizingTask.startDate, resizingTask.originalEndDate)
    const newDuration = Math.max(0, originalDuration + daysDelta)
    const newEndDate = addDays(resizingTask.startDate, newDuration)

    setTasks(tasks.map((t) => (t.id === resizingTask.taskId ? { ...t, end_date: newEndDate } : t)))
  }

  const handleMouseUp = async () => {
    if (!resizingTask) return

    const task = tasks.find((t) => t.id === resizingTask.taskId)
    if (!task) return

    // Show loading state
    setUpdatingTasks((prev) => new Set(prev).add(resizingTask.taskId))

    // Debounced API call
    debouncedUpdate(resizingTask.taskId, task, 500)

    setResizingTask(null)
  }

  // Add event listeners for resize
  React.useEffect(() => {
    if (resizingTask) {
      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
      return () => {
        document.removeEventListener("mousemove", handleMouseMove)
        document.removeEventListener("mouseup", handleMouseUp)
      }
    }
  }, [resizingTask, tasks])

  const resetForm = () => {
    setNewTask({
      title: "",
      description: "",
      start_date: "",
      end_date: "",
      status: "Not started",
      priority: "medium",
      recurring: "no" as "no" | "daily" | "weekly" | "monthly",
    })
    setIsCreateModalOpen(false)
    setClickedDate("")
  }

  const navigateWeek = (direction: "up" | "down") => {
    const newDate = new Date(currentWeekDate)
    if (direction === "up") {
      newDate.setDate(newDate.getDate() - 7)
    } else {
      newDate.setDate(newDate.getDate() + 7)
    }
    setCurrentWeekDate(newDate)
  }

  const getDaysDifference = (startDate: string, endDate: string) => {
    const start = new Date(startDate)
    const end = new Date(endDate)
    return Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  }

  const isTaskOnDate = (task: Task, date: string) => {
    return date >= task.start_date && date <= task.end_date
  }

  const getTasksForDate = (date: string) => {
    return tasks.filter((task) => isTaskOnDate(task, date))
  }

  const getTaskPosition = (task: Task, weekDays: Date[]) => {
    const startIndex = weekDays.findIndex((day) => formatDate(day) === task.start_date)
    const endIndex = weekDays.findIndex((day) => formatDate(day) === task.end_date)

    if (startIndex === -1) return null

    const actualEndIndex = endIndex === -1 ? weekDays.length - 1 : endIndex
    const span = actualEndIndex - startIndex + 1

    return {
      startCol: startIndex,
      span: span,
      left: `calc(${(startIndex * 100) / 7}% + 4px)`,
      width: `calc(${(span * 100) / 7}% - 8px)`,
    }
  }

  // Smart stacking algorithm
  const calculateTaskPositions = (weekDays: Date[], weekTasks: Task[]) => {
    const TASK_HEIGHT = 110
    const START_TOP = 8

    const columnOccupancy: number[][] = Array(7)
      .fill(null)
      .map(() => [])

    const taskPositions: TaskPosition[] = []

    const sortedTasks = [...weekTasks].sort((a, b) => {
      const aSpan = getDaysDifference(a.start_date, a.end_date) + 1
      const bSpan = getDaysDifference(b.start_date, b.end_date) + 1
      if (aSpan === 1 && bSpan > 1) return -1
      if (aSpan > 1 && bSpan === 1) return 1
      return aSpan - bSpan
    })

    for (const task of sortedTasks) {
      const position = getTaskPosition(task, weekDays)
      if (!position) continue

      const { startCol, span } = position
      const isMultiDay = span > 1

      if (isMultiDay) {
        let topPosition = START_TOP
        let foundSlot = false

        while (!foundSlot) {
          let canPlace = true
          for (let col = startCol; col < startCol + span; col++) {
            if (col >= 7) break
            const occupied = columnOccupancy[col]
            if (occupied.some((occupiedTop) => Math.abs(occupiedTop - topPosition) < TASK_HEIGHT)) {
              canPlace = false
              break
            }
          }

          if (canPlace) {
            foundSlot = true
            for (let col = startCol; col < startCol + span; col++) {
              if (col < 7) {
                columnOccupancy[col].push(topPosition)
              }
            }
          } else {
            topPosition += TASK_HEIGHT
          }
        }

        taskPositions.push({
          taskId: task.id,
          top: topPosition,
          height: 100,
          dayIndex: startCol,
          span,
        })
      } else {
        let topPosition = START_TOP
        const occupied = columnOccupancy[startCol]

        while (occupied.some((occupiedTop) => Math.abs(occupiedTop - topPosition) < TASK_HEIGHT)) {
          topPosition += TASK_HEIGHT
        }

        columnOccupancy[startCol].push(topPosition)

        taskPositions.push({
          taskId: task.id,
          top: topPosition,
          height: 100,
          dayIndex: startCol,
          span: 1,
        })
      }
    }

    return taskPositions
  }

  const formatDisplayDate = (date: Date) => {
    return date.getDate().toString()
  }

  const formatDayName = (date: Date) => {
    return date.toLocaleDateString("en-US", { weekday: "short" })
  }

  const formatWeekRange = (weekDays: Date[]) => {
    const start = weekDays[0]
    const end = weekDays[6]
    return `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${end.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
  }

  const groupedStatuses = Object.entries(statusOptions).reduce(
    (acc, [status, config]) => {
      if (!acc[config.category]) {
        acc[config.category] = []
      }
      acc[config.category].push(status)
      return acc
    },
    {} as Record<string, string[]>,
  )

  const renderWeek = (weekDays: Date[], weekLabel: string, isCurrentWeek = false) => {
    const weekStart = formatDate(weekDays[0])
    const weekEnd = formatDate(weekDays[6])
    const weekTasks = tasks.filter((task) => {
      return (
        (task.start_date >= weekStart && task.start_date <= weekEnd) ||
        (task.end_date >= weekStart && task.end_date <= weekEnd) ||
        (task.start_date <= weekStart && task.end_date >= weekEnd)
      )
    })

    const taskPositions = calculateTaskPositions(weekDays, weekTasks)
    const maxTop = Math.max(...taskPositions.map((pos) => pos.top + pos.height), 200)

    return (
      <div className="rounded-xl overflow-hidden">
        <div className="bg-gray-100 px-4 py-2 text-sm font-medium text-gray-600 text-center">{weekLabel}</div>
        <div className="relative" ref={isCurrentWeek ? weekContainerRef : null}>
          <div className="grid grid-cols-7 border-b border-gray-200">
            {weekDays.map((day, index) => (
              <div key={index} className="p-3 text-center border-r border-gray-100 last:border-r-0">
                <div className="text-xs font-medium text-gray-500 mb-1">{formatDayName(day)}</div>
                <div
                  className={`text-lg font-bold ${
                    formatDate(day) === formatDate(new Date()) ? "text-blue-600" : "text-gray-900"
                  }`}
                >
                  {formatDisplayDate(day)}
                </div>
              </div>
            ))}
          </div>

          <div className="relative" style={{ minHeight: `${maxTop + 20}px` }}>
            <div className="grid grid-cols-7 h-full absolute inset-0">
              {weekDays.map((day, index) => (
                <div
                  key={index}
                  className="border-r border-gray-100 last:border-r-0 cursor-pointer hover:bg-gray-50 transition-colors p-2"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, formatDate(day))}
                  onClick={() => isCurrentWeek && handleDateClick(formatDate(day))}
                >
                  {getTasksForDate(formatDate(day)).length === 0 && isCurrentWeek && (
                    <div className="text-center text-gray-400 text-xs py-8">Click to add task</div>
                  )}
                </div>
              ))}
            </div>

            <div className="absolute inset-0 pointer-events-none">
              {weekTasks.map((task) => {
                const taskPos = taskPositions.find((pos) => pos.taskId === task.id)
                const position = getTaskPosition(task, weekDays)
                const isUpdating = updatingTasks.has(task.id)

                if (!taskPos || !position) return null

                return (
                  <div
                    key={task.id}
                    className={`absolute bg-white rounded-lg p-3 pb-6 shadow-md hover:shadow-lg transition-shadow group border border-gray-200 cursor-move pointer-events-auto ${
                      isUpdating ? "opacity-75" : ""
                    }`}
                    style={{
                      left: position.left,
                      width: position.width,
                      top: `${taskPos.top}px`,
                      height: `${taskPos.height}px`,
                    }}
                    draggable
                    onDragStart={() => handleDragStart(task)}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex flex-col h-full">
                      <div className="flex items-start justify-between mb-1">
                        <div className="flex-1 min-w-0 pr-2">
                          <div
                            className="text-gray-900 font-medium text-sm leading-tight"
                            style={{
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                            }}
                          >
                            {task.title}
                            {task.recurring !== "no" && (
                              <span className="inline-flex items-center ml-1">
                                <Repeat className="w-3 h-3 text-blue-500" />
                                {task.recurring === "daily" && <Calendar className="w-3 h-3 text-green-500 ml-0.5" />}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          {isUpdating && <Loader2 className="w-3 h-3 animate-spin text-blue-500" />}
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 text-gray-600 hover:bg-gray-100"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleEditTask(task)
                              }}
                            >
                              <Edit2 className="w-3 h-3" />
                            </Button>
                          </div>

                          <div
                            className="w-4 h-6 cursor-ew-resize opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                            onMouseDown={(e) => handleResizeStart(e, task)}
                          >
                            <GripVertical className="w-3 h-3 text-gray-400" />
                          </div>
                        </div>
                      </div>

                      <div className="mt-auto pt-1 pb-3 mb-3">
                        <Popover
                          open={openPopovers[task.id] || false}
                          onOpenChange={(open) => setOpenPopovers((prev) => ({ ...prev, [task.id]: open }))}
                        >
                          <PopoverTrigger asChild>
                            <Badge
                              className={`${statusOptions[task.status as keyof typeof statusOptions]?.color || "bg-gray-500"} text-white text-xs border-0 cursor-pointer hover:opacity-80 transition-opacity w-full justify-start relative`}
                            >
                              {task.status}
                              {isUpdating && <Loader2 className="w-3 h-3 animate-spin ml-auto" />}
                            </Badge>
                          </PopoverTrigger>
                          <PopoverContent className="w-64 p-2" align="start">
                            <div className="space-y-1">
                              {Object.entries(groupedStatuses).map(([category, statuses]) => (
                                <div key={category}>
                                  <div className="px-2 py-1 text-xs font-semibold text-gray-500">{category}</div>
                                  {statuses.map((status) => (
                                    <button
                                      key={status}
                                      className="w-full text-left px-2 py-1 text-sm hover:bg-gray-100 rounded flex items-center gap-2 cursor-pointer"
                                      onClick={() => handleQuickStatusChange(task.id, status)}
                                    >
                                      <div
                                        className={`w-3 h-3 rounded-full ${statusOptions[status as keyof typeof statusOptions]?.color}`}
                                      />
                                      {status}
                                    </button>
                                  ))}
                                </div>
                              ))}
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading tasks...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Uno</h1>
            <p className="text-gray-600 mt-1">Manage your tasks and schedule</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => navigateWeek("up")}>
                <ChevronUp className="w-4 h-4 mr-2" />
                Previous Week
              </Button>
              <Button variant="outline" onClick={() => setCurrentWeekDate(new Date())}>
                Today
              </Button>
              <Button variant="outline" onClick={() => navigateWeek("down")}>
                Next Week
                <ChevronDown className="w-4 h-4 ml-2" />
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 bg-green-50 rounded-lg p-1">
                <Select value={recurringType} onValueChange={(value: "daily" | "weekly") => setRecurringType(value)}>
                  <SelectTrigger className="h-8 w-20 border-0 bg-transparent">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" className="h-8 bg-white hover:bg-gray-50" onClick={handleRecurringTasksClick}>
                  <Repeat className="w-4 h-4 mr-2" />
                  Add {recurringType}
                </Button>
              </div>
              <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => setIsCreateModalOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                New Task
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <Card className="bg-white shadow-sm border-0 ring-2 ring-blue-500 rounded-xl overflow-hidden">
            {renderWeek(currentWeek, `This Week (${formatWeekRange(currentWeek)})`, true)}
          </Card>

          <Card className="bg-white shadow-sm border-0">{renderWeek(nextWeek, formatWeekRange(nextWeek))}</Card>
        </div>

        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingTask ? "Edit Task" : "Create New Task"}</DialogTitle>
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

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  placeholder="Task description"
                  rows={5}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={newTask.start_date}
                    onChange={(e) => setNewTask({ ...newTask, start_date: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={newTask.end_date}
                    onChange={(e) => setNewTask({ ...newTask, end_date: e.target.value })}
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
                      {Object.entries(groupedStatuses).map(([category, statuses]) => (
                        <div key={category}>
                          <div className="px-2 py-1.5 text-sm font-semibold text-gray-500 bg-gray-50">{category}</div>
                          {statuses.map((status) => (
                            <SelectItem key={status} value={status}>
                              <div className="flex items-center gap-2">
                                <div
                                  className={`w-3 h-3 rounded-full ${statusOptions[status as keyof typeof statusOptions]?.color}`}
                                />
                                {status}
                              </div>
                            </SelectItem>
                          ))}
                        </div>
                      ))}
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
                    onClick={() => {
                      handleDeleteTask(editingTask.id)
                      resetForm()
                    }}
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
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={isRecurringModalOpen} onOpenChange={setIsRecurringModalOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Add {recurringType} Recurring Tasks</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Add {recurringTasksToAdd.length} {recurringType} recurring task
                {recurringTasksToAdd.length !== 1 ? "s" : ""} to this week?
              </p>

              <div className="flex flex-wrap gap-2">
                {recurringTasksToAdd.map((task, index) => (
                  <div
                    key={`${task.id}-${index}`}
                    className="inline-flex items-center gap-1 px-3 py-2 bg-gray-200 text-gray-700 rounded-full text-sm font-medium"
                  >
                    <Repeat className="w-3 h-3 text-blue-500" />
                    {recurringType === "daily" && <Calendar className="w-3 h-3 text-green-500" />}
                    {task.title}
                    <span className="text-xs text-gray-500 ml-1">
                      (
                      {new Date(task.start_date).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                      )
                    </span>
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
      </div>
    </div>
  )
}
