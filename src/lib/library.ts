export type LibraryBucket = "favorite" | "later" | "production";

export interface LibraryItem {
  id: string;
  bucket: LibraryBucket;
  kind: "stream" | "clip" | "moment";
  platform: string;
  title: string;
  creator?: string | null;
  category?: string | null;
  url?: string | null;
  thumbnailUrl?: string | null;
  metric?: string | null;
  score?: number | null;
  rights?: "owned" | "authorized" | "editorial" | null;
  createdAt: string;
}

const KEY = "clippedit_library_v1";
const EVENT = "clippedit-library-changed";

function safeParse(raw: string | null): LibraryItem[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function getLibraryItems(): LibraryItem[] {
  if (typeof window === "undefined") return [];
  return safeParse(window.localStorage.getItem(KEY));
}

function write(items: LibraryItem[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function hasLibraryItem(id: string, bucket: LibraryBucket) {
  return getLibraryItems().some((item) => item.id === id && item.bucket === bucket);
}

export function upsertLibraryItem(
  item: Omit<LibraryItem, "bucket" | "createdAt">,
  bucket: LibraryBucket,
  extra?: Partial<Pick<LibraryItem, "rights">>
) {
  const items = getLibraryItems().filter((x) => !(x.id === item.id && x.bucket === bucket));
  items.unshift({ ...item, ...extra, bucket, createdAt: new Date().toISOString() });
  write(items.slice(0, 500));
}

export function removeLibraryItem(id: string, bucket: LibraryBucket) {
  write(getLibraryItems().filter((item) => !(item.id === id && item.bucket === bucket)));
}

export function toggleLibraryItem(
  item: Omit<LibraryItem, "bucket" | "createdAt">,
  bucket: Exclude<LibraryBucket, "production">
) {
  if (hasLibraryItem(item.id, bucket)) removeLibraryItem(item.id, bucket);
  else upsertLibraryItem(item, bucket);
}

export function subscribeLibraryChanged(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}
