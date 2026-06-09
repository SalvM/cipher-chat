# Cipher Chat

> Privacy-first, end-to-end encrypted real-time chat — messages live in memory only and vanish on logout.

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-4-010101?logo=socket.io&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss&logoColor=white)

---

## Features

- **End-to-end encryption** — RSA-OAEP key pairs per user, AES-256-GCM per conversation. The server never sees plaintext.
- **Per-member key envelopes** — each member's copy of the conversation key is individually encrypted with their public key.
- **Key rotation** — removing a member triggers a new key version; they cannot decrypt future messages.
- **Disappearing messages** — self-destruct timers (1 min → 7 days). Client-side expiry, no server involvement.
- **Clusters with topics** — group spaces modelled as clusters, each with multiple topic channels.
- **1-to-1 private chats** — direct encrypted conversations alongside clusters.
- **Real-time** — Socket.io WebSocket layer; typing indicators, online/away/dnd/invisible status.
- **Zero persistence** — all messages live in Zustand in-memory stores. Logout clears everything.
- **File sharing** — encrypted file uploads (server-side AES-256-GCM).
- **Block system** — blocked users cannot message or see online status.

---

## Stack

| Layer         | Technology                             |
| ------------- | -------------------------------------- |
| Framework     | React 19 + React Router 7 (SPA)        |
| Styling       | Tailwind CSS 4 + CVA                   |
| UI Primitives | Radix UI (headless)                    |
| Animations    | Framer Motion                          |
| State         | Zustand (UI) · TanStack Query (server) |
| Realtime      | Socket.io-client                       |
| Notifications | Sonner                                 |
| Language      | TypeScript 5 strict                    |
| Build         | Vite 8                                 |

---

## Getting started

This is the **frontend only**. You need the companion backend running first:
→ [cipher-chat-server](https://github.com/SalvM/cipher-chat-server)

```bash
npm install
cp .env.example .env       # set VITE_BACKEND_URL (see below)
npm run dev                # http://localhost:5173
```

---

## Environment variables

| Variable           | Description                                      |
| ------------------ | ------------------------------------------------ |
| `VITE_BACKEND_URL` | Base URL of the backend API and WebSocket server (e.g. `http://localhost:8001`) |

`API_URL` and `WS_URL` are derived from this single variable in `src/utils/index.ts`.

---

## End-to-end encryption

```
Registration  →  Client generates RSA-OAEP key pair (2048-bit)
                 Public key → server  /  Private key stays on device

Send message  →  Client encrypts with AES-256-GCM conversation key
                 Ciphertext → server (server stores encrypted blobs only)

Receive msg   →  Client fetches encrypted key envelope
                 Decrypts envelope with RSA private key
                 Decrypts message with AES symmetric key
```

**Private key storage:**

| Where          | What                              | Survives             |
| -------------- | --------------------------------- | -------------------- |
| `localStorage` | PBKDF2-wrapped key bundle         | New tab, page reload |
| `sessionStorage` | PKCS8 bytes (volatile)          | Page reload only     |
| Memory         | `CryptoKey` object (cryptoStore)  | Current tab only     |

Opening a new tab shows an `UnlockKeyPrompt` — user re-enters password to unwrap the bundle and resume decryption.

Key files: [src/services/CryptoService.ts](src/services/CryptoService.ts) · [src/services/KeyService.ts](src/services/KeyService.ts) · [src/stores/cryptoStore.ts](src/stores/cryptoStore.ts)

---

## Project structure

```
src/
  assets/          # icons, images
  components/
    Auth/          # login, register, UnlockKeyPrompt
    Chat/          # MessageFeed, ClusterView, ChannelSidebar, …
    Common/        # shared layout components
    ui/            # primitive components (Button, Input, Dialog, …)
  hooks/           # useSocket, useChatMessages, encryption hooks
  Pages/           # route-level pages + AuthGuard
  services/        # Api.ts, CryptoService.ts, KeyService.ts, SocketService.ts
  stores/          # authStore, conversationStore, chatMessageStore, clusterMessageStore, cryptoStore, userStore
  styles/          # global theme, Tailwind config
  types/           # TypeScript declarations
  utils/           # cn(), API_URL, WS_URL, constants
```

---

## Privacy model

Messages are stored **in memory only** (Zustand stores + TanStack Query cache).  
On logout, `localStorage` is cleared and all stores reset — no message data survives the session.

Self-destruct timers run entirely client-side: a `setTimeout` removes the message from the store when the timer fires. No server round-trip needed.

Valid timer values: `0` (off), `1`, `5`, `30`, `60`, `1440`, `10080` minutes.

---

## Commands

```bash
npm run dev       # dev server at http://localhost:5173
npm run build     # tsc -b && vite build
npm run lint      # eslint .
npm run preview   # preview production build
```
