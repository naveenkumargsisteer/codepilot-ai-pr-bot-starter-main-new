import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getInstallationOctokit } from "../../../../lib/github";
import { generateGeminiResponse } from "../../../../lib/gemini";

export async function POST(req: NextRequest) {
  try {
    let body;
    try {
      body = await req.json();
    } catch (e) {
      return NextResponse.json({ error: "Invalid JSON format." }, { status: 400 });
    }

    const { message, plan, context } = body;

    if (!message || !plan) {
      return NextResponse.json({ error: "Message and plan are required." }, { status: 400 });
    }

    const cookieStore = await cookies();
    const selectedRepoCookie = cookieStore.get("selected_repo")?.value;

    if (!selectedRepoCookie) {
      return NextResponse.json({ error: "No repository selected." }, { status: 400 });
    }
    
    const installationId = cookieStore.get("github_installation_id")?.value;

    if (!installationId) {
      return NextResponse.json({ error: "GitHub installation not found." }, { status: 401 });
    }

    let repository;
    try {
      repository = JSON.parse(selectedRepoCookie);
    } catch (e) {
      return NextResponse.json({ error: "Invalid repository data format." }, { status: 400 });
    }
    
    if (!repository.full_name || typeof repository.full_name !== "string") {
      return NextResponse.json({ error: "Invalid repository format." }, { status: 400 });
    }

    const [owner, repo] = repository.full_name.split("/");

    if (!owner || !repo) {
      return NextResponse.json({ error: "Could not parse owner and repo." }, { status: 400 });
    }

    const default_branch = repository.default_branch || "main";

    const octokit = await getInstallationOctokit(installationId);
    
    let treeData: any[] = [];
    try {
      const { data: treeResponse } = await octokit.rest.git.getTree({
        owner,
        repo,
        tree_sha: default_branch,
        recursive: "1",
      });
      treeData = treeResponse.tree.map((item: any) => {
        const result: any = {
          path: item.path,
          type: item.type
        };
        if (item.size !== undefined) {
          result.size = item.size;
        }
        return result;
      });
    } catch (treeError) {
      console.error("Failed to fetch tree:", treeError);
    }

    const safePaths = treeData
      .filter(f => f.type === 'blob')
      .map(f => f.path);
    const validPaths = new Set(safePaths);

    const promptContext = `You are CodePilot, an expert AI coding agent. The user is asking you to make a coding change to their repository.
You have already generated an implementation plan that the user has approved. 
Now, you must generate the exact code changes to be written to the repository.

USER REQUEST (INSTRUCTION):
${message.trim()}

APPROVED PLAN:
${plan}

--- REPOSITORY CONTEXT ---
Repository Name: ${repository.name || repo}
Full Name: ${repository.full_name}

AVAILABLE FILES:
${JSON.stringify(context?.files || {}, null, 2)}

--- INSTRUCTIONS FOR YOU ---
1. Implement the code changes described in the approved plan.
2. Return a JSON object containing the proposed changes.
3. The JSON MUST follow this EXACT structure:
{
  "changes": [
    {
      "path": "path/to/file.ts",
      "action": "modify",
      "content": "..."
    },
    {
      "path": "path/to/new_file.ts",
      "action": "create",
      "content": "..."
    }
  ]
}
4. Only use "modify" or "create" as actions.
5. Provide the COMPLETE new content for each modified or created file.
6. Do NOT wrap the JSON in Markdown fences. Respond ONLY with the raw JSON string.`;

    let aiResponse = "";
    try {
      aiResponse = await generateGeminiResponse(promptContext);
    } catch (aiError: any) {
      console.error("Gemini AI error:", aiError);
      return NextResponse.json({ error: "Error: Could not generate AI response." }, { status: 500 });
    }

    let parsedResponse;
    try {
      let cleanedResponse = aiResponse.trim();
      if (cleanedResponse.startsWith("```json")) {
        cleanedResponse = cleanedResponse.substring(7);
      } else if (cleanedResponse.startsWith("```")) {
        cleanedResponse = cleanedResponse.substring(3);
      }
      if (cleanedResponse.endsWith("```")) {
        cleanedResponse = cleanedResponse.substring(0, cleanedResponse.length - 3);
      }
      parsedResponse = JSON.parse(cleanedResponse.trim());
    } catch (e) {
      console.error("Failed to parse Gemini response as JSON:", aiResponse);
      return NextResponse.json({ error: "Failed to parse AI response as valid JSON." }, { status: 500 });
    }

    if (!parsedResponse.changes || !Array.isArray(parsedResponse.changes)) {
      return NextResponse.json({ error: "Invalid response format: 'changes' array is missing." }, { status: 400 });
    }

    const MAX_FILES = 10;
    const MAX_CONTENT_SIZE = 100000;

    const validatedChanges = [];

    for (const change of parsedResponse.changes) {
      if (!change.path || typeof change.path !== "string") continue;
      if (!change.action || !["modify", "create"].includes(change.action)) continue;
      if (typeof change.content !== "string") continue;
      if (change.content.length > MAX_CONTENT_SIZE) continue;
      if (change.path.includes("../") || change.path.startsWith("/")) continue;
      if (change.path.includes("node_modules")) continue;
      if (change.path.endsWith(".lock") || change.path.endsWith("-lock.json")) continue;
      if (change.path.match(/\.(png|jpg|jpeg|gif|svg|ico|webp|woff|woff2|ttf|eot|mp4|webm|pdf|zip|tar|gz|bin|exe|dll)$/i)) continue;

      if (change.action === "modify" && !validPaths.has(change.path)) {
        continue; // Path doesn't exist to modify
      }
      
      if (change.action === "create" && validPaths.has(change.path)) {
        continue; // Path already exists, cannot create
      }

      validatedChanges.push(change);
      
      if (validatedChanges.length >= MAX_FILES) break;
    }

    return NextResponse.json({
      message: "Changes generated.",
      changes: validatedChanges
    }, { status: 200 });

  } catch (error: any) {
    console.error("Chat implement API error:", error);
    return NextResponse.json({ error: error.message || "An unexpected error occurred." }, { status: 500 });
  }
}
