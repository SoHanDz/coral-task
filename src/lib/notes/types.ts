export interface Note {
  id: string;
  title: string;
  content: string;
  /** Object path in the private `note-images` bucket, or null. */
  imagePath: string | null;
  /** Short-lived signed URL for `imagePath`, resolved server-side. */
  imageUrl: string | null;
  color: string;
  tags: string[];
  isPinned: boolean;
  createdAt: string;
  /** Client-only: true while an optimistic change is still being saved. */
  pending?: boolean;
}

/** The editable fields of a note, as sent to the server actions. */
export interface NoteInput {
  title: string;
  content: string;
  imagePath: string | null;
  color: string;
  tags: string[];
  isPinned: boolean;
}

export const NOTE_IMAGES_BUCKET = "note-images";
export const NOTE_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

export const NOTE_COLORS = [
  { name: "Mặc định", value: "#ffffff" },
  { name: "Đỏ", value: "#fecaca" },
  { name: "Cam", value: "#fed7aa" },
  { name: "Vàng", value: "#fef08a" },
  { name: "Xanh lá", value: "#bbf7d0" },
  { name: "Xanh ngọc", value: "#99f6e4" },
  { name: "Xanh dương", value: "#bfdbfe" },
  { name: "Tím", value: "#ddd6fe" },
  { name: "Hồng", value: "#fbcfe8" },
] as const;
