"use client";

import { CopyIcon, ExternalLinkIcon, PencilIcon, PinIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cleanDomainLabel } from "@/lib/resources/favicon";
import { cn } from "@/lib/utils";
import type { QuickLink } from "@/lib/resources/types";

interface LinkRowProps {
  link: QuickLink;
  onOpen: (id: string) => void;
  onCopy: (id: string) => void;
  onTogglePin: (id: string, next: boolean) => void;
  onEdit: (link: QuickLink) => void;
  onDelete: (id: string) => void;
}

export function LinkRow({ link, onOpen, onCopy, onTogglePin, onEdit, onDelete }: LinkRowProps) {
  const domain = cleanDomainLabel(link.url);

  return (
    <div className="group flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-slate-50">
      <img
        src={link.imageUrl ?? undefined}
        alt=""
        className="size-6 shrink-0 rounded"
        onError={(e) => {
          e.currentTarget.style.visibility = "hidden";
        }}
      />
      <button
        type="button"
        onClick={() => onOpen(link.id)}
        className="flex min-w-0 flex-1 flex-col items-start text-left"
      >
        <span className="truncate text-sm font-medium text-slate-900">{link.title}</span>
        <span className="truncate text-xs text-slate-500">{domain}</span>
      </button>

      <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Mở trong tab mới"
          onClick={() => onOpen(link.id)}
        >
          <ExternalLinkIcon className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Sao chép liên kết"
          onClick={() => onCopy(link.id)}
        >
          <CopyIcon className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={link.isPinned ? "Bỏ ghim" : "Ghim lên đầu"}
          onClick={() => onTogglePin(link.id, !link.isPinned)}
        >
          <PinIcon className={cn("size-4", link.isPinned && "fill-current text-amber-500")} />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Sửa liên kết"
          onClick={() => onEdit(link)}
        >
          <PencilIcon className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Xóa liên kết"
          onClick={() => onDelete(link.id)}
        >
          <Trash2Icon className="size-4 text-destructive" />
        </Button>
      </div>
    </div>
  );
}
