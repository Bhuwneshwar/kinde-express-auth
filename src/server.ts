import express, { NextFunction, Request, Response } from "express";
import cookieParser from "cookie-parser";
import {
  createKindeServerClient,
  GrantType,
} from "@kinde-oss/kinde-typescript-sdk";
import { globalErrorHandler } from "./middleware/errorHandler";

const app = express();
const PORT = 3000;

// Replace with your Kinde credentials
const kindeClient = createKindeServerClient(GrantType.AUTHORIZATION_CODE, {
  authDomain: "https://rebyb.kinde.com",
  clientId: "f2af4516ea38440394a3f1dc88d6477b",
  clientSecret: "Jd7w82NnuEU3foZGFwUBsKKmR3Sz4QH3VR8mkUkJE2bVhR6YW",
  redirectURL: "https://kinde-express-auth-production.up.railway.app/callback",
  logoutRedirectURL: "https://kinde-express-auth-production.up.railway.app",
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

// Routes
// app.get("/", (req: Request, res: Response) => {
//   res.send("Welcome to the Express TypeScript Server!");
// });

app.post("/data", (req: Request, res: Response) => {
  const { name, age } = req.body;
  res.json({ message: `Hello, ${name}. You are ${age} years old.` });
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

app.get("/", async (req, res) => {
  const isAuthenticated = await kindeClient.isAuthenticated(sessionManager);
  if (isAuthenticated) {
    const profile = await kindeClient.getUserProfile(sessionManager);
    res.send(`Hello, ${profile.given_name}!`);
  } else {
    res.send("Please login");
  }
});

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
});
