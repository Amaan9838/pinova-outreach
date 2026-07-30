import { GoogleGenAI } from "@google/genai";
import * as dotenv from "dotenv";

dotenv.config();

// Initialize using the correct environment variable fallback
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function runPrompt(useSearch = true) {
  try {
    const config = useSearch 
      ? { 
          tools: [{ googleSearch: {} }]
        } 
      : {};
    
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      // ADDED: Added a directive forcing a live lookup. This ensures the model calls the tool.
      contents: "Perform a live Google Search right now to find the absolute latest status, delays, and schedule updates on NASA's Artemis II mission as of mid-2026.",
      config: config,
    });

    console.log("=== Response ===");
    console.log(response.text);
    console.log("================\n");

    const candidate = response.candidates?.[0];
    const metadata = candidate?.groundingMetadata;
    
    if (metadata) {
      console.log("=== Research Metadata ===");
      if (metadata.webSearchQueries && metadata.webSearchQueries.length > 0) {
        console.log("Search Queries Used:");
        metadata.webSearchQueries.forEach((query) => {
          console.log(`- "${query}"`);
        });
      }

      if (metadata.groundingChunks && metadata.groundingChunks.length > 0) {
        console.log("\nSources & Citations:");
        metadata.groundingChunks.forEach((chunk, index) => {
          if (chunk.web) {
            console.log(`[${index + 1}] ${chunk.web.title}`);
            console.log(`    URL: ${chunk.web.uri}`);
          }
        });
      }
      console.log("=========================");
    } else if (useSearch) {
      console.log("No search grounding metadata returned. (The model answered using internal weights instead)");
    }
  } catch (error) {
    if (useSearch && error.status === 429) {
      console.warn("⚠️  Google Search grounding failed: Quota exceeded or billing not enabled.");
      console.log("🔄 Retrying request without Google Search grounding fallback...\n");
      await runPrompt(false);
    } else {
      throw error;
    }
  }
}

async function main() {
  console.log("Sending request to Gemini with Google Search grounding enabled...\n");
  await runPrompt(true);
}

main();