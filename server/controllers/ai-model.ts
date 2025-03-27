import express, { Request, Response } from "express";
import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
  ChatSession,
  GenerativeModel,
} from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error("GEMINI_API_KEY is not set in environment variables");
}

const genAI = new GoogleGenerativeAI(apiKey);

const generationConfig = {
  temperature: 1,
  topP: 0.95,
  topK: 40,
  maxOutputTokens: 8192,
  responseMimeType: "text/plain",
};

// Interface for conversation history items
interface HistoryItem {
  role: string;
  parts: { text: string }[];
}

// Store conversation history in an array
let conversationHistory: HistoryItem[] = [];

// Interface for request body
interface AskRequestBody {
  question: string;
  systemPrompt?: string;
}

// Function to create a new chat session with system prompt
function createChatSession(systemPrompt?: string): ChatSession {
  const model: GenerativeModel = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction: systemPrompt || "You are a helpful assistant",
  });

  return model.startChat({
    generationConfig,
    history: conversationHistory,
  });
}

// API endpoint to ask a question
app.post(
  "/api/ask",
  async (req: Request<{}, {}, AskRequestBody>, res: Response) => {
    try {
      const { question, systemPrompt } = req.body;

      if (!question) {
        res.status(400).json({ error: "Question is required" });
        return;
      }

      const chatSession: ChatSession = createChatSession(systemPrompt);

      const result = await chatSession.sendMessage(question);
      const responseText: string = result.response.text();

      // Update conversation history
      conversationHistory.push({
        role: "user",
        parts: [{ text: question }],
      });
      conversationHistory.push({
        role: "model",
        parts: [{ text: responseText }],
      });

      res.json({
        response: responseText,
        historyLength: conversationHistory.length,
      });
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ error: "Something went wrong" });
    }
  }
);

// API endpoint to get conversation history
app.get("/api/history", (req: Request, res: Response) => {
  res.json({
    history: conversationHistory,
    totalMessages: conversationHistory.length,
  });
});

// API endpoint to clear history
app.delete("/api/history", (req: Request, res: Response) => {
  conversationHistory = [];
  res.json({ message: "Conversation history cleared" });
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
