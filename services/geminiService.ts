import { GoogleGenAI } from "@google/genai";
import { Ticket, TicketStatus } from "../types";

const apiKey = process.env.API_KEY || ''; // Fallback to empty string if not defined, though expected to be present.
const ai = new GoogleGenAI({ apiKey });

export const generateTicketSummary = async (description: string): Promise<string> => {
  if (!apiKey) return "AI Summary unavailable (No API Key)";

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Summarize the following customer complaint into a concise one-sentence title (max 10 words): "${description}"`,
    });
    return response.text.trim();
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "New Ticket";
  }
};

export const generateResponseSuggestion = async (ticket: Ticket): Promise<string> => {
  if (!apiKey) return "AI unavailable (No API Key)";

  const history = ticket.remarks.map(r => `${r.author} (${r.type}): ${r.text}`).join('\n');
  const prompt = `
    You are a helpful customer support AI assistant.
    Ticket Title: ${ticket.title}
    Customer Name: ${ticket.customerName}
    Description: ${ticket.description}
    Current Status: ${ticket.status}
    
    History:
    ${history}

    Suggest a professional, empathetic, and concise response for the operator to send to the customer or add as an internal remark.
    If the status is Resolved, suggest a closing message.
    Keep it under 50 words.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text.trim();
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Could not generate suggestion.";
  }
};
