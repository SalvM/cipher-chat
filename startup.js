import packageJson from "./package.json" with { type: "json" };
const VERSION = packageJson.version;

const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",

  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  gray: "\x1b[90m",

  bgGreen: "\x1b[42m",
  bgBlue: "\x1b[44m",
};

const icons = {
  rocket: "🚀",
  gear: "⚙️",
  database: "🗄️",
  model: "📦",
  route: "🛣️",
  websocket: "🔌",
  check: "✅",
  sparkles: "✨",
  dot: "•",
  cipher: "🔒",
};

const boxLine = (text, color = colors.cyan) => {
  const padding = 40 - text.length;
  const leftPad = Math.floor(padding / 2);
  const rightPad = padding - leftPad;
  return `${color}│${" ".repeat(leftPad)}${text}${" ".repeat(rightPad)}│${colors.reset}`;
};

export const timestamp = () => {
  const now = new Date();
  return `${colors.gray}[${now.toLocaleTimeString()}]${colors.reset}`;
};

export const logStart = (step, port = "0000") => {
  const messages = {
    init: () => {
      console.log("");
      console.log(
        `${colors.bright}${colors.cyan}╭────────────────────────────────────────╮${colors.reset}`,
      );
      console.log(
        boxLine(
          `${icons.cipher}  CIPHER v${VERSION}  ${icons.sparkles}`,
          colors.bright + colors.cyan,
        ),
      );
      console.log(boxLine("Server initializing...", colors.cyan));
      console.log(
        `${colors.cyan}╰────────────────────────────────────────╯${colors.reset}`,
      );
      console.log("");
    },

    middlewares: () => {
      console.log(
        `  ${colors.magenta}${icons.gear}${colors.reset} ${colors.dim}middlewares${colors.reset} ${colors.green}loaded${colors.reset} ${timestamp()}`,
      );
    },

    database: () => {
      console.log(
        `  ${colors.blue}${icons.database}${colors.reset} ${colors.dim}MongoDB${colors.reset} ${colors.green}connected${colors.reset} ${timestamp()}`,
      );
      console.log(
        `    ${colors.gray}└─ ${process.env.MONGO_URI?.split("/").pop() || "cipher_db"}${colors.reset}`,
      );
    },

    models: () => {
      console.log(
        `  ${colors.yellow}${icons.model}${colors.reset} ${colors.dim}models${colors.reset} ${colors.green}registered${colors.reset} ${timestamp()}`,
      );
    },

    routes: () => {
      console.log(
        `  ${colors.cyan}${icons.route}${colors.reset} ${colors.dim}routing${colors.reset} ${colors.green}initialized${colors.reset} ${timestamp()}`,
      );
    },

    websocket: () => {
      console.log(
        `  ${colors.magenta}${icons.websocket}${colors.reset} ${colors.dim}WebSocket${colors.reset} ${colors.green}ready${colors.reset} ${timestamp()}`,
      );
      console.log(
        `    ${colors.gray}└─ Listening for real-time events${colors.reset}`,
      );
    },

    ready: () => {
      console.log("");
      console.log(
        `${colors.bright}${colors.green}╭────────────────────────────────────────╮${colors.reset}`,
      );
      console.log(
        boxLine(
          `${icons.check}  CIPHER READY  ${icons.check}`,
          colors.bright + colors.green,
        ),
      );
      console.log(
        boxLine(
          `${icons.sparkles} Running on port ${port} ${icons.sparkles}`,
          colors.green,
        ),
      );
      console.log(
        `${colors.green}╰────────────────────────────────────────╯${colors.reset}`,
      );
      console.log("");
      console.log(`  ${colors.dim}→ http://localhost:${port}${colors.reset}`);
      console.log(
        `  ${colors.dim}→ WebSocket: ws://localhost:${port}${colors.reset}`,
      );
      console.log("");
      console.log(
        `  ${colors.dim}v${VERSION}${colors.reset} ${colors.gray}•${colors.reset} ${colors.dim}ready for connections${colors.reset}`,
      );
      console.log("");
    },
  };

  messages[step]?.();
};

export const logError = (error) => {
  console.log(
    `  ${colors.bright}${colors.yellow}⚠️${colors.reset} ${colors.yellow}${error}${colors.reset}`,
  );
};

export const logSuccess = (message) => {
  console.log(`  ${colors.green}✓${colors.reset} ${message}`);
};

export const logInfo = (message) => {
  console.log(
    `  ${colors.cyan}ℹ${colors.reset} ${colors.dim}${message}${colors.reset}`,
  );
};
export const logDbOperation = (message) =>
  console.log(
    `${colors.blue}${icons.database}${colors.reset} ${colors.dim}MongoDB${colors.reset} ${colors.green}${message}${colors.reset} ${timestamp()}`,
  );

export const getVersion = () => VERSION;
