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
const kinde_typescript_sdk_1 = require("@kinde-oss/kinde-typescript-sdk");
const errorHandler_1 = require("./middleware/errorHandler");
const app = (0, express_1.default)();
const PORT = 3000;
// Replace with your Kinde credentials
const kindeClient = (0, kinde_typescript_sdk_1.createKindeServerClient)(kinde_typescript_sdk_1.GrantType.AUTHORIZATION_CODE, {
    authDomain: "https://rebyb.kinde.com",
    clientId: "f2af4516ea38440394a3f1dc88d6477b",
    clientSecret: "Jd7w82NnuEU3foZGFwUBsKKmR3Sz4QH3VR8mkUkJE2bVhR6YW",
    redirectURL: "http://localhost:3000/callback",
    logoutRedirectURL: "http://localhost:3000",
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
// Routes
// app.get("/", (req: Request, res: Response) => {
//   res.send("Welcome to the Express TypeScript Server!");
// });
app.post("/data", (req, res) => {
    const { name, age } = req.body;
    res.json({ message: `Hello, ${name}. You are ${age} years old.` });
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
app.get("/", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const isAuthenticated = yield kindeClient.isAuthenticated(sessionManager);
    if (isAuthenticated) {
        const profile = yield kindeClient.getUserProfile(sessionManager);
        res.send(`Hello, ${profile.given_name}!`);
    }
    else {
        res.send("Please login");
    }
}));
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
});
