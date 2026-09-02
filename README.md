# CodePilot — AI PR Bot Starter

A Next.js + Node.js backend starter for an AI coding agent that:
1. Connects GitHub repositories
2. Accepts a coding request in chat
3. Analyzes the repository
4. Generates an implementation plan
5. Waits for explicit approval
6. Runs an agent in a sandbox
7. Creates a branch, commit and pull request

## Stack

- Next.js (Node.js runtime)
- React + TypeScript
- Supabase PostgreSQL
- GitHub App/OAuth (integration to implement)
- Ollama for local/free AI development
- Docker sandbox for agent execution

## Run

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000

## Supabase

Run `supabase/schema.sql` in the Supabase SQL editor and configure:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY

Authentication/RLS policies should be added before production.

## Vercel note

The UI/API can deploy to Vercel, but a long-running coding worker, Docker sandbox, and local Ollama model should NOT run inside a Vercel serverless function.

Recommended production architecture:

Vercel
  -> Next.js UI + API
  -> Supabase
  -> GitHub API
  -> separate worker service
  -> isolated Docker sandbox
  -> AI provider/local model

For a $0 prototype, run the worker + Ollama on your own PC and keep Vercel/Supabase for the web layer.

## Next implementation steps

1. Add Supabase Auth.
2. Implement GitHub OAuth or GitHub App installation.
3. Store repository connections.
4. Add `/api/tasks` to save prompts.
5. Add repository analysis using Git + local Ollama.
6. Return a plan to the chat UI.
7. Add an approval endpoint.
8. Execute the approved task in an isolated workspace.
9. Run tests/lint/build with timeouts.
10. Push a new branch and create a GitHub PR.
11. Return the PR URL to the chat.

## Security

Never:
- store GitHub passwords
- expose GitHub client secrets/private keys to the browser
- execute arbitrary model-generated shell commands on the Vercel host
- allow an agent to modify `main` directly

Use short-lived credentials, branch protection, sandboxing, command allow/deny policies, timeouts, resource limits and explicit approval.
