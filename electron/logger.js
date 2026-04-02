import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import isDev from 'electron-is-dev';

function getLogDir() {
  return isDev
    ? path.join(process.cwd(), 'logs')
    : path.join(app.getPath('userData'), 'logs');
}

const MAX_LOG_SIZE = 1024 * 1024; // 1MB

function ensureLogDir() {
  const dir = getLogDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function getLogPath() {
  return path.join(getLogDir(), 'error.log');
}

function rotateIfNeeded() {
  const logPath = getLogPath();
  if (fs.existsSync(logPath)) {
    const stats = fs.statSync(logPath);
    if (stats.size > MAX_LOG_SIZE) {
      const archivePath = path.join(getLogDir(), `error-${Date.now()}.log.old`);
      fs.renameSync(logPath, archivePath);
      // Keep only the 3 most recent archives
      const oldFiles = fs.readdirSync(getLogDir())
        .filter(f => f.endsWith('.log.old'))
        .sort()
        .reverse();
      oldFiles.slice(3).forEach(f => {
        try { fs.unlinkSync(path.join(getLogDir(), f)); } catch {}
      });
    }
  }
}

export function logError(context, error) {
  try {
    ensureLogDir();
    rotateIfNeeded();
    const timestamp = new Date().toISOString();
    const message = error instanceof Error ? error.stack : String(error);
    const entry = `[${timestamp}] [${context}] ${message}\n`;
    fs.appendFileSync(getLogPath(), entry);
  } catch {
    // silent fail — logging should never crash the app
  }
}

export function logInfo(context, message) {
  if (isDev) console.log(`[${context}]`, message);
  try {
    ensureLogDir();
    const timestamp = new Date().toISOString();
    const entry = `[${timestamp}] [INFO] [${context}] ${message}\n`;
    fs.appendFileSync(getLogPath(), entry);
  } catch {}
}

export function getRecentLogs(lines = 50) {
  try {
    const logPath = getLogPath();
    if (!fs.existsSync(logPath)) return [];
    const content = fs.readFileSync(logPath, 'utf-8');
    return content.split('\n').filter(Boolean).slice(-lines).reverse();
  } catch {
    return [];
  }
}

export function getLogPath_() {
  return getLogPath();
}
