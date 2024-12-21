import mongoose, { Document, Schema, Model } from "mongoose";

// Define an interface representing a document in MongoDB.
interface IConversation extends Document {
  userId: string;
  conversations: string;
}

// Define the schema corresponding to the document interface.
const conversationSchema: Schema<IConversation> = new Schema(
  {
    userId: { type: String, required: true },
    conversations: { type: String, required: true },
  },
  {
    timestamps: true,
  }
);

// Create a model using the schema.
const Conversation: Model<IConversation> = mongoose.model<IConversation>(
  "Conversation",
  conversationSchema
);

export default Conversation;
