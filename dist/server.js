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
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const kinde_typescript_sdk_1 = require("@kinde-oss/kinde-typescript-sdk");
const errorHandler_1 = require("./middleware/errorHandler");
const generative_ai_1 = require("@google/generative-ai");
const conversation_1 = __importDefault(require("./models/conversation")); // Ensure conversation model is properly typed
const mongoose_1 = __importDefault(require("mongoose"));
dotenv_1.default.config();
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is missing. Please set it in the .env file.");
}
const genAI = new generative_ai_1.GoogleGenerativeAI(GEMINI_API_KEY);
const app = (0, express_1.default)();
const PORT = 3000;
// Replace with your Kinde credentials
const kindeClient = (0, kinde_typescript_sdk_1.createKindeServerClient)(kinde_typescript_sdk_1.GrantType.AUTHORIZATION_CODE, {
    authDomain: "https://rebyb.kinde.com",
    clientId: "f2af4516ea38440394a3f1dc88d6477b",
    clientSecret: process.env.KINDE_SECRET,
    redirectURL: process.env.SITE_URL + "/callback",
    logoutRedirectURL: process.env.SITE_URL + "",
    scope: "openid profile email",
});
// Middleware
app.use((0, cookie_parser_1.default)());
// Session Manager (Simple in-memory for demonstration)
let store = {};
const sessionManager = {
    getSessionItem(key) {
        return __awaiter(this, void 0, void 0, function* () {
            return store[key];
        });
    },
    setSessionItem(key, value) {
        return __awaiter(this, void 0, void 0, function* () {
            store[key] = value;
        });
    },
    removeSessionItem(key) {
        return __awaiter(this, void 0, void 0, function* () {
            delete store[key];
        });
    },
    destroySession() {
        return __awaiter(this, void 0, void 0, function* () {
            store = {};
        });
    },
};
// Middleware
app.use(express_1.default.json());
// Custom Middleware Example
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});
app.get("/register", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const registerUrl = yield kindeClient.register(sessionManager);
    res.redirect(registerUrl.toString());
}));
app.get("/login", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const loginUrl = yield kindeClient.login(sessionManager);
    res.redirect(loginUrl.toString());
}));
app.get("/callback", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const url = new URL(`${req.protocol}://${req.get("host")}${req.url}`);
    yield kindeClient.handleRedirectToApp(sessionManager, url);
    res.redirect("/");
}));
app.get("/logout", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const logoutUrl = yield kindeClient.logout(sessionManager);
    res.redirect(logoutUrl.toString());
}));
const checkUser = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const isAuthenticated = yield kindeClient.isAuthenticated(sessionManager);
        if (isAuthenticated) {
            const profile = yield kindeClient.getUserProfile(sessionManager);
            return profile;
        }
        else {
            return false;
        }
    }
    catch (error) {
        console.log("error at checkUser: " + error);
        return false;
    }
});
// app.get("/", async (req: Request, res: Response) => {
//   const user = await checkUser();
//   if (user) {
//     res.send(`
//       <h1>Welcome to the Home Page</h1>
//       <p>Hello, ${user.given_name}</p>
//       <a href="/api/user">User Profile</a> | <a href="/api/chats">Chats</a> | <a href="/logout">Logout</a>
//     `);
//   } else {
//     res.send(`
//       <h1>Welcome to the Home Page</h1>
//       <p>You are not authenticated.</p>
//       <a href="/login">Sign In</a> | <a href="/register">Register</a>
//     `);
//   }
// });
app.get("/api/user", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = yield checkUser();
    if (user)
        res.send({ user, success: true });
    else
        res.send({ error: "User not found", redirect: "/login" });
}));
const geminiTest = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const prompt = req.body.prompt || req.query.prompt || req.params.prompt;
        // const systemPrompt =
        //   req.body.systemPrompt ||
        //   req.query.systemPrompt ||
        //   req.params.systemPrompt;
        if (!prompt) {
            res.status(400).send({ error: "Prompt is required." });
            return;
        }
        const chatSession = model.startChat({
            generationConfig,
            safetySettings,
            history: [
                // { role: "system", parts: [{ text: systemPrompt || "" }] },
                { role: "user", parts: [{ text: "Your name is RebyB Intelligent" }] },
                {
                    role: "model",
                    parts: [{ text: "Ok my name is RebyB Intelligent" }],
                },
            ],
        });
        const result = yield chatSession.sendMessage(JSON.stringify({ prompt, IndianTime: Date() }));
        const response = result.response.text();
        res.json({ answer: response });
    }
    catch (error) {
        console.log();
        res.send({ error: error });
    }
});
const memory = [];
const geminiWithMemory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const prompt = req.body.prompt || req.query.prompt || req.params.prompt;
        // const systemPrompt =
        //   req.body.systemPrompt ||
        //   req.query.systemPrompt ||
        //   req.params.systemPrompt;
        if (!prompt) {
            res.status(400).send({ error: "Prompt is required." });
            return;
        }
        const chatSession = model.startChat({
            generationConfig,
            safetySettings,
            history: memory,
        });
        const result = yield chatSession.sendMessage(
        // JSON.stringify({ prompt, IndianTime: Date() })
        prompt);
        const response = result.response.text();
        res.json({ answer: response });
        memory.push({ role: "user", parts: [{ text: prompt }] });
        memory.push({
            role: "model",
            parts: [{ text: response }],
        });
    }
    catch (error) {
        console.log();
        res.send({ error: error });
    }
});
app.get("/api/test/:prompt?", geminiTest);
app.post("/api/test/:prompt?", geminiTest);
app.get("/api/gemini-with-memory/:prompt?", geminiWithMemory);
app.post("/api/gemini-with-memory/:prompt?", geminiWithMemory);
// Routes
// app.get("/api/admin", (req: Request, res: Response) => {
//   res.send(
//     `<h1>Welcome to the Admin Panel</h1><p>Hello, ${req.user?.given_name}</p>`
//   );
// });
// app.get("/api/user", (req: Request, res: Response) => {
//   res.send({ success: true, user: req.user });
// });
app.get("/api/chats", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = yield checkUser();
        if (user) {
            const chats = yield conversation_1.default.find({
                userId: user === null || user === void 0 ? void 0 : user.id,
            });
            res.send({ chats, success: true });
        }
        else
            res.send({ error: "User not found", redirect: "/login" });
    }
    catch (error) {
        console.error(error);
        res.status(500).send({ error: error.message });
    }
}));
app.get("/api/chat/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = yield checkUser();
        if (user) {
            const conversationId = req.params.id;
            if (conversationId) {
                const chat = yield conversation_1.default.findById(conversationId);
                if (!chat) {
                    res.status(404).json({ error: "Conversation not found." });
                }
                res.send({ chat, success: true });
            }
            else {
                res.status(400).json({ error: "ID is required!" });
            }
        }
        else
            res.send({ error: "User not found", redirect: "/login" });
    }
    catch (error) {
        console.error(error);
        res.status(500).send(error.message);
    }
}));
// app.get("/unauthorised", (req: Request, res: Response) => {
//   res.send(`
//     <h1>Welcome to the Home Page</h1>
//     <p>You are not authenticated.</p>
//     <a href="/login">Sign In</a> | <a href="/register">Register</a>
//   `);
// });
const safetySettings = [
    {
        category: generative_ai_1.HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: generative_ai_1.HarmBlockThreshold.BLOCK_NONE,
    },
    {
        category: generative_ai_1.HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: generative_ai_1.HarmBlockThreshold.BLOCK_NONE,
    },
    {
        category: generative_ai_1.HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: generative_ai_1.HarmBlockThreshold.BLOCK_NONE,
    },
];
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
const generationConfig = {
    temperature: 1,
    topP: 0.95,
    topK: 64,
    maxOutputTokens: 8192,
};
function handleGeminiRequest(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const user = yield checkUser();
            if (!user) {
                res.send({ error: "User not found", redirect: "/login" });
                return;
            }
            const prompt = req.body.prompt || req.query.prompt;
            const conversationId = req.body.id || req.query.id || req.params.id;
            if (!prompt) {
                res.status(400).json({ error: "Prompt is required." });
                return;
            }
            const userInfo = `
      My first name: ${(user === null || user === void 0 ? void 0 : user.given_name) || ""}
      My last name: ${(user === null || user === void 0 ? void 0 : user.family_name) || ""}
      My full name: ${(user === null || user === void 0 ? void 0 : user.given_name) + user.family_name || ""}
      My email: ${(user === null || user === void 0 ? void 0 : user.email) || ""}
      My profile photo link: ${(user === null || user === void 0 ? void 0 : user.picture) || ""}
    `;
            if (conversationId) {
                const chat = yield conversation_1.default.findById(conversationId);
                if (!chat) {
                    res.status(404).json({ error: "Conversation not found." });
                    return;
                }
                const history = JSON.parse(chat.conversations);
                const chatSession = model.startChat({
                    generationConfig,
                    safetySettings,
                    history: [
                        { role: "user", parts: [{ text: userInfo }] },
                        {
                            role: "model",
                            parts: [{ text: "Thanks for sharing your information!" }],
                        },
                        ...history,
                    ],
                });
                const result = yield chatSession.sendMessage(JSON.stringify({ prompt, IndianTime: Date() }));
                const response = result.response.text();
                const savedChat = yield conversation_1.default.findByIdAndUpdate(conversationId, {
                    conversations: JSON.stringify([
                        ...history,
                        { role: "user", parts: [{ text: prompt }] },
                        { role: "model", parts: [{ text: response }] },
                    ]),
                }, { new: true });
                res.json({ answer: response, newChat: false, savedChat });
            }
            else {
                const chatSession = model.startChat({
                    generationConfig,
                    safetySettings,
                    history: [
                        { role: "user", parts: [{ text: userInfo }] },
                        {
                            role: "model",
                            parts: [{ text: "Thanks for sharing your information!" }],
                        },
                    ],
                });
                const result = yield chatSession.sendMessage(JSON.stringify({ prompt, IndianTime: Date() }));
                const response = result.response.text();
                const savedChat = yield conversation_1.default.create({
                    userId: user === null || user === void 0 ? void 0 : user.id,
                    conversations: JSON.stringify([
                        { role: "user", parts: [{ text: prompt }] },
                        { role: "model", parts: [{ text: response }] },
                    ]),
                });
                res.json({ answer: response, newChat: true, savedChat });
            }
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ error: "Internal Server Error" });
        }
    });
}
app.post("/api/ask-gemini", handleGeminiRequest);
app.use(express_1.default.static(path_1.default.resolve("./client/dist")));
app.get("*", (req, res) => {
    res.sendFile(path_1.default.resolve("./client/dist/index.html"));
});
const connectDatabase = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const connection = yield mongoose_1.default.connect(process.env.DB_URI || "");
        console.log(`MongoDB connected with server: ${connection.connection.host}`);
    }
    catch (error) {
        console.error("Database connection error:", error);
    }
});
// Error Handling Middleware
app.use((err, req, res, next) => {
    console.error(err.message);
    res.status(500).send("Internal Server Error");
});
// Use the global error handler
app.use(errorHandler_1.globalErrorHandler);
// Start the server
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
    connectDatabase();
});
