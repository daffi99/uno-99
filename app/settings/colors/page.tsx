"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Edit, Trash2, Loader2, ArrowLeft } from "lucide-react"
import Link from "next/link"

interface Color {
  id: string
  name: string
  hex: string
  created_at?: string
}

const emptyColor: Omit<Color, "id" | "created_at"> = {
  name: "",
  hex: "#000000",
}

export default function ManageColorsPage() {
  const [colors, setColors] = useState<Color[]>([])
  const [editingColor, setEditingColor] = useState<Color | Omit<Color, "id" | "created_at"> | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchColors = async () => {
    try {
      setIsLoading(true)
      const res = await fetch("/api/colors")
      const data = await res.json()
      if (res.ok) {
        setColors(data.colors || [])
      } else {
        console.error("Failed to fetch colors:", data.error)
      }
    } catch (error) {
      console.error("Error fetching colors:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchColors()
  }, [])

  const handleSave = async () => {
    if (!editingColor || !editingColor.name || !editingColor.hex) {
      alert("Please fill all required fields.")
      return
    }
    setIsSubmitting(true)

    const isEditing = "id" in editingColor && editingColor.id !== undefined
    const url = isEditing ? `/api/colors/${editingColor.id}` : "/api/colors"
    const method = isEditing ? "PUT" : "POST"

    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editingColor.name, hex: editingColor.hex }),
      })

      if (response.ok) {
        await fetchColors() // Re-fetch all colors to ensure consistency
        setEditingColor(null)
      } else {
        const errorData = await response.json()
        console.error("Failed to save color:", errorData.error)
        alert(`Failed to save color: ${errorData.error}`)
      }
    } catch (error) {
      console.error("An error occurred:", error)
      alert("An unexpected error occurred while saving the color.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this color?")) return
    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/colors/${id}`, { method: "DELETE" })
      if (response.ok) {
        await fetchColors() // Re-fetch all colors
      } else {
        const errorData = await response.json()
        console.error("Failed to delete color:", errorData.error)
        alert(`Failed to delete color: ${errorData.error}`)
      }
    } catch (error) {
      console.error("An error occurred:", error)
      alert("An unexpected error occurred while deleting the color.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newHex = e.target.value
    setEditingColor({ ...editingColor!, hex: newHex })
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
          <Link href="/settings" className="p-2 rounded-full hover:bg-gray-100">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-3xl font-bold">Manage Colors</h1>
        </div>
        <Button onClick={() => setEditingColor(emptyColor)}>
          <Plus className="w-4 h-4 mr-2" />
          Add New Color
        </Button>
      </header>

      <Card>
        <CardContent className="p-0">
          <div className="divide-y">
            {colors.length === 0 ? (
              <p className="p-4 text-center text-gray-500">No colors defined. Add one above!</p>
            ) : (
              colors.map((color) => (
                <div key={color.id} className="flex items-center justify-between p-4 hover:bg-gray-50">
                  <div className="flex items-center gap-4">
                    <span className={`w-5 h-5 rounded-full bg-[${color.hex}]`} />
                    <div>
                      <p className="font-semibold">{color.name}</p>
                      <p className="text-sm text-gray-500">{color.hex}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => setEditingColor(color)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-500 hover:text-red-600"
                      onClick={() => handleDelete(color.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!editingColor} onOpenChange={() => setEditingColor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingColor && "id" in editingColor ? "Edit Color" : "Add New Color"}</DialogTitle>
          </DialogHeader>
          {editingColor && (
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="color-name">Color Name</Label>
                <Input
                  id="color-name"
                  value={editingColor.name}
                  onChange={(e) => setEditingColor({ ...editingColor, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="color-hex">Hex Code</Label>
                <Input
                  id="color-hex"
                  type="color"
                  value={editingColor.hex}
                  onChange={handleHexChange}
                  className="h-10 w-full"
                />
                <Input
                  type="text"
                  value={editingColor.hex}
                  onChange={handleHexChange}
                  placeholder="#RRGGBB"
                  className="mt-2"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingColor(null)} disabled={isSubmitting}>
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
