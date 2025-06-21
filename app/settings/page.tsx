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
  id: number;
  name: string;
  color: string;
  hex: string;
  category: string;
}

const emptyStatus: Omit<Status, "id"> = {
  name: "",
  color: "bg-gray-400",
  hex: "#9ca3af",
  category: "To-do",
};

const PREDEFINED_COLORS = [
    { name: 'Gray', className: 'bg-gray-500', hex: '#6b7280' },
    { name: 'Red', className: 'bg-red-500', hex: '#ef4444' },
    { name: 'Amber', className: 'bg-amber-500', hex: '#f59e0b' },
    { name: 'Green', className: 'bg-green-500', hex: '#22c55e' },
    { name: 'Blue', className: 'bg-blue-500', hex: '#3b82f6' },
    { name: 'Indigo', className: 'bg-indigo-500', hex: '#6366f1' },
    { name: 'Purple', className: 'bg-purple-500', hex: '#8b5cf6' },
    { name: 'Pink', className: 'bg-pink-500', hex: '#ec4899' },
];

export default function SettingsPage() {
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [editingStatus, setEditingStatus] = useState<Status | Omit<Status, "id"> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/statuses")
      .then((res) => res.json())
      .then((data) => {
        setStatuses(data.statuses || []);
        setIsLoading(false);
      });
  }, []);

  const groupedStatuses = useMemo(() => {
    const colorOrderMap = new Map(PREDEFINED_COLORS.map((c, i) => [c.className, i]));

    const groups = statuses.reduce((acc, status) => {
      const category = status.category || 'Uncategorized';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(status);
      return acc;
    }, {} as Record<string, Status[]>);

    for (const category in groups) {
      groups[category].sort((a, b) => {
        const colorIndexA = colorOrderMap.get(a.color) ?? Infinity;
        const colorIndexB = colorOrderMap.get(b.color) ?? Infinity;
        if (colorIndexA !== colorIndexB) {
            return colorIndexA - colorIndexB;
        }
        return a.name.localeCompare(b.name);
      });
    }

    return groups;
  }, [statuses]);

  const handleSave = async () => {
    if (!editingStatus) return;
    setIsSubmitting(true);

    const isEditing = "id" in editingStatus;
    const url = isEditing ? `/api/statuses/${editingStatus.id}` : "/api/statuses";
    const method = isEditing ? "PUT" : "POST";

    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingStatus),
      });

      if (response.ok) {
        if (isEditing) {
          const updatedStatus = await response.json();
          setStatuses(statuses.map(s => s.id === updatedStatus.status.id ? updatedStatus.status : s));
        } else {
          const newStatus = await response.json();
          setStatuses([...statuses, newStatus.status]);
        }
        setEditingStatus(null);
      } else {
        // Handle error
        console.error("Failed to save status");
      }
    } catch (error) {
      console.error("An error occurred:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this status?")) return;

    await fetch(`/api/statuses/${id}`, { method: "DELETE" });
    setStatuses(statuses.filter(s => s.id !== id));
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
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
        <Button onClick={() => setEditingStatus(emptyStatus)}>
          <Plus className="w-4 h-4 mr-2" />
          Add New Status
        </Button>
      </header>
      
      <div className="space-y-8">
        {Object.entries(groupedStatuses).map(([category, statusesInCategory]) => (
            <div key={category}>
                <h2 className="text-xl font-semibold mb-4 text-gray-700">{category}</h2>
                <Card>
                    <CardContent className="p-0">
                    <div className="divide-y">
                        {statusesInCategory.map(status => (
                        <div key={status.id} className="flex items-center justify-between p-4 hover:bg-gray-50">
                            <div className="flex items-center gap-4">
                            <span className={`w-5 h-5 rounded-full ${status.color}`} />
                            <div>
                                <p className="font-semibold">{status.name}</p>
                            </div>
                            </div>
                            <div className="flex items-center gap-2">
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
                <Input id="status-name" value={editingStatus.name} onChange={(e) => setEditingStatus({ ...editingStatus, name: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="status-category">Category</Label>
                <Select value={editingStatus.category} onValueChange={(value) => setEditingStatus({ ...editingStatus, category: value })}>
                    <SelectTrigger><SelectValue/></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="To-do">To-do</SelectItem>
                        <SelectItem value="In progress">In progress</SelectItem>
                        <SelectItem value="Completed">Completed</SelectItem>
                    </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Color</Label>
                <div className="grid grid-cols-8 gap-2 mt-2">
                    {PREDEFINED_COLORS.map(color => (
                        <button
                            key={color.className}
                            className={`w-8 h-8 rounded-full ${color.className} border-2 ${editingStatus.color === color.className ? 'border-blue-500' : 'border-transparent'}`}
                            onClick={() => setEditingStatus({ ...editingStatus, color: color.className, hex: color.hex })}
                        />
                    ))}
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
  );
} 