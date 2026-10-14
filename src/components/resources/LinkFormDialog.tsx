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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { buildFaviconUrl, cleanDomainLabel, extractDomain } from "@/lib/resources/favicon";
import type { LinkFolder, QuickLink } from "@/lib/resources/types";

interface LinkFormDialogProps {
  trigger: ReactElement;
  /** Set false when `trigger` isn't a real <button> (e.g. a dialog opened
   * programmatically via `open`, with no visible trigger element). */
  nativeButton?: boolean;
  link?: QuickLink;
  folders: LinkFolder[];
  /** Omit both to let the dialog manage its own open state. Pass both when
   * another component opens this dialog programmatically (see
   * `editingLink` in ResourcesBoard, Task 6). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSubmit: (input: {
    url: string;
    title: string;
    description?: string;
    folderId: string | null;
  }) => void;
  onDelete?: (id: string) => void;
}

const NO_FOLDER_VALUE = "__none__";

export function LinkFormDialog({
  trigger,
  nativeButton = true,
  link,
  folders,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  onSubmit,
  onDelete,
}: LinkFormDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpenState = setControlledOpen ?? setInternalOpen;
  const [url, setUrl] = useState(link?.url ?? "");
  const [title, setTitle] = useState(link?.title ?? "");
  const [description, setDescription] = useState(link?.description ?? "");
  const [folderId, setFolderId] = useState<string>(link?.folderId ?? NO_FOLDER_VALUE);
  const [faviconPreview, setFaviconPreview] = useState<string | null>(link?.imageUrl ?? null);
  const [urlError, setUrlError] = useState<string | null>(null);

  function handleOpenChange(next: boolean) {
    if (next) {
      setUrl(link?.url ?? "");
      setTitle(link?.title ?? "");
      setDescription(link?.description ?? "");
      setFolderId(link?.folderId ?? NO_FOLDER_VALUE);
      setFaviconPreview(link?.imageUrl ?? null);
      setUrlError(null);
    }
    setOpenState(next);
  }

  // If the user hasn't typed a title yet, suggest one from the domain once
  // they've finished typing the URL. Also refresh the favicon preview so
  // they can see the thumbnail that will be saved before submitting.
  function handleUrlBlur() {
    if (!url.trim()) {
      setFaviconPreview(null);
      return;
    }
    try {
      const domain = extractDomain(url);
      setFaviconPreview(buildFaviconUrl(domain));
      if (!title.trim()) setTitle(cleanDomainLabel(url));
    } catch {
      // Not a parseable URL yet; leave title/preview as-is, required-field
      // validation on submit will catch it.
      setFaviconPreview(null);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!url.trim() || !title.trim()) return;
    try {
      extractDomain(url);
    } catch {
      setUrlError("URL không hợp lệ. Vui lòng kiểm tra lại.");
      return;
    }
    setUrlError(null);
    onSubmit({
      url: url.trim(),
      title: title.trim(),
      description: description.trim() || undefined,
      folderId: folderId === NO_FOLDER_VALUE ? null : folderId,
    });
    setOpenState(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={trigger} nativeButton={nativeButton} />
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{link ? "Sửa liên kết" : "Thêm liên kết mới"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="link-url">URL</Label>
            <div className="flex items-center gap-2">
              {faviconPreview && (
                <img src={faviconPreview} alt="" className="size-6 shrink-0 rounded" />
              )}
              <Input
                id="link-url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onBlur={handleUrlBlur}
                placeholder="https://example.com"
                required
                className="flex-1"
              />
            </div>
            {urlError && <p className="text-xs text-destructive">{urlError}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="link-title">Tiêu đề</Label>
            <Input
              id="link-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="link-description">Mô tả (tùy chọn)</Label>
            <Input
              id="link-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Thư mục</Label>
            <Select value={folderId} onValueChange={(value) => setFolderId(value as string)}>
              <SelectTrigger>
                <SelectValue placeholder="Chưa phân loại" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_FOLDER_VALUE} label="Chưa phân loại">
                  Chưa phân loại
                </SelectItem>
                {folders.map((folder) => (
                  <SelectItem key={folder.id} value={folder.id} label={folder.name}>
                    {folder.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Button type="submit" className="flex-1">
              {link ? "Lưu thay đổi" : "Lưu liên kết"}
            </Button>
            {link && onDelete && (
              <Button
                type="button"
                variant="destructive"
                size="icon"
                aria-label="Xóa liên kết"
                onClick={() => {
                  onDelete(link.id);
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
