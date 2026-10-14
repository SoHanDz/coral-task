"use client";

import { useMemo, useState } from "react";
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

export function ResourcesBoard({ folders, links }: ResourcesBoardProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [editingLink, setEditingLink] = useState<QuickLink | null>(null);
  const [editingFolder, setEditingFolder] = useState<LinkFolder | null>(null);

  const normalizedQuery = query.trim().toLowerCase();

  const filteredLinks = useMemo(() => {
    if (!normalizedQuery) return links;
    return links.filter((link) => {
      const domain = (() => {
        try {
          return cleanDomainLabel(link.url).toLowerCase();
        } catch {
          return "";
        }
      })();
      return (
        link.title.toLowerCase().includes(normalizedQuery) || domain.includes(normalizedQuery)
      );
    });
  }, [links, normalizedQuery]);

  const filteredFolders = useMemo(() => {
    if (!normalizedQuery) return folders;
    return folders.filter((folder) => folder.name.toLowerCase().includes(normalizedQuery));
  }, [folders, normalizedQuery]);

  function linksFor(folderId: string | null) {
    return filteredLinks.filter((link) => link.folderId === folderId);
  }

  async function handleCreateFolder(input: { name: string; color: string; icon: string }) {
    await createFolder(input);
    router.refresh();
  }

  async function handleUpdateFolder(
    id: string,
    input: { name: string; color: string; icon: string }
  ) {
    await updateFolder(id, input);
    router.refresh();
  }

  async function handleDeleteFolder(id: string) {
    await deleteFolder(id);
    router.refresh();
  }

  async function handleCreateLink(input: {
    url: string;
    title: string;
    description?: string;
    folderId: string | null;
  }) {
    await createLink(input);
    router.refresh();
  }

  async function handleUpdateLink(
    id: string,
    input: { url: string; title: string; description?: string; folderId: string | null }
  ) {
    await updateLink(id, input);
    router.refresh();
  }

  async function handleDeleteLink(id: string) {
    await deleteLink(id);
    router.refresh();
  }

  async function handleTogglePinned(id: string, next: boolean) {
    await toggleLinkPinned(id, next);
    router.refresh();
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

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filteredFolders.map((folder) => (
          <FolderCard
            key={folder.id}
            folder={folder}
            links={linksFor(folder.id)}
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
          links={linksFor(null)}
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
