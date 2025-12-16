"use client";

// ===========================================
// Sub-Task Form Dialog Component
// Create or edit a sub-task
// ===========================================

import { useState, useEffect } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SubTask {
  id: number;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  assignedUser: { id: number; firstName: string | null; lastName: string | null } | null;
}

interface UserOption {
  id: number;
  firstName: string | null;
  lastName: string | null;
  email: string;
}

interface SubTaskFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  claimId: number;
  workflowStepId: number;
  subTask?: SubTask | null;
  onSuccess: () => void;
}

export function SubTaskFormDialog({
  open,
  onOpenChange,
  claimId,
  workflowStepId,
  subTask,
  onSuccess,
}: SubTaskFormDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [assignedTo, setAssignedTo] = useState<string>("none");
  const [dueDate, setDueDate] = useState("");
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const isEditing = !!subTask;

  // Fetch users on mount
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch("/api/users?limit=100&status=ACTIVE");
        const data = await res.json();
        if (data.success) {
          setUsers(data.data);
        }
      } catch (error) {
        console.error("Error fetching users:", error);
      } finally {
        setLoadingUsers(false);
      }
    };
    fetchUsers();
  }, []);

  // Populate form when editing
  useEffect(() => {
    if (subTask) {
      setTitle(subTask.title);
      setDescription(subTask.description || "");
      setPriority(subTask.priority);
      setAssignedTo(subTask.assignedUser?.id.toString() || "none");
      setDueDate(subTask.dueDate ? subTask.dueDate.split("T")[0] : "");
    } else {
      // Reset form for new sub-task
      setTitle("");
      setDescription("");
      setPriority("MEDIUM");
      setAssignedTo("none");
      setDueDate("");
    }
  }, [subTask, open]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        assignedTo: assignedTo !== "none" ? parseInt(assignedTo) : null,
        dueDate: dueDate || undefined,
        workflowStepId,
      };

      const url = isEditing
        ? `/api/claims/${claimId}/sub-tasks/${subTask.id}`
        : `/api/claims/${claimId}/sub-tasks`;

      const res = await fetch(url, {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(isEditing ? "Sub-task updated" : "Sub-task created");
        onSuccess();
      } else {
        toast.error(data.error?.message || "Failed to save sub-task");
      }
    } catch (error) {
      console.error("Error saving sub-task:", error);
      toast.error("Failed to save sub-task");
    } finally {
      setLoading(false);
    }
  };

  const getUserName = (user: UserOption) => {
    return `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Sub-Task" : "Add Sub-Task"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the sub-task details below."
              : "Create a new sub-task within this workflow step."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter sub-task title"
                maxLength={255}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dueDate">Due Date</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="assignedTo">Assign To</Label>
              <Select value={assignedTo} onValueChange={setAssignedTo} disabled={loadingUsers}>
                <SelectTrigger>
                  <SelectValue placeholder={loadingUsers ? "Loading..." : "Select user"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      {getUserName(user)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : isEditing ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
