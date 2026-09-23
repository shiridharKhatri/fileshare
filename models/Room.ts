/**
 * Room model — represents a temporary shared room.
 */

import mongoose, { Schema, Document, Model } from "mongoose";

export interface IRoom extends Document {
  _id: mongoose.Types.ObjectId;
  slug: string;
  passcodeHash: string;
  createdAt: Date;
  expiresAt: Date;
  status: "active" | "expired";
}

const roomSchema = new Schema<IRoom>(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    passcodeHash: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["active", "expired"],
      default: "active",
      index: true,
    },
  },
  {
    timestamps: true, // adds createdAt and updatedAt
  }
);

// Compound index for cleanup queries
roomSchema.index({ status: 1, expiresAt: 1 });

// Prevent model recompilation during HMR
const Room: Model<IRoom> =
  mongoose.models.Room || mongoose.model<IRoom>("Room", roomSchema);

export default Room;
