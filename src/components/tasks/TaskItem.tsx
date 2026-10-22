"use client";

import { format } from "date-fns";
import { Trash2Icon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { isOverdue } from "@/lib/tasks/overdue";
import { STATUS_LABELS, type Task } from "@/lib/tasks/types";

interface TaskItemProps {
  task: Task;
  onToggleStatus: (id: string) => void;
  onDelete?: (id: string) => void;
  referenceDate?: Date;
}

export function TaskItem({ task, onToggleStatus, onDelete, referenceDate }: TaskItemProps) {
  const overdue = isOverdue(task, referenceDate);

  return (
    <li
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4 transition-colors duration-200",
        overdue
          ? "border-destructive/30 bg-destructive/5 text-foreground hover:bg-destructive/10"
          : "border-slate-200/80 bg-white text-slate-700 hover:bg-slate-50"
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className={cn("font-medium text-slate-800", overdue && "font-bold text-destructive")}>
            {task.title}
          </p>
          {overdue && (
            <Badge className="border-none bg-destructive text-white">
              Trễ hạn
            </Badge>
          )}
        </div>
        <p className="text-sm text-slate-500">
          {format(task.startDate, "dd/MM/yyyy")} → {format(task.endDate, "dd/MM/yyyy")} ·{" "}
          {STATUS_LABELS[task.status]}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant={overdue ? "destructive" : "outline"}
          className="transition-colors duration-200"
          onClick={() => onToggleStatus(task.id)}
        >
          {task.status === "pending" ? "Đánh dấu Đã xong" : "Đánh dấu Chưa làm"}
        </Button>
        {onDelete && (
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-label="Xóa công việc"
            className="text-muted-foreground transition-colors duration-200"
            onClick={() => onDelete(task.id)}
          >
            <Trash2Icon />
          </Button>
        )}
      </div>
    </li>
  );
}
