# InboxPilot — AI Email Management Dashboard

A responsive full-stack sample app for an AI-assisted email workspace. It includes an inbox overview, three reply-workflow categories, client profiles, searchable/filterable messages, AI summaries and draft replies, and an inbox chat assistant.

## What's included

- **React + Vite frontend** with responsive desktop/mobile layouts.
- **Node.js + Express API** for inbox, client, draft, chat and reply workflows.
- **MongoDB/Mongoose support**. Add `MONGO_URI` to persist seeded emails and clients in MongoDB Atlas.
- **Demo fallback mode**. Without MongoDB the app starts with sample data in memory, so the UI and API can be previewed immediately.
- **Optional OpenAI integration**. Add `OPENAI_API_KEY` to enable model-generated summaries/replies/chat. Without a key, deterministic sample responses are used.
- **Reply safety**. The “Save reply” action stores the reply in this demo app and marks the thread complete. It does not send an external email.

## Run locally

Requirements: Node.js 20+ and npm.

```bash
npm install
cp .env.example .env
npm run dev
```

Open `http://localhost:5173`.

The API runs at `http://localhost:4000`. Test it with `GET /api/health`.

## Production build

```bash
npm install
npm run build
npm start
```

The Express server serves the built React app and API on the same port. Set `PORT` to the hosting provider's assigned port.

## MongoDB Atlas (optional but recommended)

1. Create a MongoDB Atlas cluster and a database user.
2. Add the Atlas connection string as `MONGO_URI` in your deployment environment.
3. On first startup, the server inserts sample emails and clients if the collections are empty.
4. To reset/seed the database manually, run `npm run seed` after adding `MONGO_URI`.

Do not commit your `.env` file or expose database/API secrets in frontend code.

## Optional AI setup

Add `OPENAI_API_KEY` and optionally `OPENAI_MODEL=gpt-4o-mini` to the server environment. The server uses the OpenAI Chat Completions API from the backend only. Keep the key private. Without it, the dashboard will remain usable with sample AI responses and clearly reports `demo fallback` in its footer.

## Deploy on Render

This repository contains `render.yaml` for a Node web service.

1. Push the project to a GitHub repository.
2. In Render, create a new Blueprint or Web Service from that repository.
3. Add `MONGO_URI` (recommended) and `OPENAI_API_KEY` (optional) as environment variables.
4. Deploy. Render will install dependencies, build the frontend and start Express.
5. Open the Render-provided `onrender.com` URL and check `/api/health`.

Alternative hosts that can run a Node web service include Railway and Replit. Use the same `npm install`, `npm run build`, and `npm start` commands.

## Demo content and limitations

All included names, organisations, email addresses and message threads are fictional sample data. The app is not connected to Gmail, Outlook, or any external mailbox. “Save reply” records a local draft/reply event only; it does not send mail. No real user inbox data is collected.

## Demo walkthrough (suggested 60–90 seconds)

1. Open Inbox overview and point out the four KPI cards.
2. Search for “campaign” and filter the three status categories.
3. Select “Website redesign feedback” and review the AI summary and suggested reply.
4. Edit the draft, use Copy, then Save reply to show the status workflow.
5. Open Clients and select Northstar Labs to show its conversation history.
6. Open AI assistant and ask “What replies are pending?”
7. Close by explaining that the sample mode works without integrations and that MongoDB/OpenAI can be enabled with environment variables.
