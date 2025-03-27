"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const generative_ai_1 = require("@google/generative-ai");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = process.env.PORT || 3000;
app.use(express_1.default.json());
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set in environment variables");
}
const genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
const generationConfig = {
    temperature: 1,
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 8192,
    responseMimeType: "text/plain",
};
// Store conversation history in an array
let conversationHistory = [];
// Function to create a new chat session with system prompt
function createChatSession(systemPrompt) {
    const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
        systemInstruction: systemPrompt || "You are a helpful assistant",
    });
    return model.startChat({
        generationConfig,
        history: conversationHistory,
    });
}
// API endpoint to ask a question
app.post("/api/ask", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { question, systemPrompt } = req.body;
        if (!question) {
            res.status(400).json({ error: "Question is required" });
            return;
        }
        const chatSession = createChatSession(systemPrompt);
        const result = yield chatSession.sendMessage(question);
        const responseText = result.response.text();
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
    }
    catch (error) {
        console.error("Error:", error);
        res.status(500).json({ error: "Something went wrong" });
    }
}));
// API endpoint to get conversation history
app.get("/api/history", (req, res) => {
    res.json({
        history: conversationHistory,
        totalMessages: conversationHistory.length,
    });
});
// API endpoint to clear history
app.delete("/api/history", (req, res) => {
    conversationHistory = [];
    res.json({ message: "Conversation history cleared" });
});
// Start the server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
