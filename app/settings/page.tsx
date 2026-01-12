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
  color: string; // This will be deprecated
  hex: string;
  category: string;
}

const emptyStatus: Omit<Status, "id"> = {
  name: "",
  color: "bg-gray-400", // Default value, will be removed
  hex: "#9ca3af",
  category: "To-do",
};

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
    const groups = statuses.reduce((acc, status) => {
      const category = status.category || 'Uncategorized';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(status);
      return acc;
    }, {} as Record<string, Status[]>);

    // Simplified sorting, can be adjusted if needed
    for (const category in groups) {
      groups[category].sort((a, b) => a.name.localeCompare(b.name));
    }

    return groups;
  }, [statuses]);

  const handleSave = async () => {
    if (!editingStatus) return;
    setIsSubmitting(true);

    const isEditing = "id" in editingStatus;
    const url = isEditing ? `/api/statuses/${editingStatus.id}` : "/api/statuses";
    const method = isEditing ? "PUT" : "POST";

    // Ensure a hex value exists
    const payload = { ...editingStatus };
    if (!payload.hex) {
      payload.hex = '#000000'; // Default to black if no color is selected
    }

    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const updatedData = await response.json();
        if (isEditing) {
          setStatuses(statuses.map(s => s.id === updatedData.status.id ? updatedData.status : s));
        } else {
          setStatuses([...statuses, updatedData.status]);
        }
        setEditingStatus(null);
      } else {
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
        <div className="flex items-center gap-2">
          <Link href="/colors">
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
                        {statusesInCategory.map(status => (
                        <div key={status.id} className="flex items-center justify-between p-4 hover:bg-gray-50">
                            <div className="flex items-center gap-4">
                            <span 
                                className="w-5 h-5 rounded-full"
                                style={{ backgroundColor: status.hex }}
                            />
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
                <div className="flex items-center gap-2 mt-2">
                    <div 
                      className="w-8 h-8 rounded-full border"
                      style={{ backgroundColor: editingStatus.hex }}
                    />
                    <p className="text-sm text-gray-500">
                      Manage colors in the <Link href="/colors" className="underline text-blue-600">Manage Colors</Link> screen.
                    </p>
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
