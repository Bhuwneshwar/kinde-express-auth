import { Request, Response } from "express";
import {
  GoogleGenAI,
  HarmBlockThreshold,
  HarmCategory,
  Type,
} from "@google/genai";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Initialize GoogleGenAI
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
});

// Interface for conversation history entries
interface HistoryEntry {
  role: "user" | "model";
  text: string;
  timestamp: string;
}

// Conversation history store
const conversationHistory: HistoryEntry[] = [];
const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
];
// Gemini AI configuration
const config = {
  // safetySettings,
  responseMimeType: "application/json",
  responseSchema: {
    type: Type.OBJECT,
    required: ["response"],
    properties: {
      response: {
        type: Type.STRING,
      },
      action: {
        type: Type.OBJECT,
        properties: {
          toolName: {
            type: Type.STRING,
          },
          parameters: {
            type: Type.OBJECT,
            properties: {
              param1: { type: Type.STRING },
              param2: { type: Type.STRING },
              param3: { type: Type.STRING },
              param4: { type: Type.STRING },
              param5: { type: Type.STRING },
            },
          },
        },
      },
      // thought: {
      //   type: Type.STRING,
      // },
      next: {
        type: Type.STRING,
      },
    },
  },
  systemInstruction: [
    {
      text: `You are a helpful AI assistant. You can perform tasks using tools available to you. Always decide whether a tool is needed based on the user's request, and use it appropriately. Below is a list of available tools and how to use them:

🔧 Available Tools:

    name: getAllContacts
    Description: Returns all contacts from the saved contacts list.

    name: sendWhatsAppMessage
    Description: Sends a message using WhatsApp.
    Parameters:
    param1: string — The recipient’s phone number.
    param2: string — The message to send.

    name: phoneCall
    Description: Makes a phone call.
    Parameters:
    param1: string — The phone number to call.

    name: sendEmail
    Description: Sends an email.
    Parameters:
    param1: string — Recipient's email address.
    param2: string — Email subject.
    param3: string — Email body.

    name: sendSMS
    Description: Sends a text message (SMS).
    Parameters:
    param1: string — The recipient’s phone number.
    param2: string — The message to send.

    name: takePicture
    Description: Takes a picture.

    name: takeSelfie
    Description: Takes a selfie using the front camera.

    name: openLastPicture
    Description: Opens the last picture taken.

    name: playMusic
    Description: Plays music.

    name: pauseMusic
    Description: Pauses the currently playing music.
    name: stopMusic

    
📌 Usage Instructions
When calling a tool, provide the exact name and its parameters.

Format your structured output like this:
{
  "action": {
    "tool": "sendWhatsAppMessage",
    "parameters": {
      "param1": "+911234567890",
      "param2": "Hello from the AI assistant!"
    }
  },
  "next": "I will confirm that the message has been sent."
}
`,
    },
  ],
};

// API endpoint to handle Gemini AI requests
export const agent_fnCall = async (req: Request, res: Response) => {
  try {
    const { prompt } = req.body as { prompt?: string };
    if (!prompt) {
      res.status(400).json({ error: "prompt is required" });
      return;
    }

    const model = "gemini-2.5-flash-preview-04-17";
    const contents = [
      ...conversationHistory.map(({ role, text }) => ({
        role,
        parts: [{ text }],
      })),
      {
        role: "user",
        parts: [{ text: prompt }],
      },
    ];

    const response = await ai.models.generateContentStream({
      model,
      config,
      contents,
    });

    let fullResponse = "";
    for await (const chunk of response) {
      fullResponse += chunk.text || "";
    }

    let parsedResponse: any;
    try {
      parsedResponse = JSON.parse(fullResponse);
    } catch (parseError) {
      parsedResponse = { response: fullResponse };
    }

    // Store user prompt and AI response in history
    conversationHistory.push(
      {
        role: "user",
        text: prompt,
        timestamp: new Date().toISOString(),
      },
      {
        role: "model",
        text: fullResponse,
        timestamp: new Date().toISOString(),
      }
    );

    res.json(parsedResponse);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};
