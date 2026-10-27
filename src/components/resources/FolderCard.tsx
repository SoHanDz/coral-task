"use client";

import { Folder as FolderIcon, MoreVerticalIcon, PencilIcon, PinIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LinkFormDialog } from "@/components/resources/LinkFormDialog";
import { LinkRow } from "@/components/resources/LinkRow";
import { getIconComponent } from "@/components/resources/icon-options";
import { cn } from "@/lib/utils";
import type { LinkFolder, QuickLink } from "@/lib/resources/types";

interface FolderCardProps {
  folder: LinkFolder | null;
  links: QuickLink[];
  /** All folders, for the add-link dialog's folder picker. */
  folders: LinkFolder[];
  onCreateLink: (input: { url: string; title: string; description?: string; folderId: string | null }) => void;
  onOpenLink: (id: string) => void;
  onCopyLink: (id: string) => void;
  onToggleLinkPinned: (id: string, next: boolean) => void;
  onEditLink: (link: QuickLink) => void;
  onDeleteLink: (id: string) => void;
  onEditFolder?: (folder: LinkFolder) => void;
  onDeleteFolder?: (id: string) => void;
  onToggleFolderPinned?: (id: string, next: boolean) => void;
}

export function FolderCard({
  folder,
  links,
  folders,
  onCreateLink,
  onOpenLink,
  onCopyLink,
  onToggleLinkPinned,
  onEditLink,
  onDeleteLink,
  onEditFolder,
  onDeleteFolder,
  onToggleFolderPinned,
}: FolderCardProps) {
  const Icon = folder ? getIconComponent(folder.icon) : FolderIcon;
  const sortedLinks = [...links].sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-2xl border bg-card p-6 shadow-sm",
        folder ? "border-border border-t-2" : "border-dashed border-border"
      )}
      style={folder ? { borderTopColor: folder.color } : undefined}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className="flex size-8 items-center justify-center rounded-lg text-white"
            style={{ backgroundColor: folder?.color ?? "var(--muted-foreground)" }}
          >
            {/* eslint-disable-next-line react-hooks/static-components -- Icon is picked from a fixed, stable set of icon components, never created dynamically here. */}
            <Icon className="size-4" />
          </span>
          <h3 className="text-sm font-semibold text-foreground">
            {folder ? folder.name : "Chưa phân loại"}
          </h3>
          <span className="text-xs text-muted-foreground">{sortedLinks.length}</span>
        </div>

        <div className="flex items-center gap-1">
          <LinkFormDialog
            trigger={
              <Button type="button" variant="ghost" size="icon" aria-label="Thêm liên kết vào thư mục này">
                <PlusIcon className="size-4" />
              </Button>
            }
            folders={folders}
            defaultFolderId={folder?.id ?? null}
            onSubmit={onCreateLink}
          />
          {folder && onEditFolder && onDeleteFolder && (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button type="button" variant="ghost" size="icon" aria-label="Tùy chọn thư mục">
                    <MoreVerticalIcon className="size-4" />
                  </Button>
                }
              />
              <DropdownMenuContent align="end">
                {onToggleFolderPinned && (
                  <DropdownMenuItem onClick={() => onToggleFolderPinned(folder.id, !folder.isPinned)}>
                    <PinIcon className={cn(folder.isPinned && "fill-current text-amber-500")} />
                    {folder.isPinned ? "Bỏ ghim" : "Ghim lên đầu"}
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => onEditFolder(folder)}>
                  <PencilIcon />
                  Sửa thư mục
                </DropdownMenuItem>
                <DropdownMenuItem variant="destructive" onClick={() => onDeleteFolder(folder.id)}>
                  <Trash2Icon />
                  Xóa thư mục
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {sortedLinks.length === 0 ? (
        <p className="text-sm text-muted-foreground">Chưa có liên kết nào.</p>
      ) : (
        <div className="flex max-h-[280px] flex-col divide-y divide-border overflow-y-auto">
          {sortedLinks.map((link) => (
            <LinkRow
              key={link.id}
              link={link}
              onOpen={onOpenLink}
              onCopy={onCopyLink}
              onTogglePin={onToggleLinkPinned}
              onEdit={onEditLink}
              onDelete={onDeleteLink}
            />
          ))}
        </div>
      )}
    </div>
  );
}
