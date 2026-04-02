import pkg from 'electron-updater';
const { autoUpdater } = pkg;
import { app } from 'electron';
import { logInfo, logError } from './logger.js';

/**
 * Compare two semver strings. Returns:
 *  1  if a > b
 *  0  if a == b
 * -1  if a < b
 */
function compareSemver(a, b) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) > (pb[i] || 0)) return 1;
    if ((pa[i] || 0) < (pb[i] || 0)) return -1;
  }
  return 0;
}

export function initAutoUpdater(mainWindow) {
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = false; // Don't auto-install — prevent downgrades

  autoUpdater.on('checking-for-update', () => {
    logInfo('Updater', 'Checking for updates...');
  });

  autoUpdater.on('update-available', (info) => {
    const currentVersion = app.getVersion();
    const remoteVersion = info.version;

    // Guard: NEVER downgrade
    if (compareSemver(remoteVersion, currentVersion) <= 0) {
      logInfo('Updater', `Ignoring update v${remoteVersion} — current v${currentVersion} is same or newer`);
      return;
    }

    logInfo('Updater', `Genuine update available: v${remoteVersion} (current: v${currentVersion})`);
    mainWindow?.webContents.send('update-available', {
      version: info.version,
      releaseDate: info.releaseDate,
    });
  });

  autoUpdater.on('update-not-available', () => {
    logInfo('Updater', 'App is up to date');
  });

  autoUpdater.on('download-progress', (progress) => {
    mainWindow?.webContents.send('update-progress', {
      percent: Math.round(progress.percent),
      transferred: progress.transferred,
      total: progress.total,
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    logInfo('Updater', `Update downloaded: v${info.version}`);
    mainWindow?.webContents.send('update-downloaded', {
      version: info.version,
    });
  });

  autoUpdater.on('error', (err) => {
    logError('Updater', err);
  });

  // Check for updates 15 seconds after launch
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch(err => {
      logError('Updater', err);
    });
  }, 15000);
}

export function downloadUpdate() {
  autoUpdater.downloadUpdate().catch(err => logError('Updater', err));
}

export function installUpdate() {
  autoUpdater.quitAndInstall(false, true);
}
