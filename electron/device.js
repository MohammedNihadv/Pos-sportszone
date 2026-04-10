import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { machineIdSync } = require('node-machine-id');
import os from 'os';

let deviceId = null;

export function getDeviceId() {
  if (deviceId) return deviceId;
  try {
    deviceId = machineIdSync();
  } catch (error) {
    console.error("Failed to generate machine ID:", error);
    deviceId = "unknown-" + os.hostname() + "-" + Math.random().toString(36).substring(7);
  }
  return deviceId;
}

export function getHostname() {
  return os.hostname();
}
