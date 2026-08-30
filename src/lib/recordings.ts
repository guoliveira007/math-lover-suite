/**
 * Armazenamento local das gravações das aulas (duas câmeras por aula).
 * Os arquivos ficam no IndexedDB do navegador; links externos ficam como texto.
 */

export type Cam = "cam1" | "cam2";
export type Source = { kind: "file"; blob: Blob; name: string } | { kind: "url"; url: string };
export type LessonRecordings = Partial<Record<Cam, Source>>;

const DB_NAME = "aulas-gravacoes";
const STORE = "recordings";
export const MATERIALS_STORE = "materials";

export function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 2);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
      if (!req.result.objectStoreNames.contains(MATERIALS_STORE))
        req.result.createObjectStore(MATERIALS_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>) {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const store = db.transaction(STORE, mode).objectStore(STORE);
    const req = fn(store);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getRecordings(lessonId: string): Promise<LessonRecordings> {
  try {
    return (await tx<LessonRecordings>("readonly", (s) => s.get(lessonId))) ?? {};
  } catch {
    return {};
  }
}

export async function getAllRecordingIds(): Promise<string[]> {
  try {
    const keys = await tx<IDBValidKey[]>("readonly", (s) => s.getAllKeys());
    return keys.map(String);
  } catch {
    return [];
  }
}

export async function setRecording(lessonId: string, cam: Cam, source: Source | null) {
  const current = await getRecordings(lessonId);
  const next: LessonRecordings = { ...current };
  if (source) next[cam] = source;
  else delete next[cam];
  if (Object.keys(next).length === 0) {
    await tx("readwrite", (s) => s.delete(lessonId));
  } else {
    await tx("readwrite", (s) => s.put(next, lessonId));
  }
  return next;
}

export function sourceUrl(source: Source) {
  return source.kind === "url" ? source.url : URL.createObjectURL(source.blob);
}
