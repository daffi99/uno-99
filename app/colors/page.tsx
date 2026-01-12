"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Plus, Edit, Trash2 } from "lucide-react"
import { SketchPicker, ColorResult } from "react-color"

interface Status {
  id: number
  name: string
  color: string // This will be deprecated
  hex: string
  category: string
}

const emptyStatus: Omit<Status, "id"> = {
  name: "",
  color: "", // Deprecated
  hex: "#93BEE6", // Default color for the picker
  category: "Uncategorized", // Default category
};

export default function ColorsPage() {
  const [statuses, setStatuses] = useState<Status[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [editingStatus, setEditingStatus] = useState<Status | Omit<Status, "id"> | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    fetch("/api/statuses")
      .then((res) => res.json())
      .then((data) => {
        setStatuses(data.statuses || [])
        setIsLoading(false)
      })
  }, [])

  const handleSave = async () => {
    if (!editingStatus) return
    setIsSubmitting(true)

    const isEditing = "id" in editingStatus
    const url = isEditing ? `/api/statuses/${editingStatus.id}` : "/api/statuses"
    const method = isEditing ? "PUT" : "POST"

    // The 'color' field is deprecated but the API might still expect it.
    // We send an empty string or a placeholder.
    const payload = {
      ...editingStatus,
      color: editingStatus.hex, // Or just an empty string: ""
    }

    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        const updatedData = await response.json()
        if (isEditing) {
          setStatuses(statuses.map(s => s.id === updatedData.status.id ? updatedData.status : s))
        } else {
          setStatuses([...statuses, updatedData.status])
        }
        setEditingStatus(null)
      } else {
        console.error("Failed to save status")
        // Optionally, show an error to the user
      }
    } catch (error) {
      console.error("An error occurred:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this status? This action cannot be undone.")) return

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/statuses/${id}`, { method: "DELETE" })
      if (response.ok) {
        setStatuses(statuses.filter(s => s.id !== id))
      } else {
        console.error("Failed to delete status")
        // Optionally, show an error to the user
      }
    } catch (error) {
      console.error("An error occurred:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-900">Manage Colors</h1>
            <Link href="/" passHref>
              <Button variant="outline">Calendar</Button>
            </Link>
            <Link href="/settings" passHref>
              <Button variant="outline">Manage Statuses</Button>
            </Link>
          </div>
          <Button onClick={() => setEditingStatus(emptyStatus)}>
            <Plus className="w-4 h-4 mr-2" />
            Add New Color
          </Button>
        </div>
      </header>
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
          </div>
        ) : (
          <Card>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {statuses.map((status) => (
                  <div key={status.id} className="group flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center gap-4">
                      <span 
                        className="w-6 h-6 rounded-full"
                        style={{ backgroundColor: status.hex }}
                      />
                      <div>
                        <p className="font-semibold">{status.name}</p>
                        <p className="text-sm text-gray-500">{status.hex}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" onClick={() => setEditingStatus(status)}>
                            <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" onClick={() => handleDelete(status.id)}>
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      <Dialog open={!!editingStatus} onOpenChange={() => setEditingStatus(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingStatus && "id" in editingStatus ? "Edit Color" : "Add New Color"}</DialogTitle>
          </DialogHeader>
          {editingStatus && (
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="status-name">Name</Label>
                <Input 
                  id="status-name" 
                  value={editingStatus.name} 
                  onChange={(e) => setEditingStatus({ ...editingStatus, name: e.target.value })} 
                  placeholder="e.g., 'Urgent', 'Client Review'"
                />
              </div>
              <div>
                <Label>Color</Label>
                <div className="flex justify-center pt-4">
                  <SketchPicker
                    color={editingStatus.hex}
                    onChangeComplete={(color: ColorResult) => setEditingStatus({ ...editingStatus, hex: color.hex })}
                    disableAlpha
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingStatus(null)}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
