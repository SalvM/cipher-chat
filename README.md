# Cipher Chat

A privacy-first chat client with ephemeral messages and self-destruct timers.  
No message persistence — all data lives in memory and is cleared on logout.

![screenshot](./docs/screenshot.png)

## Stack

| Layer         | Technology                             |
| ------------- | -------------------------------------- |
| Framework     | React 19 + React Router 7 (SPA)        |
| Styling       | Tailwind CSS 4 + CVA                   |
| UI Primitives | Radix UI (headless)                    |
| State         | Zustand (UI) · TanStack Query (server) |
| Realtime      | Socket.io-client                       |
| Language      | TypeScript 5 strict                    |

## Getting started

```bash
npm install
cp .env.example .env       # set VITE_BACKEND_URL
npm run dev                # http://localhost:5173
```

## Environment variables

| Variable           | Description                                      |
| ------------------ | ------------------------------------------------ |
| `VITE_BACKEND_URL` | Base URL of the backend API and WebSocket server |

## Project structure

```
app/
  assets/        # all medias (icons, images, …)
  components/
    Chat/        # domain components (MessageList, ChannelSidebar, …)
    Common/      # Common components used by other components
    ui/          # primitive components (Button, Input, …)
  hooks/         # useSocket, useMessages, …
  Pages/         # Main route pages
  services/      # Third part APIs, our BE APIs
  store/         # zustand stores
  types/         # typescript types declarations
```

## Privacy model

Messages are stored in-memory only (TanStack Query cache).  
`queryClient.clear()` is called on logout — no data survives the session.  
Self-destruct timers remove messages from the cache client-side on expiry.
