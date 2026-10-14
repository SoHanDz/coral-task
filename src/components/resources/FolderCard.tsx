"use client";

import { Folder as FolderIcon, PencilIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LinkRow } from "@/components/resources/LinkRow";
import { getIconComponent } from "@/components/resources/icon-options";
import type { LinkFolder, QuickLink } from "@/lib/resources/types";

interface FolderCardProps {
  folder: LinkFolder | null;
  links: QuickLink[];
  onOpenLink: (id: string) => void;
  onCopyLink: (id: string) => void;
  onToggleLinkPinned: (id: string, next: boolean) => void;
  onEditLink: (link: QuickLink) => void;
  onDeleteLink: (id: string) => void;
  onEditFolder?: (folder: LinkFolder) => void;
  onDeleteFolder?: (id: string) => void;
}

export function FolderCard({
  folder,
  links,
  onOpenLink,
  onCopyLink,
  onToggleLinkPinned,
  onEditLink,
  onDeleteLink,
  onEditFolder,
  onDeleteFolder,
}: FolderCardProps) {
  const Icon = folder ? getIconComponent(folder.icon) : FolderIcon;
  const sortedLinks = [...links].sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className="flex size-8 items-center justify-center rounded-lg text-white"
            style={{ backgroundColor: folder?.color ?? "#64748b" }}
          >
            {/* eslint-disable-next-line react-hooks/static-components -- Icon is picked from a fixed, stable set of icon components, never created dynamically here. */}
            <Icon className="size-4" />
          </span>
          <h3 className="text-sm font-semibold text-slate-900">
            {folder ? folder.name : "Chưa phân loại"}
          </h3>
          <span className="text-xs text-slate-400">{sortedLinks.length}</span>
        </div>

        {folder && onEditFolder && onDeleteFolder && (
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Sửa thư mục"
              onClick={() => onEditFolder(folder)}
            >
              <PencilIcon className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Xóa thư mục"
              onClick={() => onDeleteFolder(folder.id)}
            >
              <Trash2Icon className="size-4 text-destructive" />
            </Button>
          </div>
        )}
      </div>

      {sortedLinks.length === 0 ? (
        <p className="text-sm text-slate-400">Chưa có liên kết nào.</p>
      ) : (
        <div className="flex flex-col divide-y divide-slate-100">
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
