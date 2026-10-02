import { createApp } from './app.js';
import { env } from './config/env.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', env.UPLOAD_DIR);
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const app = createApp();

const server = app.listen(env.PORT, () => {
  console.log(`=========================================`);
  console.log(`🚀 BSMS Server running on port ${env.PORT}`);
  console.log(`🌐 Health endpoint: http://localhost:${env.PORT}/api/health`);
  console.log(`🔧 Environment:     ${env.NODE_ENV}`);
  console.log(`=========================================`);
});

// Graceful shutdown handling
const handleShutdown = (signal: string) => {
  console.log(`\n🛑 Received ${signal}. Shutting down server gracefully...`);
  server.close(() => {
    console.log('✅ HTTP server closed.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));
