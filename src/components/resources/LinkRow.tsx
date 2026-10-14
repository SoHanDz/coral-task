"use client";

import { useState } from "react";
import { CopyIcon, MoreVerticalIcon, PencilIcon, PinIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <div className="group flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-muted/60">
      {link.imageUrl && !imageFailed ? (
        <img
          src={link.imageUrl}
          alt=""
          className="size-6 shrink-0 rounded"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <span className="flex size-6 shrink-0 items-center justify-center rounded bg-muted text-xs font-medium text-muted-foreground">
          {domain.charAt(0).toUpperCase()}
        </span>
      )}
      <button
        type="button"
        onClick={() => onOpen(link.id)}
        className="flex min-w-0 flex-1 flex-col items-start text-left"
      >
        <span className="truncate text-sm font-medium text-foreground">{link.title}</span>
        <span className="truncate text-xs text-muted-foreground">{domain}</span>
      </button>

      <div className="flex shrink-0 items-center gap-1 opacity-100 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100 sm:has-data-[popup-open]:opacity-100">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Sao chép liên kết"
          onClick={() => onCopy(link.id)}
        >
          <CopyIcon className="size-4" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button type="button" variant="ghost" size="icon" aria-label="Tùy chọn khác">
                <MoreVerticalIcon className="size-4" />
              </Button>
            }
          />
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onTogglePin(link.id, !link.isPinned)}>
              <PinIcon className={cn(link.isPinned && "fill-current text-amber-500")} />
              {link.isPinned ? "Bỏ ghim" : "Ghim lên đầu"}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit(link)}>
              <PencilIcon />
              Sửa liên kết
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onClick={() => onDelete(link.id)}>
              <Trash2Icon />
              Xóa liên kết
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
