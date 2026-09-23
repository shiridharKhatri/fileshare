/**
 * Message model — stores rich-text messages in rooms.
 * Content is sanitized HTML.
 */

import mongoose, { Schema, Document, Model } from "mongoose";

export interface IMessage extends Document {
  _id: mongoose.Types.ObjectId;
  roomId: mongoose.Types.ObjectId;
  content: string;
  createdAt: Date;
  sessionId: string;
  expiresAt: Date;
}

const messageSchema = new Schema<IMessage>({
  roomId: {
    type: Schema.Types.ObjectId,
    ref: "Room",
    required: true,
    index: true,
  },
  content: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  sessionId: {
    type: String,
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true,
  },
});

// Compound index for room message queries
messageSchema.index({ roomId: 1, createdAt: 1 });

const Message: Model<IMessage> =
  mongoose.models.Message || mongoose.model<IMessage>("Message", messageSchema);

export default Message;
