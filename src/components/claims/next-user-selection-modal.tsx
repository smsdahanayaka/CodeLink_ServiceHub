"use client";

// ===========================================
// Next User Selection Modal Component
// Select user for the next workflow step
// ===========================================

import { useState, useEffect } from "react";
import { User, Users, Loader2, Briefcase } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";

interface EligibleUser {
  id: number;
  firstName: string | null;
  lastName: string | null;
  fullName: string;
  email: string;
  role: { id: number; name: string };
  workload: number;
}

interface NextStep {
  id: number;
  name: string;
  statusName: string;
}

interface NextUserSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nextStep: NextStep;
  onSelectUser: (userId: number) => void;
  loading?: boolean;
  suggestedUsers?: Array<{
    id: number;
    firstName: string | null;
    lastName: string | null;
    roleName: string;
  }>;
}

export function NextUserSelectionModal({
  open,
  onOpenChange,
  nextStep,
  onSelectUser,
  loading = false,
  suggestedUsers,
}: NextUserSelectionModalProps) {
  const [eligibleUsers, setEligibleUsers] = useState<EligibleUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Fetch eligible users for the step
  useEffect(() => {
    const fetchEligibleUsers = async () => {
      if (!open || !nextStep?.id) return;

      setLoadingUsers(true);
      try {
        const res = await fetch(`/api/workflows/steps/${nextStep.id}/eligible-users`);
        const data = await res.json();
        if (data.success) {
          setEligibleUsers(data.data.eligibleUsers);
        }
      } catch (error) {
        console.error("Error fetching eligible users:", error);
        // Fall back to suggested users if API fails
        if (suggestedUsers) {
          setEligibleUsers(
            suggestedUsers.map((u) => ({
              id: u.id,
              firstName: u.firstName,
              lastName: u.lastName,
              fullName: `${u.firstName || ""} ${u.lastName || ""}`.trim(),
              email: "",
              role: { id: 0, name: u.roleName },
              workload: 0,
            }))
          );
        }
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchEligibleUsers();
    setSelectedUserId("");
    setSearchQuery("");
  }, [open, nextStep?.id, suggestedUsers]);

  // Filter users by search
  const filteredUsers = eligibleUsers.filter((user) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      user.fullName.toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower) ||
      user.role.name.toLowerCase().includes(searchLower)
    );
  });

  // Handle selection
  const handleConfirm = () => {
    if (!selectedUserId) {
      toast.error("Please select a user");
      return;
    }
    onSelectUser(parseInt(selectedUserId));
  };

  const getUserName = (user: EligibleUser) => {
    return user.fullName || user.email || "Unknown User";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Select Next Assignee
          </DialogTitle>
          <DialogDescription>
            Choose who will handle the next step:{" "}
            <span className="font-medium">{nextStep.name}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {/* Step info badge */}
          <div className="mb-4 p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              <Badge variant="outline">{nextStep.statusName}</Badge>
              <span className="text-sm text-muted-foreground">
                Status after this step completes
              </span>
            </div>
          </div>

          {/* Search */}
          <div className="mb-4">
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* User list */}
          {loadingUsers ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No eligible users found</p>
              {searchQuery && (
                <p className="text-sm">Try a different search term</p>
              )}
            </div>
          ) : (
            <ScrollArea className="h-[300px] pr-4">
              <RadioGroup value={selectedUserId} onValueChange={setSelectedUserId}>
                <div className="space-y-2">
                  {filteredUsers.map((user) => (
                    <Label
                      key={user.id}
                      htmlFor={`user-${user.id}`}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedUserId === user.id.toString()
                          ? "border-primary bg-primary/5"
                          : "hover:bg-muted"
                      }`}
                    >
                      <RadioGroupItem value={user.id.toString()} id={`user-${user.id}`} />
                      <div className="flex items-center gap-3 flex-1">
                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                          <User className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{getUserName(user)}</span>
                            <Badge variant="secondary" className="text-xs">
                              {user.role.name}
                            </Badge>
                          </div>
                          {user.email && (
                            <p className="text-xs text-muted-foreground truncate">
                              {user.email}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Briefcase className="h-3 w-3" />
                          <span>{user.workload} tasks</span>
                        </div>
                      </div>
                    </Label>
                  ))}
                </div>
              </RadioGroup>
            </ScrollArea>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={loading || !selectedUserId}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              "Confirm & Continue"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
