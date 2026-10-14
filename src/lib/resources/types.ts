export interface LinkFolder {
  id: string;
  name: string;
  color: string;
  icon: string;
  createdAt: Date;
}

export interface QuickLink {
  id: string;
  folderId: string | null;
  title: string;
  url: string;
  description: string | null;
  imageUrl: string | null;
  isPinned: boolean;
  createdAt: Date;
}
