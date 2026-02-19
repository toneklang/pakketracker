
import { GoogleGenAI, Type } from "@google/genai";
import { Carrier, PackageStatus, ParseResult } from "../types.ts";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const SYSTEM_PROMPT = `Extract package tracking information from this Danish message (SMS or Email). 
Identify the carrier (PostNord, GLS, DAO, Bring, etc.), the tracking number, the sender name (if available), and whether the package is currently ready for pickup or still in transit.
Common Danish terms: "klar til afhentning" (Ready for Pickup), "pakken er på vej" (In Transit).`;

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    trackingNumber: { type: Type.STRING, description: "The tracking ID/barcode number." },
    carrier: { 
      type: Type.STRING, 
      enum: Object.values(Carrier),
      description: "The shipping company." 
    },
    sender: { type: Type.STRING, description: "Who the package is from." },
    status: { 
      type: Type.STRING, 
      enum: Object.values(PackageStatus),
      description: "Current delivery state based on the text." 
    }
  },
  required: ["carrier", "status"]
};

export async function parsePackageText(text: string): Promise<ParseResult | null> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `${SYSTEM_PROMPT}\n\nMessage:\n"${text}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA
      }
    });

    if (!response.text) return null;
    return JSON.parse(response.text.trim()) as ParseResult;
  } catch (error) {
    console.error("Error parsing package text:", error);
    return null;
  }
}

export async function parsePackageImage(base64Data: string, mimeType: string): Promise<ParseResult | null> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          inlineData: {
            data: base64Data,
            mimeType: mimeType
          }
        },
        {
          text: SYSTEM_PROMPT
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA
      }
    });

    if (!response.text) return null;
    return JSON.parse(response.text.trim()) as ParseResult;
  } catch (error) {
    console.error("Error parsing package image:", error);
    return null;
  }
}
