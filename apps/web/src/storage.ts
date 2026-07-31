/**
 * Where a dynasty lives between sessions.
 *
 * `localStorage` cannot hold this game. It caps around 5 MB, it stores *strings*
 * — so a 2.9 MB gzipped save has to be base64'd to 3.9 MB before it even gets
 * there — and it is synchronous on the main thread. A twenty-year save would
 * exceed the quota outright.
 *
 * The Origin Private File System is the right layer: it stores bytes rather than
 * strings, it has no practical size cap (it negotiates against real disk quota),
 * and `createSyncAccessHandle()` gives synchronous reads and writes *inside a
 * worker* — which is exactly where the simulation already runs, so saving never
 * touches the render thread.
 */

const SAVE_FILE = "career.save";
const SAVE_DIRECTORY = "saves";

export function storageAvailable(): boolean {
  return typeof navigator !== "undefined"
    && typeof navigator.storage?.getDirectory === "function";
}

async function saveDirectory(create: boolean): Promise<FileSystemDirectoryHandle | null> {
  if (!storageAvailable()) return null;
  try {
    const root = await navigator.storage.getDirectory();
    return await root.getDirectoryHandle(SAVE_DIRECTORY, { create });
  } catch {
    return null;
  }
}

/**
 * Writes through a sync access handle when one is available — the worker path,
 * and the fast one — and falls back to a writable stream elsewhere.
 */
export async function writeSave(bytes: Uint8Array<ArrayBuffer>): Promise<boolean> {
  const directory = await saveDirectory(true);
  if (!directory) return false;
  try {
    const file = await directory.getFileHandle(SAVE_FILE, { create: true });
    const sync = (file as FileSystemFileHandle & {
      createSyncAccessHandle?: () => Promise<FileSystemSyncAccessHandle>;
    }).createSyncAccessHandle;
    if (typeof sync === "function") {
      const handle = await sync.call(file);
      try {
        handle.truncate(0);
        handle.write(bytes, { at: 0 });
        handle.flush();
      } finally {
        handle.close();
      }
      return true;
    }
    const writable = await file.createWritable();
    await writable.write(bytes);
    await writable.close();
    return true;
  } catch {
    return false;
  }
}

export async function readSave(): Promise<Uint8Array<ArrayBuffer> | null> {
  const directory = await saveDirectory(false);
  if (!directory) return null;
  try {
    const file = await directory.getFileHandle(SAVE_FILE);
    const blob = await file.getFile();
    if (blob.size === 0) return null;
    return new Uint8Array(await blob.arrayBuffer()) as Uint8Array<ArrayBuffer>;
  } catch {
    return null;
  }
}

export async function deleteSave(): Promise<void> {
  const directory = await saveDirectory(false);
  if (!directory) return;
  try {
    await directory.removeEntry(SAVE_FILE);
  } catch {
    // Nothing saved yet, which is not an error worth surfacing.
  }
}

export async function savedBytes(): Promise<number> {
  const directory = await saveDirectory(false);
  if (!directory) return 0;
  try {
    return (await (await directory.getFileHandle(SAVE_FILE)).getFile()).size;
  } catch {
    return 0;
  }
}
