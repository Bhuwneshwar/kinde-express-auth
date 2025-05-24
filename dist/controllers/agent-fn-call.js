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
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.agent_fnCall = void 0;
const genai_1 = require("@google/genai");
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables
dotenv_1.default.config();
// Initialize GoogleGenAI
const ai = new genai_1.GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY || "",
});
// Conversation history store
const conversationHistory = [];
const safetySettings = [
    {
        category: genai_1.HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: genai_1.HarmBlockThreshold.BLOCK_ONLY_HIGH,
    },
    {
        category: genai_1.HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: genai_1.HarmBlockThreshold.BLOCK_ONLY_HIGH,
    },
    {
        category: genai_1.HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: genai_1.HarmBlockThreshold.BLOCK_ONLY_HIGH,
    },
    {
        category: genai_1.HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: genai_1.HarmBlockThreshold.BLOCK_ONLY_HIGH,
    },
];
// Gemini AI configuration
const config = {
    // safetySettings,
    responseMimeType: "application/json",
    responseSchema: {
        type: genai_1.Type.OBJECT,
        required: ["response"],
        properties: {
            response: {
                type: genai_1.Type.STRING,
            },
            action: {
                type: genai_1.Type.OBJECT,
                properties: {
                    toolName: {
                        type: genai_1.Type.STRING,
                    },
                    parameters: {
                        type: genai_1.Type.OBJECT,
                        properties: {
                            param1: { type: genai_1.Type.STRING },
                            param2: { type: genai_1.Type.STRING },
                            param3: { type: genai_1.Type.STRING },
                            param4: { type: genai_1.Type.STRING },
                            param5: { type: genai_1.Type.STRING },
                        },
                    },
                },
            },
            thought: {
                type: genai_1.Type.STRING,
            },
            next: {
                type: genai_1.Type.STRING,
            },
        },
    },
    systemInstruction: [
        {
            text: `You are a helpful AI assistant. You can perform tasks using tools available to you. Always decide whether a tool is needed based on the user's request, and use it appropriately. Below is a list of available tools and how to use them:

🔧 Available Tools
📇 Contact Management
getAllContacts

Description: Returns all contacts from the saved contacts list.

📱 Communication Tools
sendWhatsAppMessage

Description: Sends a message using WhatsApp.

Parameters:
param1: string — The recipient’s phone number.
param2: string — The message to send.

phoneCall

Description: Makes a phone call.

Parameters:
param1: string — The phone number to call.

sendEmail

Description: Sends an email.

Parameters:
param1: string — Recipient's email address.
param2: string — Email subject.
param3: string — Email body.

sendSMS

Description: Sends a text message (SMS).

Parameters:
param1: string — The recipient’s phone number.
param2: string — The message to send.

📷 Camera Functions
takePicture

Description: Takes a picture.

takeSelfie

Description: Takes a selfie using the front camera.

openLastPicture

Description: Opens the last picture taken.

🎵 Music Controls
playMusic

Description: Plays music.

pauseMusic

Description: Pauses the currently playing music.

📌 Usage Instructions
Before calling a tool, explain your reasoning in a thought.

When calling a tool, provide the exact name and its parameters.

Format your structured output like this:
{
  "thought": "The user wants to send a WhatsApp message. I will use the appropriate tool.",
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
const agent_fnCall = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, e_1, _b, _c;
    try {
        const { prompt } = req.body;
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
        const response = yield ai.models.generateContentStream({
            model,
            config,
            contents,
        });
        let fullResponse = "";
        try {
            for (var _d = true, response_1 = __asyncValues(response), response_1_1; response_1_1 = yield response_1.next(), _a = response_1_1.done, !_a; _d = true) {
                _c = response_1_1.value;
                _d = false;
                const chunk = _c;
                fullResponse += chunk.text || "";
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (!_d && !_a && (_b = response_1.return)) yield _b.call(response_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        let parsedResponse;
        try {
            parsedResponse = JSON.parse(fullResponse);
        }
        catch (parseError) {
            parsedResponse = { response: fullResponse };
        }
        // Store user prompt and AI response in history
        conversationHistory.push({
            role: "user",
            text: prompt,
            timestamp: new Date().toISOString(),
        }, {
            role: "model",
            text: fullResponse,
            timestamp: new Date().toISOString(),
        });
        res.json(parsedResponse);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }
});
exports.agent_fnCall = agent_fnCall;
