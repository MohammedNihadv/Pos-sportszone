import fs from 'fs';
import path from 'path';
import { app, dialog, shell } from 'electron';
import isDev from 'electron-is-dev';
import { logInfo, logError } from './logger.js';
import { closeDb } from './db.js';

function getBackupDirs() {
  if (isDev) {
    return [path.join(process.cwd(), 'backups')];
  }
  return [
    path.join(app.getPath('documents'), 'SportsZone', 'Backups'),
    path.join(app.getPath('userData'), 'backups')
  ];
}

function getPrimaryBackupDir() {
  return getBackupDirs()[0]; // The first one is the "visible" one (Documents)
}

function getDbPath() {
  return isDev
    ? path.join(process.cwd(), 'shop.db')
    : path.join(app.getPath('userData'), 'shop.db');
}

function ensureBackupDirs() {
  getBackupDirs().forEach(dir => {
    if (!fs.existsSync(dir)) {
      try { fs.mkdirSync(dir, { recursive: true }); } catch (e) { logError('Backup', e); }
    }
  });
}

export function createBackup() {
  try {
    ensureBackupDirs();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `shop-backup-${timestamp}.db`;
    const dbPath = getDbPath();

    if (!fs.existsSync(dbPath)) {
      throw new Error("Active database not found.");
    }

    const successfulPaths = [];

    // Copy to all backup locations (Documents and AppData)
    getBackupDirs().forEach(dir => {
      try {
        const backupPath = path.join(dir, backupName);
        fs.copyFileSync(dbPath, backupPath);
        successfulPaths.push(backupPath);
        
        // Prune old backups per directory
        const files = fs.readdirSync(dir)
          .filter(f => f.startsWith('shop-backup-') && f.endsWith('.db'))
          .map(f => ({ name: f, path: path.join(dir, f), time: fs.statSync(path.join(dir, f)).mtime.getTime() }))
          .sort((a, b) => b.time - a.time);

        if (files.length > 10) {
          files.slice(10).forEach(file => {
            try { fs.unlinkSync(file.path); } catch (e) {}
          });
        }
      } catch (err) {
        logError('Backup Copy', err);
      }
    });

    if (successfulPaths.length === 0) throw new Error("Could not save backup to any directory.");

    logInfo('Backup', `Created dual-backup: ${backupName}`);
    // Return primary path for the frontend
    return { success: true, name: backupName, path: successfulPaths[0] };
  } catch (err) {
    logError('Backup', err);
    return { success: false, error: err.message };
  }
}

// Open Documents backup folder
export function openBackupFolder() {
  try {
    ensureBackupDirs();
    const targetDir = getPrimaryBackupDir();
    shell.openPath(targetDir);
    return { success: true };
  } catch (err) {
    logError('Backup', err);
    return { success: false, error: err.message };
  }
}

// New logic: Use Native Dialog to pick a backup file
export async function restoreFromCustomFile() {
  try {
    const primaryDir = getPrimaryBackupDir();
    
    const result = await dialog.showOpenDialog({
      title: 'Select Backup Database to Restore',
      defaultPath: primaryDir,
      buttonLabel: 'Restore Database',
      properties: ['openFile'],
      filters: [{ name: 'Database Files', extensions: ['db', 'sqlite'] }]
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, canceled: true };
    }

    const selectedFile = result.filePaths[0];

    // Trigger restore
    return restoreBackup(selectedFile);
  } catch (err) {
    logError('Backup Restore', err);
    return { success: false, error: err.message };
  }
}

// Core restore function (can take specific path)
export function restoreBackup(backupPath) {
  try {
    if (!fs.existsSync(backupPath)) {
      return { success: false, error: 'Backup file not found' };
    }
    
    ensureBackupDirs();

    // Create a safety backup of CURRENT state before overwriting
    const safetyName = `shop-pre-restore-safety-${Date.now()}.db`;
    getBackupDirs().forEach(dir => {
      try { fs.copyFileSync(getDbPath(), path.join(dir, safetyName)); } catch(e){}
    });
    
    // Crucial: Release SQLite lock on Windows before overwriting
    closeDb();

    // Replace current DB with the chosen backup
    fs.copyFileSync(backupPath, getDbPath());
    
    logInfo('Backup', `Restored from custom file: ${path.basename(backupPath)}`);
    return { success: true, safetyBackup: safetyName };
  } catch (err) {
    logError('Backup', err);
    return { success: false, error: err.message };
  }
}

export function getBackups() {
  try {
    ensureBackupDirs();
    const primaryDir = getPrimaryBackupDir();
    
    const files = fs.readdirSync(primaryDir)
      .filter(f => f.startsWith('shop-backup-') && f.endsWith('.db'))
      .map(f => {
        const fullPath = path.join(primaryDir, f);
        const stats = fs.statSync(fullPath);
        return {
          name: f,
          path: fullPath,
          size: (stats.size / 1024).toFixed(1) + ' KB',
          sizeBytes: stats.size,
          date: stats.mtime.toISOString(),
        };
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date));
    return files;
  } catch (err) {
    logError('Backup', err);
    return [];
  }
}

export function autoBackup() {
  try {
    ensureBackupDirs();
    const lastBackup = getLastBackupTime();
    const now = Date.now();
    const ONE_DAY = 24 * 60 * 60 * 1000;
    
    if (!lastBackup || (now - lastBackup) > ONE_DAY) {
      const result = createBackup();
      if (result.success) {
        setLastBackupTime(now);
        logInfo('AutoBackup', 'Daily automatic dual-backup completed');
      }
      return result;
    }
    return { success: true, skipped: true };
  } catch (err) {
    logError('AutoBackup', err);
    return { success: false, error: err.message };
  }
}

function getLastBackupTime() {
  try {
    const metaPath = path.join(getPrimaryBackupDir(), '.lastbackup');
    const stored = fs.readFileSync(metaPath, 'utf-8');
    return parseInt(stored, 10);
  } catch {
    return null;
  }
}

function setLastBackupTime(time) {
  try {
    const metaPath = path.join(getPrimaryBackupDir(), '.lastbackup');
    fs.writeFileSync(metaPath, String(time));
    // Also save in secondary just in case
    if (!isDev) {
      try { fs.writeFileSync(path.join(getBackupDirs()[1], '.lastbackup'), String(time)); } catch(e){}
    }
  } catch {}
}
