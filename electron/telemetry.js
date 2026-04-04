import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { machineIdSync } = require('node-machine-id');
import os from 'os';
import { app } from 'electron';
import { supabase } from './supabase.js';

let deviceId = null;

try {
  // Use machineIdSync to get a stable, unique ID for this hardware
  deviceId = machineIdSync();
} catch (error) {
  console.error("Failed to generate machine ID:", error);
  deviceId = "unknown-" + Math.random().toString(36).substring(7);
}

const getDeviceInfo = () => {
  return {
    device_id: deviceId,
    app_version: app.getVersion(),
    device_name: os.hostname(),
    os: os.platform(),
    last_seen: new Date().toISOString()
  };
};

export const syncDeviceTelemetry = async () => {
  try {
    // Check for Force Actions from Developer Dashboard
    const { data: remoteDevice } = await supabase
      .from('device_telemetry')
      .select('force_action')
      .eq('machine_id', deviceId)
      .single();

    if (remoteDevice && remoteDevice.force_action) {
      if (remoteDevice.force_action === 'disable') {
        console.error("🚨 REMOTE KILL SWITCH ACTIVATED 🚨");
        app.exit(0); // Instantly kill the POS
        return;
      }
      if (remoteDevice.force_action === 'update') {
         console.log("Force update requested remotely.");
         // Future: trigger electron-updater
      }
    }

    const deviceInfo = {
      machine_id: deviceId,
      app_version: app.getVersion(),
      hostname: os.hostname(),
      os: os.platform(),
      last_seen: new Date().toISOString()
    };
    
    // Upsert the device row
    const { error } = await supabase
      .from('device_telemetry')
      .upsert(deviceInfo, { onConflict: 'machine_id' });
      
    if (error) {
      console.error("Failed to sync device telemetry to Supabase:", error);
    } else {
      console.log("Telemetry synced successfully.");
    }
  } catch (err) {
    if (err.message && !err.message.includes('Row not found')) {
       console.error("Error during telemetry sync:", err);
    }
  }
};

export const startTelemetryLoop = () => {
  // Sync immediately on startup
  syncDeviceTelemetry();
  
  // And sync every 15 minutes
  setInterval(syncDeviceTelemetry, 15 * 60 * 1000);
};

export const logDeveloperError = async (errorMessage) => {
  try {
    const logData = {
      device_id: deviceId,
      app_version: app.getVersion(),
      error_message: errorMessage ? errorMessage.toString() : 'Unknown Error'
    };
    
    await supabase.from('developer_logs').insert([logData]);
  } catch (err) {
    console.error("Failed to write to developer logs:", err);
  }
};
