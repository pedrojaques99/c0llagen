import { GoogleGenAI, Type } from "@google/genai";
import { BoundingBox } from "../types";

const CONFIG = {
  GEMINI_NANO_MODEL: "gemini-1.5-flash-8b", // Using Flash 8B as the Cloud equivalent for Gemini Nano
  UPSCALE_MODEL: "gemini-3.1-flash-image-preview",
  VIDEO_MODEL: "veo-3.1-lite-generate-preview",
  VIDEO_PRO_MODEL: "veo-3.1-generate-preview", // Referred to as Veo 3
  DEFAULT_UPSCALE_SIZE: "4K" as const,
};

export interface AISuggestion {
  id: string;
  preset: string;
  prompt: string;
}

export interface TokenUsageBreakdown {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export const tokenUsage = {
  totalTokens: 0,
  promptTokens: 0,
  completionTokens: 0,
  breakdown: {
    image: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    video: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    analysis: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
  } as Record<string, TokenUsageBreakdown>
};

const updateTokenUsage = (response: any, type: 'image' | 'video' | 'analysis' = 'analysis') => {
  if (response.usageMetadata) {
    const promptTokens = response.usageMetadata.promptTokenCount || 0;
    const completionTokens = response.usageMetadata.candidatesTokenCount || 0;
    const totalTokens = response.usageMetadata.totalTokenCount || 0;

    tokenUsage.promptTokens += promptTokens;
    tokenUsage.completionTokens += completionTokens;
    tokenUsage.totalTokens += totalTokens;
    
    if (!tokenUsage.breakdown[type]) {
      tokenUsage.breakdown[type] = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
    }
    
    tokenUsage.breakdown[type].promptTokens += promptTokens;
    tokenUsage.breakdown[type].completionTokens += completionTokens;
    tokenUsage.breakdown[type].totalTokens += totalTokens;
    
    // Dispatch a custom event for UI updates
    window.dispatchEvent(new CustomEvent('token-update', { detail: { ...tokenUsage } }));
  }
};

export const PROMPT_PRESETS = [
  { id: 'subtle', name: 'Subtle cinematic scene', prompt: 'A subtle cinematic scene with professional lighting, slow camera movement, and high aesthetic quality.' },
  { id: 'dynamic', name: 'Dynamic transition', prompt: 'A dynamic cinematic transition with energy, fluid motion, and vibrant atmosphere.' },
  { id: 'atmospheric', name: 'Atmospheric depth', prompt: 'Deep atmospheric cinematic vision with moody lighting, particles, and ethereal feel.' }
];

const getAI = () => {
  // Use ONLY the environment provided key (GEMINI_API_KEY) as requested.
  // This bypasses the AI Studio platform modal and uses the 'env backend' key.
  const geminiKey = process.env.GEMINI_API_KEY || (import.meta as any).env?.VITE_GEMINI_API_KEY || (import.meta as any).env?.GEMINI_API_KEY;
  const apiKey = geminiKey || process.env.API_KEY || (import.meta as any).env?.VITE_API_KEY;
  
  if (!apiKey) {
    console.error("API Key missing. Checked: process.env.GEMINI_API_KEY, VITE_GEMINI_API_KEY, GEMINI_API_KEY, and legacy API_KEY");
    throw new Error("GEMINI_API_KEY is not set. Please ensure you have added it to your Vercel Environment Variables or .env file.");
  }
  
  return new GoogleGenAI({ apiKey });
};

const compressImage = async (base64: string, maxWidth = 1280, quality = 0.8): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = (maxWidth / width) * height;
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error("Failed to get canvas context"));
      
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = reject;
    img.src = base64;
  });
};

export const generateVideo = async (
  base64Image: string, 
  prompt: string,
  onProgress?: (operation: any) => void,
  includeAudio: boolean = false
): Promise<string> => {
  const ai = getAI();
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || (import.meta as any).env?.VITE_GEMINI_API_KEY;

  const compressed = await compressImage(base64Image);

  let operation = await ai.models.generateVideos({
    model: CONFIG.VIDEO_MODEL,
    prompt: prompt,
    image: {
      imageBytes: compressed.split(",")[1],
      mimeType: 'image/jpeg',
    },
    config: {
      numberOfVideos: 1,
      resolution: '720p',
      aspectRatio: '16:9',
      includeAudio
    } as any
  });

  // Poll for completion
  while (!operation.done) {
    if (onProgress) onProgress(operation);
    await new Promise(resolve => setTimeout(resolve, 10000));
    operation = await ai.operations.getVideosOperation({ operation: operation });
  }

  if ((operation.response as any)?.usageMetadata) {
    updateTokenUsage(operation.response, 'video');
  }

  const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
  if (!downloadLink) throw new Error("No video generated");

  const response = await fetch(downloadLink, {
    method: 'GET',
    headers: {
      'x-goog-api-key': apiKey!,
    },
  });

  const blob = await response.blob();
  return URL.createObjectURL(blob);
};

export const generateVideoWithFrames = async (
  startImage: string,
  endImage: string,
  prompt: string,
  onProgress?: (operation: any) => void,
  includeAudio: boolean = false
): Promise<string> => {
  const ai = getAI();
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || (import.meta as any).env?.VITE_GEMINI_API_KEY;

  const [startCompressed, endCompressed] = await Promise.all([
    compressImage(startImage),
    compressImage(endImage)
  ]);

  let operation = await ai.models.generateVideos({
    model: CONFIG.VIDEO_PRO_MODEL,
    prompt: prompt,
    image: {
      imageBytes: startCompressed.split(",")[1],
      mimeType: 'image/jpeg',
    },
    config: {
      numberOfVideos: 1,
      resolution: '720p',
      aspectRatio: '16:9',
      lastFrame: {
        imageBytes: endCompressed.split(",")[1],
        mimeType: 'image/jpeg',
      },
      includeAudio
    } as any
  });

  // Poll for completion
  while (!operation.done) {
    if (onProgress) onProgress(operation);
    await new Promise(resolve => setTimeout(resolve, 10000));
    operation = await ai.operations.getVideosOperation({ operation: operation });
  }

  if ((operation.response as any)?.usageMetadata) {
    updateTokenUsage(operation.response, 'video');
  }

  const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
  if (!downloadLink) throw new Error("No video generated");

  const response = await fetch(downloadLink, {
    method: 'GET',
    headers: {
      'x-goog-api-key': apiKey!,
    },
  });

  const blob = await response.blob();
  return URL.createObjectURL(blob);
};

export const generateFullVideo = async (
  images: string[],
  onProgress?: (operation: any) => void,
  includeAudio: boolean = false
): Promise<string> => {
  const ai = getAI();
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || (import.meta as any).env?.VITE_GEMINI_API_KEY;

  // Compress images to avoid 413 error
  const compressedImages = await Promise.all(images.slice(0, 5).map(img => compressImage(img, 1024, 0.7)));

  // 1. Analyze images to create a professional video prompt
  const analysisPrompt = `Act as a professional cinematic video editor. 
  I have extracted several images from a moodboard. 
  Analyze these images and create a single, highly detailed, and cohesive prompt for a 6-second cinematic video.
  The video should intelligently transition through the themes, colors, and subjects found in these images.
  Describe camera movements (like slow pans, orbits, or dollies), lighting changes, and atmospheric details.
  The final prompt must be optimized for the Veo 3 video generation model.
  Output ONLY the final video prompt text.`;

  const analysisResponse = await ai.models.generateContent({
    model: CONFIG.GEMINI_NANO_MODEL,
    contents: [
      {
        parts: [
          { text: analysisPrompt },
          ...compressedImages.map(img => ({
            inlineData: {
              mimeType: "image/jpeg",
              data: img.split(",")[1],
            },
          })),
        ],
      },
    ],
  });

  updateTokenUsage(analysisResponse, 'analysis');
  const finalVideoPrompt = analysisResponse.text || "A cinematic sequence transitioning through various artistic scenes with professional lighting and camera work.";

  // 2. Generate the video using the intelligent prompt
  let operation = await ai.models.generateVideos({
    model: CONFIG.VIDEO_PRO_MODEL,
    prompt: finalVideoPrompt,
    config: {
      numberOfVideos: 1,
      resolution: '720p',
      aspectRatio: '16:9',
      // We can use up to 3 reference images for style/content guidance
      referenceImages: compressedImages.slice(0, 3).map(img => ({
        image: {
          imageBytes: img.split(",")[1],
          mimeType: "image/jpeg",
        },
        referenceType: "ASSET" as any,
      })),
      includeAudio
    } as any
  });

  // Poll for completion
  while (!operation.done) {
    if (onProgress) onProgress(operation);
    await new Promise(resolve => setTimeout(resolve, 10000));
    operation = await ai.operations.getVideosOperation({ operation: operation });
  }

  if ((operation.response as any)?.usageMetadata) {
    updateTokenUsage(operation.response, 'video');
  }

  const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
  if (!downloadLink) throw new Error("No video generated");

  const response = await fetch(downloadLink, {
    method: 'GET',
    headers: {
      'x-goog-api-key': apiKey!,
    },
  });

  const blob = await response.blob();
  return URL.createObjectURL(blob);
};

export const detectGridItems = async (base64Image: string): Promise<BoundingBox[]> => {
  const ai = getAI();

  const prompt = `Identify all individual images within this grid or moodboard. 
  Return a JSON array of objects, each containing 'x', 'y', 'width', and 'height' as percentages (0-100) relative to the total image dimensions. 
  Be extremely precise with the coordinates to avoid including borders or adjacent images.
  Only return the JSON array.`;

  const response = await ai.models.generateContent({
    model: CONFIG.GEMINI_NANO_MODEL,
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Image.split(",")[1],
            },
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            x: { type: Type.NUMBER },
            y: { type: Type.NUMBER },
            width: { type: Type.NUMBER },
            height: { type: Type.NUMBER },
          },
          required: ["x", "y", "width", "height"],
        },
      },
    },
  });

  updateTokenUsage(response, 'analysis');

  try {
    return JSON.parse(response.text || "[]");
  } catch (e) {
    console.error("Failed to parse grid detection response", e);
    return [];
  }
};

export const upscaleImage = async (
  base64Image: string, 
  size: "1K" | "2K" | "4K" = CONFIG.DEFAULT_UPSCALE_SIZE
): Promise<string> => {
  const ai = getAI();

  const response = await ai.models.generateContent({
    model: CONFIG.UPSCALE_MODEL,
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: base64Image.split(",")[1],
          },
        },
        { text: `Upscale this image to ${size} resolution. Enhance clarity, details, and sharpness while preserving the original content perfectly. Output only the upscaled image.` },
      ],
    },
    config: {
      imageConfig: {
        imageSize: size,
      },
    },
  });

  updateTokenUsage(response, 'image');

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }

  throw new Error("No image generated in upscale response");
};

export const suggestAIFirst = async (images: { id: string, url: string }[]): Promise<AISuggestion[]> => {
  const ai = getAI();
  const prompt = `Analyze these images and suggest the best Remotion animation preset and a cinematic video prompt for each.
  Available Remotion presets: "zoom-in", "zoom-out", "pan-lr", "pan-rl", "fade-in".
  Return a JSON array of objects, each with 'id', 'preset', and 'prompt'.
  The 'id' must match the provided image IDs.
  The 'prompt' should be a detailed cinematic description for the Veo 3 model, optimized for high-speed 'Banana Gen' style results.
  Leverage Gemini Nano characteristics for precision in style detection.
  Only return the JSON array.`;

  const response = await ai.models.generateContent({
    model: CONFIG.GEMINI_NANO_MODEL,
    contents: [
      {
        parts: [
          { text: prompt },
          ...images.slice(0, 10).map(img => ({
            inlineData: {
              mimeType: "image/jpeg",
              data: img.url.split(",")[1],
            },
          })),
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            preset: { type: Type.STRING },
            prompt: { type: Type.STRING },
          },
          required: ["id", "preset", "prompt"],
        },
      },
    },
  });

  updateTokenUsage(response, 'analysis');

  try {
    return JSON.parse(response.text || "[]");
  } catch (e) {
    console.error("Failed to parse AI suggestions", e);
    return [];
  }
};
