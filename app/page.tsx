"use client"

import React, { useState, useRef, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Plus, Edit2, Trash2, ChevronUp, ChevronDown, GripVertical, Repeat, Loader2, Calendar, Settings } from "lucide-react"
import Link from "next/link"

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
  type?: string
}

interface TaskPosition {
  taskId: string
  top: number
  height: number
  dayIndex: number
  span: number
}

const formatDate = (date: Date) => {
  return date.toISOString().split("T")[0]
}

// Define the fixed checklists and platforms
const CHECKLISTS = [
  {
    key: 'reel',
    label: 'Checklist for reel',
    platforms: ['Facebook', 'Instagram', 'TikTok', 'YouTube', 'LinkedIn', 'Threads'],
  },
  {
    key: 'image',
    label: 'Checklist for image',
    platforms: ['Facebook', 'Instagram', 'LinkedIn', 'Google Business', 'Threads'],
  },
];

export default function UnoCalendar() {
  const [statusOptions, setStatusOptions] = useState<Record<string, { color: string; hex: string; category: string }>>({});
  const [statusesLoaded, setStatusesLoaded] = useState(false);
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
    edge: 'left' | 'right'
  } | null>(null)

  const weekContainerRef = useRef<HTMLDivElement>(null)

  const [newTask, setNewTask] = useState<Omit<Task, 'id' | 'created_at' | 'updated_at'>>({
    title: "",
    description: "",
    start_date: "",
    end_date: "",
    status: "Not started",
    priority: "medium",
    recurring: "no",
  })

  const [openPopovers, setOpenPopovers] = useState<Record<string, boolean>>({})
  const [modalLoading, setModalLoading] = useState({
    create: false,
    update: false,
    delete: false,
    recurring: false,
  })

  // Add a loading state for duplicate
  const [duplicateLoading, setDuplicateLoading] = useState(false);
  
  useEffect(() => {
    const fetchStatuses = async () => {
      try {
        const res = await fetch('/api/statuses');
        const data = await res.json();
        if (data.statuses) {
          const options = data.statuses.reduce((acc: any, status: any) => {
            acc[status.name] = { color: status.color, hex: status.hex, category: status.category };
            return acc;
          }, {});
          setStatusOptions(options);
          setStatusesLoaded(true);
        }
      } catch (error) {
        console.error("Failed to fetch statuses:", error);
      }
    };
    fetchStatuses();
  }, []);

  const groupedStatuses = useMemo(() => {
    if (!statusesLoaded) return {};
    return Object.entries(statusOptions).reduce(
      (acc, [statusName, config]) => {
        const category = config.category;
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(statusName);
        return acc;
      },
      {} as Record<string, string[]>
    );
  }, [statusOptions, statusesLoaded]);

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
        await fetch(`/api/tasks/${taskId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updateData),
        })
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

        setTasks(data.tasks || [])
    } catch (error) {
      console.error("Error fetching tasks:", error)
    } finally {
      setLoading(false)
    }
  }

  // Load tasks on component mount and when week changes
  useEffect(() => {
    if (statusesLoaded) {
    fetchTasks()
    }
  }, [currentWeekDate, statusesLoaded])

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
      type: task.type,
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
    if (!confirm("Are you sure you want to delete this task?")) return;
    try {
      setModalLoading((prev) => ({...prev, delete: true}))
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setTasks(tasks.filter((task) => task.id !== taskId))
      } else {
        console.error("Failed to delete task")
      }
    } catch(e) {
      console.error("Failed to delete task", e)
    } finally {
      setModalLoading((prev) => ({...prev, delete: false}))
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
    const prevWeekStart = formatDate(previousWeek[0]);
    const prevWeekEnd = formatDate(previousWeek[6]);
    const recurringTasksFromPrevWeek = tasks.filter(task =>
        task.recurring === 'weekly' &&
        task.start_date >= prevWeekStart &&
        task.start_date <= prevWeekEnd
    );

    if (recurringTasksFromPrevWeek.length === 0) {
        alert(`No weekly recurring tasks found in the previous week.`);
        return;
    }

    const currentWeekStart = formatDate(currentWeek[0]);
    const currentWeekEnd = formatDate(currentWeek[6]);
    
    const tasksToAdd: Task[] = [];

    recurringTasksFromPrevWeek.forEach((task) => {
        const taskExistsInCurrentWeek = tasks.some(
            (t) => t.title === task.title && t.start_date >= currentWeekStart && t.start_date <= currentWeekEnd
        );

        if (!taskExistsInCurrentWeek) {
            const originalDayIndex = previousWeek.findIndex(d => formatDate(d) === task.start_date);
            if (originalDayIndex !== -1) {
                const newStartDate = formatDate(currentWeek[originalDayIndex]);
                const duration = getDaysDifference(task.start_date, task.end_date);
                const newEndDate = addDays(newStartDate, duration);
                
            tasksToAdd.push({
                    ...task,
                    start_date: newStartDate,
                    end_date: newEndDate,
                });
          }
        }
    });

    if (tasksToAdd.length === 0) {
        alert(`All weekly recurring tasks from the previous week are already present this week.`);
        return;
    }

    setRecurringTasksToAdd(tasksToAdd);
    setIsRecurringModalOpen(true);
  }

  const handleConfirmRecurringTasks = async () => {
    if (recurringTasksToAdd.length === 0) return

    try {
      setModalLoading((prev) => ({ ...prev, recurring: true }))
      const tasksToCreate = recurringTasksToAdd.map(task => {
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

  const handleResizeStart = (e: React.MouseEvent, task: Task, edge: 'left' | 'right') => {
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
        edge,
      })
    }
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!resizingTask) return

    const deltaX = e.clientX - resizingTask.startX
    const daysDelta = Math.round(deltaX / resizingTask.dayWidth)

    if (resizingTask.edge === 'left') {
      const newStartDate = addDays(resizingTask.startDate, daysDelta)
      if (new Date(newStartDate) <= new Date(resizingTask.originalEndDate)) {
        setTasks(tasks.map((t) =>
          t.id === resizingTask.taskId
            ? { ...t, start_date: newStartDate }
            : t
        ))
      }
    } else {
    const originalDuration = getDaysDifference(resizingTask.startDate, resizingTask.originalEndDate)
    const newDuration = Math.max(0, originalDuration + daysDelta)
    const newEndDate = addDays(resizingTask.startDate, newDuration)
      setTasks(tasks.map((t) =>
        t.id === resizingTask.taskId
          ? { ...t, end_date: newEndDate }
          : t
      ))
    }
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

  const handleNewTaskClick = () => {
    setEditingTask(null)
    setClickedDate("")
    const today = formatDate(new Date())
    setNewTask({
      title: "",
      description: "",
      start_date: today,
      end_date: today,
      status: "Not started",
      priority: "medium",
      recurring: "no",
      type: "descriptive",
    })
    setIsCreateModalOpen(true)
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
      recurring: "no",
    })
    setIsCreateModalOpen(false)
    setEditingTask(null)
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
      width: `calc(${(span * 100) / 7}% - 10px)`,
    }
  }

  // Smart stacking algorithm`
  const calculateTaskPositions = (weekDays: Date[], weekTasks: Task[]) => {
    const TASK_HEIGHT = 70
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
      <div className="border-x border-b border-gray-200 bg-white rounded-lg overflow-hidden">
        <div className="grid grid-cols-7 divide-x divide-gray-200">
              {weekDays.map((day, index) => (
            <div key={index} className="p-2 text-center">
              <div className="text-sm font-medium text-gray-500">{formatDayName(day)}</div>
              <div className="text-lg font-bold text-gray-900">{formatDisplayDate(day)}</div>
                </div>
              ))}
            </div>

        <div
          ref={isCurrentWeek ? weekContainerRef : null}
          className="relative h-full"
          style={{ minHeight: `${maxTop}px` }}
        >
          <div className="absolute inset-0 grid grid-cols-7 divide-x divide-gray-200">
            {weekDays.map((day) => (
                <div
                key={formatDate(day)}
                className="relative h-full"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, formatDate(day))}
                onClick={() => handleDateClick(formatDate(day))}
              />
              ))}
            </div>
          
            <div className="absolute inset-0 pointer-events-none">
                {weekTasks.map((task) => {
                  const position = getTaskPosition(task, weekDays)
              const taskPos = taskPositions.find(p => p.taskId === task.id)
              if (!position || !taskPos) return null

                  const isUpdating = updatingTasks.has(task.id)

                  return (
                    <div
                      key={task.id}
                  className={`absolute bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow group pointer-events-auto ${isUpdating ? 'opacity-75' : ''}`}
                      style={{
                        left: position.left,
                        width: position.width,
                        top: `${taskPos.top}px`,
                        height: `${taskPos.height * 0.60}px`,
                        border: 'none',
                        zIndex: 10,
                      }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Left resize edge - at the very edge, above padding */}
                  <div
                    className="absolute left-0 top-0 h-full w-2 md:w-3 cursor-ew-resize z-30"
                    onMouseDown={e => handleResizeStart(e, task, 'left')}
                    style={{ background: 'rgba(0,0,0,0)' }}
                    title="Resize task from left"
                    draggable={false}
                  />
                  {/* Right resize edge - at the very edge, above padding */}
                  <div
                    className="absolute right-0 top-0 h-full w-2 md:w-3 cursor-ew-resize z-30"
                    onMouseDown={e => handleResizeStart(e, task, 'right')}
                    style={{ background: 'rgba(0,0,0,0)' }}
                    title="Resize task from right"
                    draggable={false}
                  />
                  {/* Card content with padding */}
                  <div 
                    className="relative h-full p-2 pb-2 cursor-move"
                      draggable
                      onDragStart={() => handleDragStart(task)}
                    >
                      <div className="flex flex-col h-full">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                          className="inline-block align-middle"
                            style={{
                              width: '0.5rem',
                              height: '0.5rem',
                              minWidth: '0.5rem',
                              minHeight: '0.5rem',
                              verticalAlign: 'middle',
                              display: 'inline-block',
                            borderRadius: task.type === 'descriptive' || !task.type ? '9999px' : undefined,
                            background: !isUpdating && (task.type === 'descriptive' || !task.type)
                              ? undefined
                              : 'none',
                            padding: 0,
                            }}
                        >
                          {isUpdating ? (
                            <Loader2 className="animate-spin w-3 h-3" style={{ color: statusOptions[task.status as keyof typeof statusOptions]?.hex || '#888' }} />
                          ) : task.type === 'checklist' ? (
                            <svg width="8" height="8" viewBox="0 0 8 8" style={{ display: 'block' }}>
                              <polygon points="4,0 8,8 0,8" fill={statusOptions[task.status as keyof typeof statusOptions]?.hex || '#888'} />
                            </svg>
                          ) : (
                            <span
                              className={statusOptions[task.status as keyof typeof statusOptions]?.color || 'bg-gray-400'}
                              style={{
                                width: '100%',
                                height: '100%',
                                display: 'block',
                                borderRadius: '9999px',
                              }}
                            />
                          )}
                        </span>
                          <div
                            className="text-gray-900 font-bold text-xs leading-tight truncate"
                            style={{
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              maxWidth: '100%',
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

                        <div className="flex items-center justify-between group/card">
                          <Popover
                            open={openPopovers[task.id] || false}
                            onOpenChange={(open) => setOpenPopovers((prev) => ({ ...prev, [task.id]: open }))}
                          >
                            <PopoverTrigger asChild>
                              <span
                                className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${statusOptions[task.status as keyof typeof statusOptions]?.color || 'bg-gray-400'} text-white`}
                                style={{ fontFamily: 'Montserrat, sans-serif', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 90 }}
                              >
                                {task.status}
                              </span>
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
                          <div className="flex items-center gap-2 opacity-0 group-hover/card:opacity-100 transition-opacity">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 text-gray-600 hover:bg-gray-100 focus:bg-gray-100 active:bg-gray-100 focus:ring-0 focus:outline-none"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditTask(task);
                              }}
                            >
                              <Edit2 className="w-3 h-3" />
                            </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
          </div>
        </div>
      </div>
    )
  }

  const handleDuplicateTask = () => {
    if (!editingTask) return;
    setDuplicateLoading(true);
    // Find all tasks with the same base title and same type
    const baseTitle = editingTask.title.replace(/ \d+$/, '');
    const similarTasks = tasks.filter(t => t.title.startsWith(baseTitle) && t.type === editingTask.type);
    // Find the highest number suffix
    let maxNum = 1;
    similarTasks.forEach(t => {
      const match = t.title.match(/ (\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });
    const newTitle = `${baseTitle} ${maxNum + 1}`;
    // Prepare new task data
    const newTaskData = {
      ...editingTask,
      id: undefined,
      created_at: undefined,
      updated_at: undefined,
      title: newTitle,
      type: editingTask.type,
    };
    // Create the new task via API
    fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newTaskData),
    })
      .then(res => res.json())
      .then(data => {
        if (data.task) setTasks([...tasks, data.task]);
        setIsCreateModalOpen(false);
      })
      .finally(() => setDuplicateLoading(false));
  };

  const currentWeekRecurringCount = useMemo(() => {
    const weekStart = formatDate(currentWeek[0]);
    const weekEnd = formatDate(currentWeek[6]);
    return tasks.filter(task =>
      task.recurring !== 'no' &&
      (
        (task.start_date >= weekStart && task.start_date <= weekEnd) ||
        (task.end_date >= weekStart && task.end_date <= weekEnd) ||
        (task.start_date <= weekStart && task.end_date >= weekEnd)
      )
    ).length;
  }, [tasks, currentWeek]);

  const nextWeekRecurringCount = useMemo(() => {
    const weekStart = formatDate(nextWeek[0]);
    const weekEnd = formatDate(nextWeek[6]);
    return tasks.filter(task =>
      task.recurring !== 'no' &&
      (
        (task.start_date >= weekStart && task.start_date <= weekEnd) ||
        (task.end_date >= weekStart && task.end_date <= weekEnd) ||
        (task.start_date <= weekStart && task.end_date >= weekEnd)
      )
    ).length;
  }, [tasks, nextWeek]);

  if (loading || !statusesLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: '#f7f6ed' }}>
      <div className="max-w-8xl
      ">
        <div className="flex items-center justify-between mb-7 px-2">
          <div className="flex items-center gap-2">
            <img src="/placeholder-logo.png" alt="Uno Logo" style={{ height: '42px', objectFit: 'contain', aspectRatio: 'auto' }} />
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => navigateWeek("up")} className="font-semibold px-3 py-1 text-xs text-black bg-transparent hover:bg-gray-100">&lt; Previous Week</Button>
            <Button onClick={() => setCurrentWeekDate(new Date())} className="font-semibold rounded-sm px-2 py-1 text-xs bg-white text-black hover:bg-gray-100">Today</Button>
            <Button onClick={() => navigateWeek("down")} className="font-semibold rounded-sm px-3 py-1 text-xs text-black bg-transparent hover:bg-gray-100">Next Week &gt;</Button>
            {/* <Select>
              <SelectTrigger className="font-semibold px-4 w-26 text-xs text-black hover:bg-gray-100">Choose</SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Weekly</SelectItem>
              </SelectContent>
            </Select> */}
            <Button className="font-semibold px-4 py-2 text-base bg-white text-black text-xs hover:bg-gray-100" onClick={handleRecurringTasksClick}>+ Add weekly</Button>
            <Button className="font-semibold px-4 py-2 bg-blue-600 text-white text-xs border-none hover:bg-blue-700" onClick={handleNewTaskClick}>+</Button>
            <Link href="/settings">
              <Button className="font-semibold p-3 bg-blue-600 text-white text-xs border-none hover:bg-blue-700">
                <Settings className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>

        <div className="space-y-4">
          <Card className="bg-white shadow-sm border-0 rounded-xl overflow-hidden max-w-7xl mx-auto" style={{ paddingLeft: '5%', paddingRight: '5%', paddingTop: 12, marginBottom:2 }}>
            <div className="text-center mb-4 px-2">
              <h2 className="text-xl font-bold text-gray-800">{formatWeekRange(currentWeek)}</h2>
              <p className="text-sm text-gray-500">
                {currentWeekRecurringCount} recurring task{currentWeekRecurringCount !== 1 ? 's' : ''}
              </p>
            </div>
            {renderWeek(currentWeek, `This Week (${formatWeekRange(currentWeek)})`, true)}
          </Card>

          <Card className="bg-white shadow-sm border-0 rounded-xl overflow-hidden max-w-7xl mx-auto mt-8" style={{ paddingLeft: '5%', paddingRight: '5%', paddingTop: 12, marginBottom:2 }}>
             <div className="text-center mb-4 px-2">
                <h2 className="text-xl font-bold text-gray-800">{formatWeekRange(nextWeek)}</h2>
                <p className="text-sm text-gray-500">
                  {nextWeekRecurringCount} recurring task{nextWeekRecurringCount !== 1 ? 's' : ''}
                </p>
             </div>
            {renderWeek(nextWeek, formatWeekRange(nextWeek))}
            </Card>
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

              {(editingTask?.type === 'checklist' || newTask.type === 'checklist') ? (
                <div className="space-y-6">
                  {CHECKLISTS.map((checklist) => {
                    let checklistState: Record<string, string[]> = {};
                    try {
                      checklistState = newTask.description ? JSON.parse(newTask.description) as Record<string, string[]> : {};
                    } catch {
                      checklistState = {};
                    }
                    const checked = checklistState[checklist.key] || [];
                    const total = checklist.platforms.length;
                    const completed = checked.length;
                    const percent = Math.round((completed / total) * 100);
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
                                onChange={e => {
                                  let newChecked = checked.includes(platform)
                                    ? checked.filter((p: string) => p !== platform)
                                    : [...checked, platform];
                                  const newState = { ...checklistState, [checklist.key]: newChecked };
                                  setNewTask({ ...newTask, description: JSON.stringify(newState) });
                                }}
                                className="form-checkbox h-4 w-4 text-blue-600 border-gray-300 rounded"
                              />
                              {platform}
                            </label>
                          ))}
                        </div>
                      </div>
                    );
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
                {editingTask && (
                  <Button
                    style={{ backgroundColor: '#facc15', color: '#000' }}
                    className="hover:bg-yellow-500 focus:bg-yellow-500 active:bg-yellow-600 border-none"
                    onClick={handleDuplicateTask}
                    disabled={duplicateLoading}
                  >
                    {duplicateLoading ? (
                      <span className="flex items-center gap-2"><Loader2 className="animate-spin w-4 h-4" /> Duplicating...</span>
                    ) : (
                      'Duplicate Task'
                    )}
                  </Button>
                )}
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
