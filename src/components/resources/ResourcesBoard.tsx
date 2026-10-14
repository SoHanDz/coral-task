"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PlusIcon, SearchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FolderCard } from "@/components/resources/FolderCard";
import { FolderFormDialog } from "@/components/resources/FolderFormDialog";
import { LinkFormDialog } from "@/components/resources/LinkFormDialog";
import {
  createFolder,
  createLink,
  deleteFolder,
  deleteLink,
  toggleLinkPinned,
  updateFolder,
  updateLink,
} from "@/app/actions/resources";
import { cleanDomainLabel } from "@/lib/resources/favicon";
import type { LinkFolder, QuickLink } from "@/lib/resources/types";

interface ResourcesBoardProps {
  folders: LinkFolder[];
  links: QuickLink[];
}

function linkMatchesQuery(link: QuickLink, normalizedQuery: string) {
  if (!normalizedQuery) return true;
  const domain = (() => {
    try {
      return cleanDomainLabel(link.url).toLowerCase();
    } catch {
      return "";
    }
  })();
  return link.title.toLowerCase().includes(normalizedQuery) || domain.includes(normalizedQuery);
}

function folderNameMatchesQuery(folder: LinkFolder, normalizedQuery: string) {
  return normalizedQuery !== "" && folder.name.toLowerCase().includes(normalizedQuery);
}

export function ResourcesBoard({ folders, links }: ResourcesBoardProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [editingLink, setEditingLink] = useState<QuickLink | null>(null);
  const [editingFolder, setEditingFolder] = useState<LinkFolder | null>(null);
  const [isPending, startTransition] = useTransition();

  const normalizedQuery = query.trim().toLowerCase();

  const visibleFolders = useMemo(() => {
    if (!normalizedQuery) return folders;
    return folders.filter(
      (folder) =>
        folderNameMatchesQuery(folder, normalizedQuery) ||
        links.some((link) => link.folderId === folder.id && linkMatchesQuery(link, normalizedQuery))
    );
  }, [folders, links, normalizedQuery]);

  function linksFor(folderId: string | null, folder: LinkFolder | null) {
    const own = links.filter((link) => link.folderId === folderId);
    if (!normalizedQuery) return own;
    // If the folder itself matched by name, show all its links rather than
    // re-filtering them by the same query (a folder match shouldn't also
    // require every one of its links to match).
    if (folder && folderNameMatchesQuery(folder, normalizedQuery)) return own;
    return own.filter((link) => linkMatchesQuery(link, normalizedQuery));
  }

  function handleCreateFolder(input: { name: string; color: string; icon: string }) {
    startTransition(async () => {
      await createFolder(input);
      router.refresh();
    });
  }

  function handleUpdateFolder(
    id: string,
    input: { name: string; color: string; icon: string }
  ) {
    startTransition(async () => {
      await updateFolder(id, input);
      router.refresh();
    });
  }

  function handleDeleteFolder(id: string) {
    startTransition(async () => {
      await deleteFolder(id);
      router.refresh();
    });
  }

  function handleCreateLink(input: {
    url: string;
    title: string;
    description?: string;
    folderId: string | null;
  }) {
    startTransition(async () => {
      await createLink(input);
      router.refresh();
    });
  }

  function handleUpdateLink(
    id: string,
    input: { url: string; title: string; description?: string; folderId: string | null }
  ) {
    startTransition(async () => {
      await updateLink(id, input);
      router.refresh();
    });
  }

  function handleDeleteLink(id: string) {
    startTransition(async () => {
      await deleteLink(id);
      router.refresh();
    });
  }

  function handleTogglePinned(id: string, next: boolean) {
    startTransition(async () => {
      await toggleLinkPinned(id, next);
      router.refresh();
    });
  }

  function handleOpenLink(id: string) {
    const link = links.find((item) => item.id === id);
    if (link) window.open(link.url, "_blank", "noopener,noreferrer");
  }

  async function handleCopyLink(id: string) {
    const link = links.find((item) => item.id === id);
    if (link) await navigator.clipboard.writeText(link.url);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm liên kết hoặc thư mục..."
            className="pl-9"
          />
        </div>
        <FolderFormDialog
          trigger={
            <Button type="button" variant="outline">
              <PlusIcon className="size-4" />
              Thư mục mới
            </Button>
          }
          onSubmit={handleCreateFolder}
        />
        <LinkFormDialog
          trigger={
            <Button type="button">
              <PlusIcon className="size-4" />
              Thêm liên kết
            </Button>
          }
          folders={folders}
          onSubmit={handleCreateLink}
        />
      </div>

      {isPending && <p className="text-xs text-slate-500">Đang cập nhật…</p>}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {visibleFolders.map((folder) => (
          <FolderCard
            key={folder.id}
            folder={folder}
            links={linksFor(folder.id, folder)}
            onOpenLink={handleOpenLink}
            onCopyLink={handleCopyLink}
            onToggleLinkPinned={handleTogglePinned}
            onEditLink={setEditingLink}
            onDeleteLink={handleDeleteLink}
            onEditFolder={setEditingFolder}
            onDeleteFolder={handleDeleteFolder}
          />
        ))}

        <FolderCard
          folder={null}
          links={linksFor(null, null)}
          onOpenLink={handleOpenLink}
          onCopyLink={handleCopyLink}
          onToggleLinkPinned={handleTogglePinned}
          onEditLink={setEditingLink}
          onDeleteLink={handleDeleteLink}
        />
      </div>

      {editingLink && (
        <LinkFormDialog
          trigger={<span />}
          link={editingLink}
          folders={folders}
          open={editingLink !== null}
          onOpenChange={(next) => {
            if (!next) setEditingLink(null);
          }}
          onSubmit={(input) => {
            handleUpdateLink(editingLink.id, input);
            setEditingLink(null);
          }}
          onDelete={(id) => {
            handleDeleteLink(id);
            setEditingLink(null);
          }}
        />
      )}

      {editingFolder && (
        <FolderFormDialog
          trigger={<span />}
          folder={editingFolder}
          open={editingFolder !== null}
          onOpenChange={(next) => {
            if (!next) setEditingFolder(null);
          }}
          onSubmit={(input) => {
            handleUpdateFolder(editingFolder.id, input);
            setEditingFolder(null);
          }}
          onDelete={(id) => {
            handleDeleteFolder(id);
            setEditingFolder(null);
          }}
        />
      )}
    </div>
  );
}
