import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getSupabaseAdmin } from "../../../../lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signatureHeader = req.headers.get("x-hub-signature");
    const secret = process.env.JIRA_WEBHOOK_SECRET;

    if (!secret || !signatureHeader) {
      return NextResponse.json({ error: "Missing signature or secret" }, { status: 401 });
    }

    const hmac = crypto.createHmac("sha256", secret);
    hmac.update(rawBody);
    const expectedSignature = `sha256=${hmac.digest("hex")}`;

    let isValid = false;
    try {
      const sigBuffer = Buffer.from(signatureHeader, 'utf8');
      const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
      
      if (sigBuffer.length === expectedBuffer.length) {
        isValid = crypto.timingSafeEqual(sigBuffer, expectedBuffer);
      }
    } catch (e) {
      // Catch any encoding issues when creating Buffers
      isValid = false;
    }

    if (!isValid) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
    }

    const url = new URL(req.url);
    const integrationId = url.searchParams.get("integration_id");

    if (!integrationId) {
      return NextResponse.json({ error: "Missing integration_id parameter." }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Verify integration_id maps to a valid repository
    const { data: repoData, error: repoError } = await supabase
      .from("repositories")
      .select("installation_id, owner, name")
      .eq("id", integrationId)
      .single();

    if (repoError || !repoData) {
      return NextResponse.json({ error: "Invalid integration ID." }, { status: 400 });
    }

    const inst = repoData.installation_id;
    const repo = `${repoData.owner}/${repoData.name}`;

    if (!inst) {
      return NextResponse.json({ error: "Repository is not fully connected." }, { status: 400 });
    }

    let payload;
    try {
      payload = JSON.parse(rawBody);
    } catch (e) {
      return NextResponse.json({ error: "Invalid JSON format." }, { status: 400 });
    }

    if (payload.webhookEvent !== "jira:issue_created") {
      return NextResponse.json({ message: "Ignored event type." }, { status: 200 });
    }

    const issue = payload.issue;
    if (!issue || !issue.key || !issue.fields) {
      return NextResponse.json({ error: "Invalid issue data." }, { status: 400 });
    }

    const issueKey = issue.key;
    const summary = issue.fields.summary || "No summary provided";
    
    let description = "";
    if (typeof issue.fields.description === "string") {
      description = issue.fields.description;
    } else if (issue.fields.description && typeof issue.fields.description === "object") {
      description = JSON.stringify(issue.fields.description);
    }
    
    if (description.length > 2000) {
      description = description.substring(0, 2000) + "... (truncated)";
    }

    const issueUrl = issue.self ? issue.self.split("/rest/api")[0] + "/browse/" + issueKey : "";

    const { error } = await supabase
      .from("jira_notifications")
      .insert({
        installation_id: inst,
        repo_full_name: repo,
        issue_key: issueKey,
        summary,
        description,
        url: issueUrl,
        status: "pending"
      });

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ message: "Duplicate issue, ignored." }, { status: 200 });
      }
      console.error("Supabase insert error:", error.message);
      return NextResponse.json({ error: "Failed to store notification." }, { status: 500 });
    }

    return NextResponse.json({ message: "Notification stored." }, { status: 200 });
  } catch (error: any) {
    console.error("Jira webhook error:", error.message);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
