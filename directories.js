import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const UPLOAD_DIR = join(__dirname, 'uploads');

// Ensure upload directory exists
await fs.mkdir(UPLOAD_DIR, { recursive: true });

export {
    __filename,
    __dirname,
    UPLOAD_DIR
}