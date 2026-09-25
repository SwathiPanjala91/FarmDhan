import { Platform } from 'react-native';

// Safe persistent storage across Web and Native Android/iOS
// Uses expo-file-system on Native, and localStorage on Web.
let FileSystem = null;
try {
  FileSystem = require('expo-file-system');
} catch (e) {
  FileSystem = null;
}

const SETTINGS_FILE_NAME = 'farmdhan_settings.json';
let inMemoryFallback = {};

const getFilePath = () => {
  if (FileSystem && FileSystem.documentDirectory) {
    return `${FileSystem.documentDirectory}${SETTINGS_FILE_NAME}`;
  }
  return null;
};

export const storage = {
  /**
   * Save a key-value setting persistently
   */
  async setItem(key, value) {
    try {
      const stringVal = typeof value === 'string' ? value : JSON.stringify(value);

      // Web
      if (Platform.OS === 'web' || typeof window !== 'undefined') {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(key, stringVal);
          return;
        }
      }

      // Native via expo-file-system
      const filePath = getFilePath();
      if (filePath) {
        let currentData = {};
        try {
          const info = await FileSystem.getInfoAsync(filePath);
          if (info.exists) {
            const raw = await FileSystem.readAsStringAsync(filePath);
            currentData = JSON.parse(raw) || {};
          }
        } catch {
          currentData = {};
        }

        currentData[key] = stringVal;
        await FileSystem.writeAsStringAsync(filePath, JSON.stringify(currentData));
        return;
      }

      // Fallback
      inMemoryFallback[key] = stringVal;
    } catch (err) {
      console.warn('[Storage] Failed to save key:', key, err);
      inMemoryFallback[key] = value;
    }
  },

  /**
   * Get a key-value setting persistently
   */
  async getItem(key) {
    try {
      // Web
      if (Platform.OS === 'web' || typeof window !== 'undefined') {
        if (typeof window !== 'undefined' && window.localStorage) {
          return window.localStorage.getItem(key);
        }
      }

      // Native via expo-file-system
      const filePath = getFilePath();
      if (filePath) {
        try {
          const info = await FileSystem.getInfoAsync(filePath);
          if (info.exists) {
            const raw = await FileSystem.readAsStringAsync(filePath);
            const data = JSON.parse(raw) || {};
            return data[key] !== undefined ? data[key] : null;
          }
        } catch {
          return null;
        }
      }

      // Fallback
      return inMemoryFallback[key] !== undefined ? inMemoryFallback[key] : null;
    } catch (err) {
      console.warn('[Storage] Failed to get key:', key, err);
      return inMemoryFallback[key] !== undefined ? inMemoryFallback[key] : null;
    }
  },

  /**
   * Remove a key-value setting
   */
  async removeItem(key) {
    try {
      if (Platform.OS === 'web' || typeof window !== 'undefined') {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(key);
          return;
        }
      }

      const filePath = getFilePath();
      if (filePath) {
        try {
          const info = await FileSystem.getInfoAsync(filePath);
          if (info.exists) {
            const raw = await FileSystem.readAsStringAsync(filePath);
            const data = JSON.parse(raw) || {};
            delete data[key];
            await FileSystem.writeAsStringAsync(filePath, JSON.stringify(data));
          }
        } catch {
          // ignore
        }
      }

      delete inMemoryFallback[key];
    } catch (err) {
      console.warn('[Storage] Failed to remove key:', key, err);
    }
  },
};
