/* -------------------------------------------------------------------------- *
 * Quick Input · Storage helpers
 * -------------------------------------------------------------------------- */

import { getDomConstructor, getGlobalScope, getLocalStorage } from "../shared/platform/browser.js";
import { gmGetValue, gmSetValue, hasUserscriptApi } from "../shared/platform/userscript.js";

function safeStoreGet(key, fallback) {
            const k = String(key ?? "").trim();
            if (!k) return fallback;
            if (hasUserscriptApi("GM_getValue")) {
                return gmGetValue(k, fallback);
            }
            try {
                const raw = getLocalStorage()?.getItem?.(k);
                if (raw == null) return fallback;
                return JSON.parse(raw);
            } catch {}
            return fallback;
        }

        function safeStoreSet(key, value) {
            const k = String(key ?? "").trim();
            if (!k) return;
            if (hasUserscriptApi("GM_setValue")) {
                gmSetValue(k, value);
                return;
            }
            try {
                getLocalStorage()?.setItem?.(k, JSON.stringify(value));
            } catch {}
        }

        function safeLocalStorageGet(key, fallback) {
            const k = String(key ?? "").trim();
            if (!k) return fallback;
            try {
                const raw = getLocalStorage()?.getItem?.(k);
                if (raw == null) return fallback;
                return JSON.parse(raw);
            } catch {}
            return fallback;
        }

        function safeLocalStorageSet(key, value) {
            const k = String(key ?? "").trim();
            if (!k) return false;
            try {
                getLocalStorage()?.setItem?.(k, JSON.stringify(value));
                return true;
            } catch {}
            return false;
        }

        function safeLocalStorageRemove(key) {
            const k = String(key ?? "").trim();
            if (!k) return false;
            try {
                getLocalStorage()?.removeItem?.(k);
                return true;
            } catch {}
            return false;
        }

        const QUICK_INPUT_DRAFT_STORAGE_VERSION = 1;
        const QUICK_INPUT_DRAFT_DB_NAME = "template_shortcuts_quick_input_drafts";
        const QUICK_INPUT_DRAFT_DB_VERSION = 1;
        const QUICK_INPUT_DRAFT_STORE_NAME = "drafts";
        let draftDbPromise = null;

        function getDraftStorageKey(storageKey) {
            const base = String(storageKey ?? "").trim() || "quick_input";
            return `${base}__draft_local_v${QUICK_INPUT_DRAFT_STORAGE_VERSION}`;
        }

        function getIndexedDbApi() {
            const scope = getGlobalScope();
            return scope?.indexedDB || scope?.window?.indexedDB || null;
        }

        function requestToPromise(request) {
            return new Promise((resolve, reject) => {
                if (!request) {
                    resolve(null);
                    return;
                }
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error || new Error("IndexedDB request failed"));
            });
        }

        function transactionToPromise(transaction) {
            return new Promise((resolve, reject) => {
                if (!transaction) {
                    resolve();
                    return;
                }
                transaction.oncomplete = () => resolve();
                transaction.onerror = () => reject(transaction.error || new Error("IndexedDB transaction failed"));
                transaction.onabort = () => reject(transaction.error || new Error("IndexedDB transaction aborted"));
            });
        }

        function openDraftDatabase() {
            if (draftDbPromise) return draftDbPromise;

            const indexedDb = getIndexedDbApi();
            if (!indexedDb || typeof indexedDb.open !== "function") {
                draftDbPromise = Promise.resolve(null);
                return draftDbPromise;
            }

            draftDbPromise = new Promise((resolve) => {
                let settled = false;

                const finish = (db) => {
                    if (settled) return;
                    settled = true;
                    resolve(db || null);
                };

                try {
                    const request = indexedDb.open(QUICK_INPUT_DRAFT_DB_NAME, QUICK_INPUT_DRAFT_DB_VERSION);
                    request.onupgradeneeded = () => {
                        const db = request.result;
                        if (!db?.objectStoreNames?.contains?.(QUICK_INPUT_DRAFT_STORE_NAME)) {
                            db.createObjectStore(QUICK_INPUT_DRAFT_STORE_NAME);
                        }
                    };
                    request.onsuccess = () => {
                        const db = request.result;
                        try {
                            db.onclose = () => {
                                draftDbPromise = null;
                            };
                            db.onversionchange = () => {
                                try { db.close(); } catch {}
                                draftDbPromise = null;
                            };
                        } catch {}
                        finish(db);
                    };
                    request.onerror = () => {
                        draftDbPromise = null;
                        finish(null);
                    };
                    request.onblocked = () => {
                        draftDbPromise = null;
                        finish(null);
                    };
                } catch {
                    draftDbPromise = null;
                    finish(null);
                }
            });

            return draftDbPromise;
        }

        async function loadDraftFromIndexedDb(draftStorageKey) {
            const db = await openDraftDatabase();
            if (!db) return null;

            try {
                const tx = db.transaction(QUICK_INPUT_DRAFT_STORE_NAME, "readonly");
                const store = tx.objectStore(QUICK_INPUT_DRAFT_STORE_NAME);
                const result = await requestToPromise(store.get(draftStorageKey));
                await transactionToPromise(tx);
                return result && typeof result === "object" ? result : null;
            } catch {
                return null;
            }
        }

        async function saveDraftToIndexedDb(draftStorageKey, payload) {
            const db = await openDraftDatabase();
            if (!db) return false;

            try {
                const tx = db.transaction(QUICK_INPUT_DRAFT_STORE_NAME, "readwrite");
                tx.objectStore(QUICK_INPUT_DRAFT_STORE_NAME).put(payload, draftStorageKey);
                await transactionToPromise(tx);
                return true;
            } catch {
                return false;
            }
        }

        async function removeDraftFromIndexedDb(draftStorageKey) {
            const db = await openDraftDatabase();
            if (!db) return false;

            try {
                const tx = db.transaction(QUICK_INPUT_DRAFT_STORE_NAME, "readwrite");
                tx.objectStore(QUICK_INPUT_DRAFT_STORE_NAME).delete(draftStorageKey);
                await transactionToPromise(tx);
                return true;
            } catch {
                return false;
            }
        }

        function inferMimeTypeFromDataUrl(dataUrl) {
            const match = String(dataUrl ?? "").match(/^data:([^;,]+)/i);
            return match ? String(match[1] || "").trim().toLowerCase() : "";
        }

        function inferImageExtension(mime) {
            const token = String(mime ?? "").trim().toLowerCase();
            switch (token) {
                case "image/jpeg": return "jpg";
                case "image/png": return "png";
                case "image/webp": return "webp";
                case "image/gif": return "gif";
                case "image/bmp": return "bmp";
                case "image/svg+xml": return "svg";
                case "image/avif": return "avif";
                default: {
                    const tail = token.split("/").pop();
                    return tail ? (tail.replace(/[^a-z0-9]+/gi, "") || "png") : "png";
                }
            }
        }

        function splitImageFileName(name) {
            const raw = String(name ?? "").trim().replace(/[\\/]+/g, "_");
            if (!raw) return { stem: "", ext: "" };
            const dotIndex = raw.lastIndexOf(".");
            if (dotIndex <= 0) return { stem: raw, ext: "" };
            return { stem: raw.slice(0, dotIndex) || raw, ext: raw.slice(dotIndex) };
        }

        function buildDefaultQuickInputImageName(index = 0, type = "") {
            const ext = inferImageExtension(type);
            return `quick-input-image-${Math.max(0, Number(index) || 0) + 1}${ext ? `.${ext}` : ""}`;
        }

        function claimUniqueImageName(rawName, usedNames, index = 0, { type = "" } = {}) {
            const registry = usedNames instanceof Set ? usedNames : new Set();
            const fallbackName = buildDefaultQuickInputImageName(index, type);
            const preferred = String(rawName ?? "").trim().replace(/[\\/]+/g, "_") || fallbackName;
            const preferredKey = preferred.toLowerCase();
            if (!registry.has(preferredKey)) {
                registry.add(preferredKey);
                return preferred;
            }

            const { stem, ext } = splitImageFileName(preferred);
            const fallbackParts = splitImageFileName(fallbackName);
            const nextStem = stem || fallbackParts.stem || "quick-input-image";
            const nextExt = ext || fallbackParts.ext;

            let counter = 2;
            while (true) {
                const candidate = `${nextStem} (${counter})${nextExt}`;
                const key = candidate.toLowerCase();
                if (!registry.has(key)) {
                    registry.add(key);
                    return candidate;
                }
                counter += 1;
            }
        }

        function renameImageFile(file, nextName) {
            const FileCtor = getDomConstructor("File");
            if (!FileCtor || !(file instanceof FileCtor)) return null;
            const targetName = String(nextName ?? "").trim() || buildDefaultQuickInputImageName(0, file.type);
            if (String(file.name || "") === targetName) return file;

            const lastModifiedRaw = Number(file.lastModified);
            const lastModified = Number.isFinite(lastModifiedRaw) ? lastModifiedRaw : Date.now();
            try {
                return new FileCtor([file], targetName, {
                    type: String(file.type || "").trim(),
                    lastModified
                });
            } catch {
                return file;
            }
        }

        function normalizeImageFiles(value) {
            const FileCtor = getDomConstructor("File");
            if (!FileCtor) return [];
            const usedNames = new Set();
            return Array.from(value || [])
                .filter(file => file && (file instanceof FileCtor) && String(file.type || "").startsWith("image/"))
                .map((file, index) => {
                    const uniqueName = claimUniqueImageName(file.name, usedNames, index, { type: file.type });
                    return renameImageFile(file, uniqueName);
                })
                .filter(Boolean);
        }

        function normalizeDraftImageEntry(value, index = 0) {
            if (!value || typeof value !== "object" || Array.isArray(value)) return null;
            const dataUrl = String(value.dataUrl || value.dataURL || "").trim();
            if (!/^data:image\//i.test(dataUrl)) return null;

            const type = String(value.type || "").trim().toLowerCase() || inferMimeTypeFromDataUrl(dataUrl) || "image/png";
            const ext = inferImageExtension(type);
            const name = String(value.name || "").trim() || `quick-input-image-${index + 1}.${ext}`;
            const size = Math.max(0, Number(value.size) || 0);
            const lastModifiedRaw = Number(value.lastModified);
            const lastModified = Number.isFinite(lastModifiedRaw) ? lastModifiedRaw : Date.now();

            return { name, type, size, lastModified, dataUrl };
        }

        function normalizeDraftImages(value) {
            if (!Array.isArray(value)) return [];
            const usedNames = new Set();
            return value
                .map((entry, index) => normalizeDraftImageEntry(entry, index))
                .filter(Boolean)
                .map((entry, index) => {
                    const uniqueName = claimUniqueImageName(entry.name, usedNames, index, { type: entry.type });
                    return uniqueName === entry.name ? entry : { ...entry, name: uniqueName };
                });
        }

        async function loadDraft(draftStorageKey) {
            let raw = await loadDraftFromIndexedDb(draftStorageKey);
            let fromLegacyLocalStorage = false;

            if (!raw || typeof raw !== "object") {
                raw = safeLocalStorageGet(draftStorageKey, null);
                fromLegacyLocalStorage = !!(raw && typeof raw === "object");
            }

            const stored = raw && typeof raw === "object" ? raw : {};
            const normalized = {
                text: typeof stored.text === "string" ? stored.text : String(stored.text ?? ""),
                images: normalizeDraftImages(stored.images)
            };

            if (fromLegacyLocalStorage && (normalized.text || normalized.images.length > 0)) {
                const migrated = await saveDraftToIndexedDb(draftStorageKey, {
                    version: QUICK_INPUT_DRAFT_STORAGE_VERSION,
                    text: normalized.text,
                    images: normalized.images,
                    savedAt: Number(stored.savedAt) || Date.now()
                });
                if (migrated) safeLocalStorageRemove(draftStorageKey);
            }

            return normalized;
        }

        async function saveDraft(draftStorageKey, draft) {
            const text = typeof draft?.text === "string" ? draft.text : String(draft?.text ?? "");
            const images = normalizeDraftImages(draft?.images);

            if (!text && images.length === 0) {
                await removeDraftFromIndexedDb(draftStorageKey);
                safeLocalStorageRemove(draftStorageKey);
                return { ok: true, storedImages: [], truncated: false };
            }

            const payload = {
                version: QUICK_INPUT_DRAFT_STORAGE_VERSION,
                text,
                images,
                savedAt: Date.now()
            };

            if (await saveDraftToIndexedDb(draftStorageKey, payload)) {
                safeLocalStorageRemove(draftStorageKey);
                return { ok: true, storedImages: images, truncated: false };
            }

            for (let count = images.length; count >= 0; count--) {
                const storedImages = images.slice(0, count);
                const fallbackPayload = {
                    version: QUICK_INPUT_DRAFT_STORAGE_VERSION,
                    text,
                    images: storedImages,
                    savedAt: Date.now()
                };
                if (safeLocalStorageSet(draftStorageKey, fallbackPayload)) {
                    return { ok: true, storedImages, truncated: storedImages.length !== images.length };
                }
            }

            safeLocalStorageRemove(draftStorageKey);
            return { ok: false, storedImages: [], truncated: images.length > 0 };
        }

        function readFileAsDataUrl(file) {
            return new Promise((resolve, reject) => {
                const BlobCtor = getDomConstructor("Blob");
                const FileReaderCtor = getDomConstructor("FileReader");
                if (!BlobCtor || !FileReaderCtor || !(file instanceof BlobCtor)) {
                    reject(new Error("Invalid image file"));
                    return;
                }

                const reader = new FileReaderCtor();
                reader.onload = () => resolve(String(reader.result || ""));
                reader.onerror = () => reject(reader.error || new Error("Failed to read image file"));

                try {
                    reader.readAsDataURL(file);
                } catch (error) {
                    reject(error);
                }
            });
        }

        function dataUrlToFile(dataUrl, meta = {}) {
            const value = String(dataUrl || "").trim();
            if (!value.startsWith("data:")) return null;

            const commaIndex = value.indexOf(",");
            if (commaIndex < 0) return null;

            const metaPart = value.slice(5, commaIndex);
            const payload = value.slice(commaIndex + 1);
            const mime = String(meta.type || "").trim() || inferMimeTypeFromDataUrl(value) || "image/png";
            const name = String(meta.name || "").trim() || `quick-input-image.${inferImageExtension(mime)}`;
            const lastModifiedRaw = Number(meta.lastModified);
            const lastModified = Number.isFinite(lastModifiedRaw) ? lastModifiedRaw : Date.now();
            const FileCtor = getDomConstructor("File");
            const TextEncoderCtor = getDomConstructor("TextEncoder");
            const scope = getGlobalScope();

            try {
                let bytes;
                if (/(?:^|;)base64(?:;|$)/i.test(metaPart)) {
                    const binary = typeof scope?.atob === "function" ? scope.atob(payload) : atob(payload);
                    bytes = new Uint8Array(binary.length);
                    for (let i = 0; i < binary.length; i++) {
                        bytes[i] = binary.charCodeAt(i);
                    }
                } else {
                    const decoded = decodeURIComponent(payload);
                    const encoder = TextEncoderCtor ? new TextEncoderCtor() : new TextEncoder();
                    bytes = encoder.encode(decoded);
                }
                if (!FileCtor) return null;
                return new FileCtor([bytes], name, { type: mime, lastModified });
            } catch {
                return null;
            }
        }

export {
    safeStoreGet,
    safeStoreSet,
    safeLocalStorageGet,
    safeLocalStorageSet,
    safeLocalStorageRemove,
    getDraftStorageKey,
    inferMimeTypeFromDataUrl,
    inferImageExtension,
    splitImageFileName,
    buildDefaultQuickInputImageName,
    claimUniqueImageName,
    renameImageFile,
    normalizeImageFiles,
    normalizeDraftImageEntry,
    normalizeDraftImages,
    loadDraft,
    saveDraft,
    readFileAsDataUrl,
    dataUrlToFile
};
