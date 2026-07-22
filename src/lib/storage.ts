/**
 * Storage durability.
 *
 * By default browsers treat IndexedDB as "best effort" and may evict it under
 * storage pressure. For a health app holding months of cycle history that is
 * unacceptable, so we ask for *persistent* storage, which exempts the origin
 * from automatic eviction (the user can still clear it deliberately).
 */

export interface StorageStatus {
  /** Browser guarantees the data will not be auto-evicted. */
  persisted: boolean;
  /** Whether the Storage API is available at all. */
  supported: boolean;
  /** Bytes currently used by this origin, when the browser reports it. */
  usage: number | null;
}

/** Ask the browser to make this origin's storage persistent. Idempotent. */
export async function requestPersistentStorage(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.storage?.persist) return false;
  try {
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

export async function getStorageStatus(): Promise<StorageStatus> {
  if (typeof navigator === 'undefined' || !navigator.storage?.persisted) {
    return { persisted: false, supported: false, usage: null };
  }
  try {
    const persisted = await navigator.storage.persisted();
    let usage: number | null = null;
    if (navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      usage = estimate.usage ?? null;
    }
    return { persisted, supported: true, usage };
  } catch {
    return { persisted: false, supported: true, usage: null };
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
