/**
 * File model — stores metadata about uploaded files.
 * Actual file binary is stored on the VPS filesystem.
 */

import mongoose, { Schema, Document, Model } from "mongoose";

export interface IFile extends Document {
  _id: mongoose.Types.ObjectId;
  roomId: mongoose.Types.ObjectId;
  originalName: string;
  storedName: string;
  relativePath: string;
  mimeType: string;
  size: number;
  uploadedAt: Date;
  uploadedBySession: string;
  expiresAt: Date;
}

const fileSchema = new Schema<IFile>({
  roomId: {
    type: Schema.Types.ObjectId,
    ref: "Room",
    required: true,
    index: true,
  },
  originalName: {
    type: String,
    required: true,
  },
  storedName: {
    type: String,
    required: true,
  },
  relativePath: {
    type: String,
    required: true,
  },
  mimeType: {
    type: String,
    required: true,
  },
  size: {
    type: Number,
    required: true,
  },
  uploadedAt: {
    type: Date,
    default: Date.now,
  },
  uploadedBySession: {
    type: String,
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true,
  },
});

// Compound index for room file queries
fileSchema.index({ roomId: 1, uploadedAt: 1 });

const FileModel: Model<IFile> =
  mongoose.models.File || mongoose.model<IFile>("File", fileSchema);

export default FileModel;
