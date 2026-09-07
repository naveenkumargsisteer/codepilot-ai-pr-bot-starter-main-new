import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  try {
    let body;
    try {
      body = await req.json();
    } catch (e) {
      return NextResponse.json({ error: "Invalid JSON format." }, { status: 400 });
    }

    const { message } = body;

    if (!message || typeof message !== "string" || message.trim() === "") {
      return NextResponse.json({ error: "Message is required." }, { status: 400 });
    }

    const cookieStore = await cookies();
    const selectedRepoCookie = cookieStore.get("selected_repo")?.value;

    if (!selectedRepoCookie) {
      return NextResponse.json({ error: "No repository selected." }, { status: 400 });
    }

    let repository;
    try {
      repository = JSON.parse(selectedRepoCookie);
    } catch (e) {
      return NextResponse.json({ error: "Invalid repository data format." }, { status: 400 });
    }

    return NextResponse.json({
      message: "Chat request received.",
      prompt: message.trim(),
      repository: repository
    }, { status: 200 });

  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
}
