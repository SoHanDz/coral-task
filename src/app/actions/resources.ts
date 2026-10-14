"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/require-user";
import { extractDomain, buildFaviconUrl } from "@/lib/resources/favicon";
import type { LinkFolder, QuickLink } from "@/lib/resources/types";

interface FolderRow {
  id: string;
  name: string;
  color: string;
  icon: string;
  created_at: string;
}

interface LinkRow {
  id: string;
  folder_id: string | null;
  title: string;
  url: string;
  description: string | null;
  image_url: string | null;
  is_pinned: boolean;
  created_at: string;
}

const FOLDER_COLUMNS = "id, name, color, icon, created_at";
const LINK_COLUMNS =
  "id, folder_id, title, url, description, image_url, is_pinned, created_at";

function mapFolder(row: FolderRow): LinkFolder {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    icon: row.icon,
    createdAt: new Date(row.created_at),
  };
}

function mapLink(row: LinkRow): QuickLink {
  return {
    id: row.id,
    folderId: row.folder_id,
    title: row.title,
    url: row.url,
    description: row.description,
    imageUrl: row.image_url,
    isPinned: row.is_pinned,
    createdAt: new Date(row.created_at),
  };
}

function revalidateResources() {
  revalidatePath("/resources");
}

export async function getResources(): Promise<{
  folders: LinkFolder[];
  links: QuickLink[];
}> {
  const { supabase, userId } = await requireUser();

  const [foldersResult, linksResult] = await Promise.all([
    supabase
      .from("link_folders")
      .select(FOLDER_COLUMNS)
      .eq("user_id", userId)
      .order("created_at", { ascending: true }),
    supabase
      .from("quick_links")
      .select(LINK_COLUMNS)
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
  ]);

  if (foldersResult.error) throw new Error(foldersResult.error.message);
  if (linksResult.error) throw new Error(linksResult.error.message);

  return {
    folders: (foldersResult.data as FolderRow[]).map(mapFolder),
    links: (linksResult.data as LinkRow[]).map(mapLink),
  };
}

export async function createFolder(input: {
  name: string;
  color: string;
  icon: string;
}): Promise<LinkFolder> {
  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase
    .from("link_folders")
    .insert({ user_id: userId, name: input.name, color: input.color, icon: input.icon })
    .select(FOLDER_COLUMNS)
    .single();

  if (error) throw new Error(error.message);
  revalidateResources();
  return mapFolder(data as FolderRow);
}

export async function updateFolder(
  id: string,
  input: { name: string; color: string; icon: string }
): Promise<LinkFolder> {
  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase
    .from("link_folders")
    .update({ name: input.name, color: input.color, icon: input.icon })
    .eq("id", id)
    .eq("user_id", userId)
    .select(FOLDER_COLUMNS)
    .single();

  if (error) throw new Error(error.message);
  revalidateResources();
  return mapFolder(data as FolderRow);
}

export async function deleteFolder(id: string): Promise<void> {
  const { supabase, userId } = await requireUser();
  const { error } = await supabase
    .from("link_folders")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
  revalidateResources();
}

export async function createLink(input: {
  url: string;
  title: string;
  description?: string;
  folderId?: string | null;
  imageUrl?: string;
}): Promise<QuickLink> {
  const { supabase, userId } = await requireUser();
  const domain = extractDomain(input.url);
  const imageUrl = input.imageUrl ?? buildFaviconUrl(domain);

  const { data, error } = await supabase
    .from("quick_links")
    .insert({
      user_id: userId,
      folder_id: input.folderId ?? null,
      title: input.title,
      url: input.url,
      description: input.description ?? null,
      image_url: imageUrl,
    })
    .select(LINK_COLUMNS)
    .single();

  if (error) throw new Error(error.message);
  revalidateResources();
  return mapLink(data as LinkRow);
}

export async function updateLink(
  id: string,
  input: { url: string; title: string; description?: string; folderId?: string | null }
): Promise<QuickLink> {
  const { supabase, userId } = await requireUser();
  const domain = extractDomain(input.url);

  const { data, error } = await supabase
    .from("quick_links")
    .update({
      url: input.url,
      title: input.title,
      description: input.description ?? null,
      folder_id: input.folderId ?? null,
      image_url: buildFaviconUrl(domain),
    })
    .eq("id", id)
    .eq("user_id", userId)
    .select(LINK_COLUMNS)
    .single();

  if (error) throw new Error(error.message);
  revalidateResources();
  return mapLink(data as LinkRow);
}

export async function deleteLink(id: string): Promise<void> {
  const { supabase, userId } = await requireUser();
  const { error } = await supabase
    .from("quick_links")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
  revalidateResources();
}

export async function toggleLinkPinned(id: string, isPinned: boolean): Promise<void> {
  const { supabase, userId } = await requireUser();
  const { error } = await supabase
    .from("quick_links")
    .update({ is_pinned: isPinned })
    .eq("id", id)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
  revalidateResources();
}
