"use client";

import { useState, type FormEvent, type ReactElement } from "react";
import { Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { COLOR_OPTIONS } from "@/components/resources/color-options";
import { ICON_OPTIONS } from "@/components/resources/icon-options";
import { cn } from "@/lib/utils";
import type { LinkFolder } from "@/lib/resources/types";

interface FolderFormDialogProps {
  trigger: ReactElement;
  folder?: LinkFolder;
  /** Omit both to let the dialog manage its own open state (the common case,
   * opened by clicking `trigger`). Pass both when another component needs
   * to open this dialog programmatically (see `editingFolder` in
   * ResourcesBoard, Task 6) instead of via a clickable trigger. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSubmit: (input: { name: string; color: string; icon: string }) => void;
  onDelete?: (id: string) => void;
}

export function FolderFormDialog({
  trigger,
  folder,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  onSubmit,
  onDelete,
}: FolderFormDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpenState = setControlledOpen ?? setInternalOpen;
  const [name, setName] = useState(folder?.name ?? "");
  const [color, setColor] = useState(folder?.color ?? COLOR_OPTIONS[0]);
  const [icon, setIcon] = useState(folder?.icon ?? ICON_OPTIONS[0].name);

  function handleOpenChange(next: boolean) {
    if (next) {
      setName(folder?.name ?? "");
      setColor(folder?.color ?? COLOR_OPTIONS[0]);
      setIcon(folder?.icon ?? ICON_OPTIONS[0].name);
    }
    setOpenState(next);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({ name: name.trim(), color, icon });
    setOpenState(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{folder ? "Sửa thư mục" : "Thư mục mới"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="folder-name">Tên thư mục</Label>
            <Input
              id="folder-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="AI Tools, CoralTask Docs,..."
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Màu</Label>
            <div className="flex flex-wrap gap-2">
              {COLOR_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-label={`Màu ${option}`}
                  onClick={() => setColor(option)}
                  className={cn(
                    "size-7 rounded-full ring-offset-2",
                    color === option && "ring-2 ring-slate-900"
                  )}
                  style={{ backgroundColor: option }}
                />
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Biểu tượng</Label>
            <div className="grid grid-cols-8 gap-2">
              {ICON_OPTIONS.map(({ name: optionName, Icon }) => (
                <button
                  key={optionName}
                  type="button"
                  aria-label={optionName}
                  onClick={() => setIcon(optionName)}
                  className={cn(
                    "flex size-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600",
                    icon === optionName && "border-slate-900 bg-slate-900 text-white"
                  )}
                >
                  <Icon className="size-4" />
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button type="submit" className="flex-1">
              {folder ? "Lưu thay đổi" : "Tạo thư mục"}
            </Button>
            {folder && onDelete && (
              <Button
                type="button"
                variant="destructive"
                size="icon"
                aria-label="Xóa thư mục"
                onClick={() => {
                  onDelete(folder.id);
                  setOpenState(false);
                }}
              >
                <Trash2Icon className="size-4" />
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
