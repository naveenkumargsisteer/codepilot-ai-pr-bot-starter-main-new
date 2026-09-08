import { NextResponse } from "next/server";

export async function GET() {
  // Read the environment variable
  const apiKey = process.env.GEMINI_API_KEY;
  
  // Safely check if it is present and non-empty
  const isConfigured = typeof apiKey === "string" && apiKey.trim().length > 0;
  
  // Return the safe boolean result
  return NextResponse.json({ configured: isConfigured });
}
