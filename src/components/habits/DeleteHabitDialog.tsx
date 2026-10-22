"use client";

import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

const HOLD_DURATION_MS = 3000;

interface DeleteHabitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  habitTitle: string;
  onConfirm: () => void;
}

export function DeleteHabitDialog({ open, onOpenChange, habitTitle, onConfirm }: DeleteHabitDialogProps) {
  const [fillPercent, setFillPercent] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const frameRef = useRef<number | null>(null);

  function stopAnimation() {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
  }

  function animate(startPercent: number, startTime: number, direction: 1 | -1) {
    function step(now: number) {
      const elapsed = now - startTime;
      const deltaPercent = (elapsed / HOLD_DURATION_MS) * 100 * direction;
      const next = Math.min(100, Math.max(0, startPercent + deltaPercent));
      setFillPercent(next);

      if (direction === 1 && next >= 100) {
        setRevealed(true);
        stopAnimation();
        return;
      }
      if (direction === -1 && next <= 0) {
        stopAnimation();
        return;
      }
      frameRef.current = requestAnimationFrame(step);
    }

    frameRef.current = requestAnimationFrame(step);
  }

  function handlePointerDown(e: ReactPointerEvent<HTMLButtonElement>) {
    if (revealed) return;
    e.preventDefault();
    stopAnimation();
    animate(fillPercent, performance.now(), 1);
  }

  function handlePointerUp() {
    if (revealed) return;
    stopAnimation();
    animate(fillPercent, performance.now(), -1);
  }

  function resetState() {
    stopAnimation();
    setFillPercent(0);
    setRevealed(false);
    setConfirmText("");
  }

  const canConfirmDelete = confirmText === habitTitle;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) resetState();
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-[420px] w-full p-6 bg-white rounded-2xl border-none shadow-xl">
        <DialogHeader>
          <DialogTitle>Bạn có chắc chắn muốn xóa?</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {!revealed && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onPointerDown={handlePointerDown}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
                className="relative h-9 flex-1 overflow-hidden rounded-lg bg-slate-100 text-sm font-medium text-slate-700 select-none"
              >
                <span
                  className="absolute inset-y-0 left-0 bg-destructive/80"
                  style={{ width: `${fillPercent}%` }}
                />
                <span className="relative z-10">Xóa (giữ 3 giây)</span>
              </button>
              <Button type="button" variant="default" onClick={() => onOpenChange(false)}>
                Đừng xóa
              </Button>
            </div>
          )}

          {revealed && (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-slate-600">
                Nhập <span className="font-semibold">{habitTitle}</span> để xác nhận xóa
              </p>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={habitTitle}
                autoFocus
              />
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="destructive"
                  disabled={!canConfirmDelete}
                  className="flex-1"
                  onClick={() => {
                    onConfirm();
                    onOpenChange(false);
                  }}
                >
                  Xóa vĩnh viễn
                </Button>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Hủy
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
