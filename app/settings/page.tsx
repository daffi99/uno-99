"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Edit, Trash2, Loader2, ArrowLeft } from "lucide-react"
import Link from "next/link"

interface Status {
  id: number
  name: string
  color: string // Tailwind class
  hex: string // Hex code
  category: string
}

interface Color {
  id: string
  name: string
  hex: string
  tailwind_class: string
}

const emptyStatus: Omit<Status, "id"> = {
  name: "",
  color: "bg-gray-400", // Default Tailwind class
  hex: "#9ca3af", // Default Hex code
  category: "To-do",
}

export default function SettingsPage() {
  const [statuses, setStatuses] = useState<Status[]>([])
  const [availableColors, setAvailableColors] = useState<Color[]>([])
  const [editingStatus, setEditingStatus] = useState<Status | Omit<Status, "id"> | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchStatuses = async () => {
    try {
      const res = await fetch("/api/statuses")
      const data = await res.json()
      if (data.statuses) {
        // Ensure color and hex are always strings, providing fallbacks
        const processedStatuses: Status[] = data.statuses.map((s: any) => ({
          ...s,
          color: s.color || emptyStatus.color, // Fallback for color (tailwind class)
          hex: s.hex || emptyStatus.hex, // Fallback for hex code
        }))
        setStatuses(processedStatuses || [])
      }
    } catch (error) {
      console.error("Failed to fetch statuses:", error)
    }
  }

  const fetchColors = async () => {
    try {
      const res = await fetch("/api/colors")
      const data = await res.json()
      if (res.ok) {
        setAvailableColors(data.colors || [])
      } else {
        console.error("Failed to fetch available colors:", data.error)
      }
    } catch (error) {
      console.error("Error fetching available colors:", error)
    }
  }

  useEffect(() => {
    Promise.all([fetchStatuses(), fetchColors()]).finally(() => setIsLoading(false))
  }, [])

  const groupedStatuses = useMemo(() => {
    const colorOrderMap = new Map(availableColors.map((c, i) => [c.tailwind_class, i]))

    const groups = statuses.reduce(
      (acc, status) => {
        const category = status.category || "Uncategorized"
        if (!acc[category]) {
          acc[category] = []
        }
        acc[category].push(status)
        return acc
      },
      {} as Record<string, Status[]>,
    )

    for (const category in groups) {
      groups[category].sort((a, b) => {
        const colorIndexA = colorOrderMap.get(a.color) ?? Number.POSITIVE_INFINITY
        const colorIndexB = colorOrderMap.get(b.color) ?? Number.POSITIVE_INFINITY
        if (colorIndexA !== colorIndexB) {
          return colorIndexA - colorIndexB
        }
        return a.name.localeCompare(b.name)
      })
    }

    return groups
  }, [statuses, availableColors])

  const handleSave = async () => {
    if (!editingStatus) return

    // Client-side validation for statuses
    if (!editingStatus.name) {
      alert("Status Name is required.")
      setIsSubmitting(false)
      return
    }
    if (!editingStatus.category) {
      alert("Category is required.")
      setIsSubmitting(false)
      return
    }
    // Check if color and hex are valid strings (not null/undefined/empty)
    if (!editingStatus.color || editingStatus.color.trim() === "") {
      alert("Status Color (Tailwind Class) is required. Please select a color.")
      setIsSubmitting(false)
      return
    }
    if (!editingStatus.hex || editingStatus.hex.trim() === "") {
      alert("Status Color (Hex Code) is required. Please select a color.")
      setIsSubmitting(false)
      return
    }

    setIsSubmitting(true)

    const isEditing = "id" in editingStatus
    const url = isEditing ? `/api/statuses/${editingStatus.id}` : "/api/statuses"
    const method = isEditing ? "PUT" : "POST"

    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingStatus),
      })

      if (response.ok) {
        await fetchStatuses() // Re-fetch statuses
        setEditingStatus(null)
      } else {
        const errorData = await response.json()
        console.error("Failed to save status:", errorData.error)
        alert(`Failed to save status: ${errorData.error}`)
      }
    } catch (error) {
      console.error("An error occurred:", error)
      alert("An unexpected error occurred while saving the status.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this status?")) return
    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/statuses/${id}`, { method: "DELETE" })
      if (response.ok) {
        await fetchStatuses() // Re-fetch statuses
      } else {
        const errorData = await response.json()
        console.error("Failed to delete status:", errorData.error)
        alert(`Failed to delete status: ${errorData.error}`)
      }
    } catch (error) {
      console.error("An error occurred:", error)
      alert("An unexpected error occurred while deleting the status.")
    } finally {
      setIsSubmitting(false)
    }
  }

  // New handler to prepare editingStatus with correct color data
  const handleEditStatusClick = (statusToEdit: Status) => {
    // Find the corresponding color from availableColors based on the hex code
    const matchedColor = availableColors.find((color) => color.hex === statusToEdit.hex)

    // Create a new status object with potentially updated color and hex
    const updatedStatus: Status = {
      ...statusToEdit,
      // Ensure color (tailwind_class) is set from matchedColor if found, otherwise use existing or fallback
      color: matchedColor?.tailwind_class || statusToEdit.color || emptyStatus.color,
      // Ensure hex is set from matchedColor if found, otherwise use existing or fallback
      hex: matchedColor?.hex || statusToEdit.hex || emptyStatus.hex,
    }

    setEditingStatus(updatedStatus)
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <header className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href="/" className="p-2 rounded-full hover:bg-gray-100">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-3xl font-bold">Manage Statuses</h1>
        </div>
        <div className="flex gap-2">
          <Link href="/settings/colors">
            <Button variant="outline">Manage Colors</Button>
          </Link>
          <Button onClick={() => setEditingStatus(emptyStatus)}>
            <Plus className="w-4 h-4 mr-2" />
            Add New Status
          </Button>
        </div>
      </header>

      <div className="space-y-8">
        {Object.entries(groupedStatuses).map(([category, statusesInCategory]) => (
          <div key={category}>
            <h2 className="text-xl font-semibold mb-4 text-gray-700">{category}</h2>
            <Card>
              <CardContent className="p-0">
                <div className="divide-y">
                  {statusesInCategory.map((status) => (
                    <div key={status.id} className="flex items-center justify-between p-4 hover:bg-gray-50">
                      <div className="flex items-center gap-4">
                        <span className={`w-5 h-5 rounded-full ${status.color}`} />
                        <div>
                          <p className="font-semibold">{status.name}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEditStatusClick(status)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-500 hover:text-red-600"
                          onClick={() => handleDelete(status.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>

      <Dialog open={!!editingStatus} onOpenChange={() => setEditingStatus(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingStatus && "id" in editingStatus ? "Edit Status" : "Add New Status"}</DialogTitle>
          </DialogHeader>
          {editingStatus && (
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="status-name">Status Name</Label>
                <Input
                  id="status-name"
                  value={editingStatus.name}
                  onChange={(e) => setEditingStatus({ ...editingStatus, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="status-category">Category</Label>
                <Select
                  value={editingStatus.category}
                  onValueChange={(value) => setEditingStatus({ ...editingStatus, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="To-do">To-do</SelectItem>
                    <SelectItem value="In progress">In progress</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Color</Label>
                <Select
                  value={editingStatus.hex} // Use hex as the value for the Select component
                  onValueChange={(value) => {
                    const selectedColor = availableColors.find((c) => c.hex === value)
                    if (selectedColor) {
                      setEditingStatus({
                        ...editingStatus,
                        color: selectedColor.tailwind_class, // Store the actual Tailwind class
                        hex: selectedColor.hex,
                      })
                    }
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a color">
                      <div className="flex items-center gap-2">
                        <span className={`w-4 h-4 rounded-full`} style={{ backgroundColor: editingStatus.hex }} />
                        {availableColors.find((c) => c.hex === editingStatus.hex)?.name || "Select a color"}
                      </div>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {availableColors.map((color) => (
                      <SelectItem key={color.id} value={color.hex}>
                        <div className="flex items-center gap-2">
                          <span className={`w-4 h-4 rounded-full`} style={{ backgroundColor: color.hex }} />
                          {color.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingStatus(null)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
