import { GoogleGenerativeAI } from "@google/generative-ai";

const FALLBACK_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
  "base64",
);

let cachedFile: File | null = null;

function bufferToFile(buffer: Buffer, name: string): File {
  return new File([buffer], name, { type: "image/png" });
}

export async function generateEventImage(
  eventName = "SPOT Event",
): Promise<File> {
  if (cachedFile) return cachedFile;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("GEMINI_API_KEY not set — using fallback 1x1 PNG");
    cachedFile = bufferToFile(FALLBACK_PNG, "event-poster.png");
    return cachedFile;
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
    const part = result.response.candidates?.[0]?.content?.parts?.find(
      (p: { inlineData?: unknown }) => p.inlineData,
    );
    if (!part || !("inlineData" in part))
      throw new Error("No image in Gemini response");

    const imageData = (part as { inlineData: { data: string } }).inlineData
      .data;
    const buffer = Buffer.from(imageData, "base64");
    cachedFile = bufferToFile(buffer, "event-poster.png");
    console.log(`    Gemini image generated (${buffer.length} bytes)`);
    return cachedFile;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(
      `Gemini image generation failed: ${message} — using fallback`,
    );
    cachedFile = bufferToFile(FALLBACK_PNG, "event-poster.png");
    return cachedFile;
  }
}
