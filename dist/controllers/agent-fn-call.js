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
exports.agent_fnCall = void 0;
const generative_ai_1 = require("@google/generative-ai");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const apiKey = process.env.GEMINI_API_KEY;
const genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
const safetySettings = [
    {
        category: generative_ai_1.HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: generative_ai_1.HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
    },
    {
        category: generative_ai_1.HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: generative_ai_1.HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
    },
    {
        category: generative_ai_1.HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: generative_ai_1.HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
    },
];
const history = [
//   {
//     role: "user",
//     parts: [
//       {
//         text: "send whatsapp message to ujjwal, write message how are you?",
//       },
//     ],
//   },
];
const agent_fnCall = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        // console.log("agent_fnCall");
        const prompt = req.body.prompt || req.query.prompt || req.params.prompt;
        const systemPrompt = req.body.systemPrompt ||
            req.query.systemPrompt ||
            req.params.systemPrompt;
        if (!prompt) {
            res.status(400).json({
                message: "prompt is required",
            });
            return;
        }
        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash-exp",
            safetySettings,
            systemInstruction: systemPrompt ||
                "you are an AI android mobile operator with available tools",
            tools: [
                {
                    functionDeclarations: [
                        {
                            name: "getAllContacts",
                            description: "returns all contacts from the saved contacts list type {name:bikram,number:966586235}",
                        },
                        {
                            name: "sendWhatsAppMessage",
                            description: "sends a message using WhatsApp accept phone number and message",
                            parameters: {
                                type: generative_ai_1.SchemaType.OBJECT,
                                properties: {
                                    phoneNumber: {
                                        type: generative_ai_1.SchemaType.STRING,
                                    },
                                    message: {
                                        type: generative_ai_1.SchemaType.STRING,
                                    },
                                },
                            },
                        },
                        {
                            name: "phoneCall",
                            description: "make a phone call",
                            parameters: {
                                type: generative_ai_1.SchemaType.OBJECT,
                                properties: {
                                    phoneNumber: {
                                        type: generative_ai_1.SchemaType.STRING,
                                    },
                                },
                            },
                        },
                        {
                            name: "sendEmail",
                            description: "send an email",
                            parameters: {
                                type: generative_ai_1.SchemaType.OBJECT,
                                properties: {
                                    to: {
                                        type: generative_ai_1.SchemaType.STRING,
                                    },
                                    subject: {
                                        type: generative_ai_1.SchemaType.STRING,
                                    },
                                    message: {
                                        type: generative_ai_1.SchemaType.STRING,
                                    },
                                },
                            },
                        },
                        {
                            name: "takePicture",
                            description: "takes a picture",
                        },
                        {
                            name: "sendSMS",
                            description: "send sms",
                            parameters: {
                                type: generative_ai_1.SchemaType.OBJECT,
                                properties: {
                                    phoneNumber: {
                                        type: generative_ai_1.SchemaType.STRING,
                                    },
                                    message: {
                                        type: generative_ai_1.SchemaType.STRING,
                                    },
                                },
                            },
                        },
                        {
                            name: "playMusic",
                            description: "play music",
                            parameters: {
                                type: generative_ai_1.SchemaType.OBJECT,
                                properties: {
                                    songName: {
                                        type: generative_ai_1.SchemaType.STRING,
                                    },
                                },
                            },
                        },
                    ],
                },
            ],
            toolConfig: { functionCallingConfig: { mode: generative_ai_1.FunctionCallingMode.ANY } },
        });
        const generationConfig = {
            temperature: 1,
            topP: 0.95,
            topK: 40,
            maxOutputTokens: 8192,
            responseMimeType: "text/plain",
        };
        //how to replace
        // POSSIBLE_ROLES;
        console.log({ history });
        // async function run(): Promise<void> {
        const chatSession = model.startChat({
            generationConfig,
            history,
        });
        const userMsg = prompt;
        const result = yield chatSession.sendMessage(userMsg);
        history.push({
            role: "user",
            parts: [{ text: userMsg }],
        });
        // console.log(JSON.stringify(result, null, 2));
        (_a = result.response.candidates) === null || _a === void 0 ? void 0 : _a.forEach((cand) => {
            // console.log({ cand });
            history.push({
                role: "model",
                parts: [{ text: JSON.stringify(cand.content) }],
            });
            // console.log({ content: cand.content });
            res.send(cand.content);
            // cand.content.parts?.forEach((part) => {
            //   if (part.functionCall) {
            //     const items = part.functionCall.args;
            //     const args = Object.entries(items)
            //       .map(([key, value]) => `${key}:${value}`)
            //       .join(", ");
            //     console.log(`${part.functionCall.name}(${args})`);
            //     const value = eval(`${part.functionCall.name}(${args})`);
            //     console.log({ value });
            //     history.push({
            //       role: "function",
            //       parts: [{ text: value }],
            //     });
            //     if (value) {
            //       res.status(200).json({
            //         message: value,
            //       });
            //     }
            //   }
            // });
        });
        // }
        // await run();
    }
    catch (error) {
        console.error("agent_fnCall error", error);
        res.status(500).json({
            message: "Internal server error",
        });
    }
});
exports.agent_fnCall = agent_fnCall;
