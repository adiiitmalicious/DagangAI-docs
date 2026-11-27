import dns from 'node:dns';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

// Menghindari timeout IPv6 fetch di Node.js pada Windows
dns.setDefaultResultOrder('ipv4first');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Dari apps/api/src/lib -> ../../../.. = root monorepo (DagangAI/.env)
const rootEnvPath = path.resolve(__dirname, '../../../../.env');
// Dari apps/api/src/lib -> ../.. = folder backend (DagangAI/apps/api/.env)
const apiEnvPath = path.resolve(__dirname, '../../.env');

dotenv.config({ path: rootEnvPath });
dotenv.config({ path: apiEnvPath, override: true });
