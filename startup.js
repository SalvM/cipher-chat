export const logStart = (step, port = '0000') => {
  const messages = {
    init: () => {
      console.log("╭────────────────────────────────────────╮");
      console.log("│  Server starting...                    │");
      console.log("╰────────────────────────────────────────╯");
      console.log("");
    },
    middlewares: () => console.log("· · · middlewares loaded"),
    database: () => console.log("· · · MongoDB connected"),
    models: () => console.log("· · · models registered"),
    routes: () => console.log("· · · routes initialized"),
    websocket: () => console.log("· · · WebSocket ready"),
    ready: () => {
      console.log("");
      console.log("╭────────────────────────────────────────╮");
      console.log(`│  ✓ Server running on port ${port}         │`);
      console.log("╰────────────────────────────────────────╯");
    }
  };
  
  messages[step]?.();
};