import dotenv from "dotenv";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { logStart, logEnvironment } from "./startup.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const nodeEnv = process.env.NODE_ENV?.trim().toLowerCase() ?? "development";
const isDevEnvironment = nodeEnv === "development";
const envFile = isDevEnvironment ? ".env.dev" : ".env";

dotenv.config({ path: join(__dirname, envFile) });

logStart("init");
logEnvironment(nodeEnv);

export { nodeEnv, isDevEnvironment };
