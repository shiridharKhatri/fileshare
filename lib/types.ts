/**
 * Shared types used across client components.
 */

export interface FileItem {
  id: string;
  originalName: string;
  size: number;
  mimeType: string;
  uploadedAt: string;
  isOwn?: boolean;
}

export interface MessageItem {
  id: string;
  content: string;
  createdAt: string;
  isOwn: boolean;
}
