"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DeleteHabitDialog } from "@/components/habits/DeleteHabitDialog";
import { getBestStreak, getCompletedDaysCount, getLongestBreak } from "@/lib/habits/stats";
import type { Habit, HabitLog } from "@/lib/habits/types";

interface HabitDetailDialogProps {
  habit: Habit | null;
  habitLogs: HabitLog[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (id: string, input: { title: string; description: string | null; dueTime: string }) => void;
  onDelete: (id: string) => void;
}

export function HabitDetailDialog({ habit, habitLogs, open, onOpenChange, onUpdate, onDelete }: HabitDetailDialogProps) {
  const [editing, setEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueTime, setDueTime] = useState("23:59");

  function startEditing() {
    if (!habit) return;
    setTitle(habit.title);
    setDescription(habit.description ?? "");
    setDueTime(habit.dueTime);
    setEditing(true);
  }

  function handleSave() {
    if (!habit || !title.trim()) return;
    onUpdate(habit.id, {
      title: title.trim(),
      description: description.trim() ? description.trim() : null,
      dueTime,
    });
    setEditing(false);
  }

  if (!habit) return null;

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) setEditing(false);
          onOpenChange(next);
        }}
      >
        <DialogContent className="sm:max-w-[480px] w-full p-6 bg-white rounded-2xl border-none shadow-xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Sửa thói quen" : habit.title}</DialogTitle>
          </DialogHeader>

          {editing ? (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="habit-title">Tiêu đề</Label>
                <Input id="habit-title" value={title} onChange={(e) => setTitle(e.target.value)} required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="habit-description">Mô tả</Label>
                <Textarea
                  id="habit-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ghi chú thêm (không bắt buộc)"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="habit-due-time">Hạn chót (giờ)</Label>
                <Input
                  id="habit-due-time"
                  type="time"
                  value={dueTime}
                  onChange={(e) => setDueTime(e.target.value)}
                  required
                />
              </div>
              <div className="flex items-center gap-3">
                <Button type="button" className="flex-1" onClick={handleSave}>
                  Lưu thay đổi
                </Button>
                <Button type="button" variant="outline" onClick={() => setEditing(false)}>
                  Hủy
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {habit.description && <p className="text-sm text-slate-600">{habit.description}</p>}
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-xs text-slate-400">Bắt đầu</dt>
                  <dd className="font-medium text-slate-700">{format(habit.createdAt, "dd/MM/yyyy")}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-400">Hạn chót</dt>
                  <dd className="font-medium text-slate-700">{habit.dueTime}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-400">Số ngày hoàn thành</dt>
                  <dd className="font-medium text-slate-700">{getCompletedDaysCount(habit.id, habitLogs)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-400">Streak tốt nhất</dt>
                  <dd className="font-medium text-slate-700">{getBestStreak(habit.id, habitLogs)} ngày</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-400">Chuỗi gián đoạn dài nhất</dt>
                  <dd className="font-medium text-slate-700">{getLongestBreak(habit.id, habitLogs, habit.createdAt)} ngày</dd>
                </div>
              </dl>
              <div className="flex items-center gap-3">
                <Button type="button" variant="outline" className="flex-1" onClick={startEditing}>
                  Sửa
                </Button>
                <Button type="button" variant="destructive" onClick={() => setDeleteOpen(true)}>
                  Xóa
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <DeleteHabitDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        habitTitle={habit.title}
        onConfirm={() => {
          onDelete(habit.id);
          onOpenChange(false);
        }}
      />
    </>
  );
}
