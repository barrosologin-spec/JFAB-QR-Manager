/**
 * Desenvolvido por José Felipe A. Barroso (pixdobarroso@gmail.com)
 */

import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'jfab-settings';
const STORE_NAME = 'audio-assets';

export type SoundType = 'success' | 'duplicate' | 'error';

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      },
    });
  }
  return dbPromise;
}

export async function saveSound(type: SoundType, blob: Blob) {
  const db = await getDB();
  await db.put(STORE_NAME, blob, type);
}

export async function getSound(type: SoundType): Promise<Blob | null> {
  const db = await getDB();
  return await db.get(STORE_NAME, type);
}

export async function playSound(type: SoundType, fallback?: string) {
  try {
    const blob = await getSound(type);
    if (blob) {
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      await audio.play();
      // Clean up URL after play starts
      audio.onended = () => URL.revokeObjectURL(url);
    } else if (fallback) {
      const audio = new Audio(fallback);
      await audio.play();
    }
  } catch (error) {
    console.error(`Failed to play sound ${type}:`, error);
  }
}
