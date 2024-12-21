import express, { NextFunction, Request, Response } from "express";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import path from "path";
import {
  createKindeServerClient,
  GrantType,
} from "@kinde-oss/kinde-typescript-sdk";
import { globalErrorHandler } from "./middleware/errorHandler";
import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from "@google/generative-ai";
import conversation from "./models/conversation"; // Ensure conversation model is properly typed
import mongoose from "mongoose";

dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY is missing. Please set it in the .env file.");
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

const app = express();
const PORT = 3000;

// Replace with your Kinde credentials
const kindeClient = createKindeServerClient(GrantType.AUTHORIZATION_CODE, {
  authDomain: "https://rebyb.kinde.com",
  clientId: "f2af4516ea38440394a3f1dc88d6477b",
  clientSecret: process.env.KINDE_SECRET,
  redirectURL: process.env.SITE_URL + "/callback",
  logoutRedirectURL: process.env.SITE_URL + "",
  scope: "openid profile email",
});

// Middleware
app.use(cookieParser());

// Session Manager (Simple in-memory for demonstration)
let store: Record<string, unknown> = {};

interface SessionManager {
  getSessionItem(key: string): Promise<unknown>;
  setSessionItem(key: string, value: unknown): Promise<void>;
  removeSessionItem(key: string): Promise<void>;
  destroySession(): Promise<void>;
}

const sessionManager: SessionManager = {
  async getSessionItem(key: string) {
    return store[key];
  },
  async setSessionItem(key: string, value: unknown) {
    store[key] = value;
  },
  async removeSessionItem(key: string) {
    delete store[key];
  },
  async destroySession() {
    store = {};
  },
};

// Middleware
app.use(express.json());

// Custom Middleware Example
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

app.get("/register", async (req, res) => {
  const registerUrl = await kindeClient.register(sessionManager);
  res.redirect(registerUrl.toString());
});

app.get("/login", async (req, res) => {
  const loginUrl = await kindeClient.login(sessionManager);
  res.redirect(loginUrl.toString());
});

app.get("/callback", async (req, res) => {
  const url = new URL(`${req.protocol}://${req.get("host")}${req.url}`);
  await kindeClient.handleRedirectToApp(sessionManager, url);
  res.redirect("/");
});

app.get("/logout", async (req, res) => {
  const logoutUrl = await kindeClient.logout(sessionManager);
  res.redirect(logoutUrl.toString());
});

const checkUser = async () => {
  try {
    const isAuthenticated = await kindeClient.isAuthenticated(sessionManager);
    if (isAuthenticated) {
      const profile = await kindeClient.getUserProfile(sessionManager);
      return profile;
    } else {
      return false;
    }
  } catch (error) {
    console.log("error at checkUser: " + error);
    return false;
  }
};

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

app.get("/api/user", async (req: Request, res: Response) => {
  const user = await checkUser();
  if (user) res.send({ user, success: true });
  else res.send({ error: "User not found", redirect: "/login" });
});

// Routes
// app.get("/api/admin", (req: Request, res: Response) => {
//   res.send(
//     `<h1>Welcome to the Admin Panel</h1><p>Hello, ${req.user?.given_name}</p>`
//   );
// });

// app.get("/api/user", (req: Request, res: Response) => {
//   res.send({ success: true, user: req.user });
// });

app.get("/api/chats", async (req: Request, res: Response) => {
  try {
    const user = await checkUser();
    if (user) {
      const chats = await conversation.find({
        userId: user?.id,
      });
      res.send({ chats, success: true });
    } else res.send({ error: "User not found", redirect: "/login" });
  } catch (error: any) {
    console.error(error);
    res.status(500).send({ error: error.message });
  }
});

app.get("/api/chat/:id", async (req: Request, res: Response) => {
  try {
    const user = await checkUser();
    if (user) {
      const conversationId = req.params.id;

      if (conversationId) {
        const chat = await conversation.findById(conversationId);
        if (!chat) {
          res.status(404).json({ error: "Conversation not found." });
        }
        res.send({ chat, success: true });
      } else {
        res.status(400).json({ error: "ID is required!" });
      }
    } else res.send({ error: "User not found", redirect: "/login" });
  } catch (error: any) {
    console.error(error);
    res.status(500).send(error.message);
  }
});

// app.get("/unauthorised", (req: Request, res: Response) => {
//   res.send(`
//     <h1>Welcome to the Home Page</h1>
//     <p>You are not authenticated.</p>
//     <a href="/login">Sign In</a> | <a href="/register">Register</a>
//   `);
// });

const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
];

const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const generationConfig = {
  temperature: 1,
  topP: 0.95,
  topK: 64,
  maxOutputTokens: 8192,
};

async function handleGeminiRequest(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = await checkUser();
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
      My first name: ${user?.given_name || ""}
      My last name: ${user?.family_name || ""}
      My full name: ${user?.given_name + user.family_name || ""}
      My email: ${user?.email || ""}
      My profile photo link: ${user?.picture || ""}
    `;

    if (conversationId) {
      const chat = await conversation.findById(conversationId);
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

      const result = await chatSession.sendMessage(
        JSON.stringify({ prompt, IndianTime: Date() })
      );
      const response = result.response.text();
      const savedChat = await conversation.findByIdAndUpdate(
        conversationId,
        {
          conversations: JSON.stringify([
            ...history,
            { role: "user", parts: [{ text: prompt }] },
            { role: "model", parts: [{ text: response }] },
          ]),
        },
        { new: true }
      );

      res.json({ answer: response, newChat: false, savedChat });
    } else {
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

      const result = await chatSession.sendMessage(
        JSON.stringify({ prompt, IndianTime: Date() })
      );
      const response = result.response.text();
      const savedChat = await conversation.create({
        userId: user?.id,
        conversations: JSON.stringify([
          { role: "user", parts: [{ text: prompt }] },
          { role: "model", parts: [{ text: response }] },
        ]),
      });

      res.json({ answer: response, newChat: true, savedChat });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}

app.post("/api/ask-gemini", handleGeminiRequest);

app.use(express.static(path.resolve("./client/dist")));

app.get("*", (req: Request, res: Response) => {
  res.sendFile(path.resolve("./client/dist/index.html"));
});

const connectDatabase = async () => {
  try {
    const connection = await mongoose.connect(process.env.DB_URI || "");
    console.log(`MongoDB connected with server: ${connection.connection.host}`);
  } catch (error) {
    console.error("Database connection error:", error);
  }
};

// Error Handling Middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.message);
  res.status(500).send("Internal Server Error");
});

// Use the global error handler
app.use(globalErrorHandler);

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
  connectDatabase();
});
