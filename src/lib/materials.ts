/**
 * PDFs (materiais) de cada aula, guardados no IndexedDB do navegador.
 */
import { MATERIALS_STORE, openDb } from "./recordings";

export type Material = { id: string; name: string; blob: Blob; addedAt: number };

async function tx<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>) {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const store = db.transaction(MATERIALS_STORE, mode).objectStore(MATERIALS_STORE);
    const req = fn(store);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getMaterials(lessonId: string): Promise<Material[]> {
  try {
    return (await tx<Material[]>("readonly", (s) => s.get(lessonId))) ?? [];
  } catch {
    return [];
  }
}

export async function getAllMaterialIds(): Promise<string[]> {
  try {
    const keys = await tx<IDBValidKey[]>("readonly", (s) => s.getAllKeys());
    return keys.map(String);
  } catch {
    return [];
  }
}

export async function addMaterials(lessonId: string, files: File[]) {
  const current = await getMaterials(lessonId);
  const next = [
    ...current,
    ...files.map((f) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: f.name,
      blob: f as Blob,
      addedAt: Date.now(),
    })),
  ];
  await tx("readwrite", (s) => s.put(next, lessonId));
  return next;
}

export async function removeMaterial(lessonId: string, materialId: string) {
  const next = (await getMaterials(lessonId)).filter((m) => m.id !== materialId);
  if (next.length === 0) await tx("readwrite", (s) => s.delete(lessonId));
  else await tx("readwrite", (s) => s.put(next, lessonId));
  return next;
}
