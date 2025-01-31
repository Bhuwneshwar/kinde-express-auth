import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
  SchemaType,
  FunctionCallingMode,
  POSSIBLE_ROLES,
} from "@google/generative-ai";
import dotenv from "dotenv";
import { Request, Response } from "express";

dotenv.config();

const apiKey: string = process.env.GEMINI_API_KEY!;
const genAI = new GoogleGenerativeAI(apiKey);

const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
  },
];
type PossibleRole = "user" | "function" | "system" | "model";

const history: Array<{
  role: PossibleRole;
  parts: Array<{ text: string }>;
}> = [
  //   {
  //     role: "user",
  //     parts: [
  //       {
  //         text: "send whatsapp message to ujjwal, write message how are you?",
  //       },
  //     ],
  //   },
];

export const agent_fnCall = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // console.log("agent_fnCall");

    const prompt = req.body.prompt || req.query.prompt || req.params.prompt;
    const systemPrompt =
      req.body.systemPrompt ||
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
      systemInstruction:
        systemPrompt ||
        `you are an AI android mobile operator with available tools and also you can respond to general questions
        
        example:
        - send a message to amit
        if you don't know amit or any body phone number then you can ask me to get all contacts
        - send a message to 912-269-7021
        
        
        `,
      tools: [
        {
          functionDeclarations: [
            {
              name: "getAllContacts",
              description: `returns all contacts from the saved contacts list type {[Amit Beta]: 
                -- [Phone Number]: 
                ---- [Mobile]: 912-269-7021
                [Amulya Mistri]: 
                -- [Phone Number]: 
                ---- [Mobile]: 834-864-7994
                [Anand Tile Mishtri]: 
                -- [Phone Number]: 
                ---- [Mobile]: 908-320-9153
                [Anwar Bijali Wala]: 
                -- [Phone Number]: 
                ---- [Mobile]: 771-097-3612
                [Ari An]: 
                -- [Phone Number]: 
                ---- [Mobile]: +919614132547
                }`,
            },
            {
              name: "sendWhatsAppMessage",
              description:
                "sends a message using WhatsApp accept phone number and message",
              parameters: {
                type: SchemaType.OBJECT,
                properties: {
                  phoneNumber: {
                    type: SchemaType.STRING,
                  },
                  message: {
                    type: SchemaType.STRING,
                  },
                },
              },
            },
            {
              name: "phoneCall",
              description: "make a phone call accept to phone number",
              parameters: {
                type: SchemaType.OBJECT,
                properties: {
                  phoneNumber: {
                    type: SchemaType.STRING,
                  },
                },
              },
            },
            {
              name: "sendEmail",
              description: "send an email accept to email , subject, message",
              parameters: {
                type: SchemaType.OBJECT,
                properties: {
                  to: {
                    type: SchemaType.STRING,
                  },
                  subject: {
                    type: SchemaType.STRING,
                  },
                  message: {
                    type: SchemaType.STRING,
                  },
                },
              },
            },
            {
              name: "takePicture",
              description: "takes a picture",
            },
            {
              name: "takeSelfie",
              description: "takes a selfie",
            },
            {
              name: "openLastPicture",
              description: "open last picture taken",
            },
            {
              name: "sendSMS",
              description: "send sms accept phone number and message",
              parameters: {
                type: SchemaType.OBJECT,
                properties: {
                  phoneNumber: {
                    type: SchemaType.STRING,
                  },
                  message: {
                    type: SchemaType.STRING,
                  },
                },
              },
            },
            {
              name: "playMusic",
              description: "play music",
            },
            {
              name: "pauseMusic",
              description: "pause music",
            },
          ],
        },
      ],
      toolConfig: { functionCallingConfig: { mode: FunctionCallingMode.ANY } },
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

    // async function run(): Promise<void> {
    const chatSession = model.startChat({
      generationConfig,
      history,
    });
    const userMsg = prompt;
    const result = await chatSession.sendMessage(userMsg);
    history.push({
      role: "user",
      parts: [{ text: userMsg }],
    });

    // console.log(JSON.stringify(result, null, 2));

    result.response.candidates?.forEach((cand) => {
      // console.log({ cand });
      history.push({
        role: "model",
        parts: [{ text: JSON.stringify(cand.content) }],
      });

      // console.log({ content: cand.content });
      res.send(cand.content);
      console.log({ history: JSON.stringify(history, null, 2) });

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
  } catch (error) {
    console.error("agent_fnCall error", error);
    res.status(500).json({
      message: "Internal server error",
    });
  }
};
