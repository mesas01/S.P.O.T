import { GoogleGenerativeAI } from "@google/generative-ai";

const FALLBACK_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
  "base64",
);

let cachedImage = null;

export async function generateEventImage(eventName = "SPOT Event") {
  if (cachedImage) return cachedImage;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("GEMINI_API_KEY not set — using fallback 1x1 PNG");
    return FALLBACK_PNG;
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-image",
      generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
    });
    const result = await model.generateContent(
      `Generate a colorful event poster image for: ${eventName}. Simple, modern design.`,
    );
    const part = result.response.candidates[0].content.parts.find(
      (p) => p.inlineData,
    );
    if (!part) throw new Error("No image in Gemini response");
    cachedImage = Buffer.from(part.inlineData.data, "base64");
    console.log(`    Gemini image generated (${cachedImage.length} bytes)`);
    return cachedImage;
  } catch (err) {
    console.warn(
      `Gemini image generation failed: ${err.message} — using fallback`,
    );
    return FALLBACK_PNG;
  }
}
