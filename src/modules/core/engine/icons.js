import { normalizeSvgCssColorToken } from "../utils/svg.js";

/* -------------------------------------------------------------------------- *
 * Module 03 · Icons (favicon loading + GM cache)
 * -------------------------------------------------------------------------- */

        function createIconManager({
            options,
            state,
            safeGMGet,
            safeGMSet,
            GMX
        } = {}) {
            const opts = options && typeof options === "object" ? options : {};
            const stateRef = state && typeof state === "object" ? state : null;
            const cacheOptions = (opts.iconCache && typeof opts.iconCache === "object") ? opts.iconCache : {};
            const themeAdaptOptions = (opts.iconThemeAdapt && typeof opts.iconThemeAdapt === "object") ? opts.iconThemeAdapt : {};
            const enableMemoryCache = cacheOptions.enableMemoryCache !== false;
            const memoryMaxEntries = Number.isFinite(Number(cacheOptions.memoryMaxEntries))
                ? Math.max(0, Number(cacheOptions.memoryMaxEntries))
                : 200;
            const maxDataUrlChars = Number.isFinite(Number(cacheOptions.maxDataUrlChars))
                ? Math.max(0, Number(cacheOptions.maxDataUrlChars))
                : 180000;
            const memoryCache = enableMemoryCache ? new Map() : null; // url -> string | null (null = checked, no cached value)
            const inflightFetches = new Map(); // url -> callbacks[]
            const themeStoreKeyBase = String(opts?.storageKeys?.iconThemeAdapted || "").trim();
            const themeAdaptEnabled = themeAdaptOptions.enabled !== false;
            const themeStoreEnabled = !!themeStoreKeyBase;
            const themeLightFillColor = (typeof normalizeSvgCssColorToken === "function")
                ? normalizeSvgCssColorToken(themeAdaptOptions.lightFillColor, "#111827")
                : (String(themeAdaptOptions.lightFillColor || "").trim() || "#111827");
            const themeDarkFillColor = (typeof normalizeSvgCssColorToken === "function")
                ? normalizeSvgCssColorToken(themeAdaptOptions.darkFillColor, "#F8FAFC")
                : (String(themeAdaptOptions.darkFillColor || "").trim() || "#F8FAFC");
            const themeMemoryCache = enableMemoryCache ? new Map() : null; // key -> { source, adapted } | null
            const inflightThemeBuilds = new Map(); // source -> callbacks[]
            const SVG_USE_ICON_PREFIX = "svg-use:";
            const FONT_ICON_PREFIX = "font-icon:";
            const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
            const XLINK_NAMESPACE = "http://www.w3.org/1999/xlink";
            const resolveSvgUseHref = typeof opts.resolveSvgUseHref === "function"
                ? opts.resolveSvgUseHref
                : null;

            function getDefaultIconURL() {
                if (opts.defaultIconURL) return opts.defaultIconURL;
                if (Array.isArray(opts.iconLibrary) && opts.iconLibrary.length > 0) return opts.iconLibrary[0].url || "";
                return "";
            }

            function isDarkModeNow() {
                if (stateRef && typeof stateRef.isDarkMode === "boolean") return stateRef.isDarkMode;
                try {
                    if (globalThis.matchMedia) return !!globalThis.matchMedia("(prefers-color-scheme: dark)").matches;
                } catch {}
                return false;
            }

            function normalizeLocalBoolean(value, fallback = false) {
                if (typeof value === "boolean") return value;
                const token = String(value ?? "").trim().toLowerCase();
                if (!token) return fallback;
                if (["1", "true", "yes", "on"].includes(token)) return true;
                if (["0", "false", "no", "off"].includes(token)) return false;
                return fallback;
            }

            function rememberMemoryCache(url, value) {
                if (!memoryCache || !url) return;
                if (memoryCache.has(url)) memoryCache.delete(url);
                memoryCache.set(url, value);
                if (memoryMaxEntries > 0 && memoryCache.size > memoryMaxEntries) {
                    const firstKey = memoryCache.keys().next().value;
                    if (firstKey) memoryCache.delete(firstKey);
                }
            }

            function rememberThemeMemoryCache(key, value) {
                if (!themeMemoryCache || !key) return;
                if (themeMemoryCache.has(key)) themeMemoryCache.delete(key);
                themeMemoryCache.set(key, value);
                if (memoryMaxEntries > 0 && themeMemoryCache.size > memoryMaxEntries) {
                    const firstKey = themeMemoryCache.keys().next().value;
                    if (firstKey) themeMemoryCache.delete(firstKey);
                }
            }

            function getCachedIconDataURL(url) {
                const key = opts.storageKeys.iconCachePrefix + url;
                if (memoryCache && memoryCache.has(key)) {
                    const val = memoryCache.get(key);
                    return val || "";
                }
                let stored = "";
                try {
                    stored = safeGMGet(key, "");
                } catch {
                    stored = "";
                }
                if (memoryCache) rememberMemoryCache(key, stored ? stored : null);
                return stored;
            }
            function saveCachedIconDataURL(url, dataURL) {
                const key = opts.storageKeys.iconCachePrefix + url;
                if (memoryCache) rememberMemoryCache(key, dataURL || null);
                if (!dataURL) return;
                if (maxDataUrlChars > 0 && String(dataURL).length > maxDataUrlChars) return;
                try {
                    safeGMSet(key, dataURL);
                } catch {}
            }
            function mimeFrom(url, headersLower) {
                let m = (headersLower || "").match(/content-type:\s*([^\r\n;]+)/);
                if (m && m[1]) return m[1].trim();
                if (/\.(svg)(\?|#|$)/i.test(url)) return "image/svg+xml";
                if (/\.(jpe?g)(\?|#|$)/i.test(url)) return "image/jpeg";
                if (/\.(png)(\?|#|$)/i.test(url)) return "image/png";
                if (/\.(gif)(\?|#|$)/i.test(url)) return "image/gif";
                if (/\.(ico)(\?|#|$)/i.test(url)) return "image/x-icon";
                return "image/png";
            }
            function arrayBufferToDataURL(buf, mime) {
                const bytes = new Uint8Array(buf);
                let binary = "";
                for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
                const b64 = btoa(binary);
                return `data:${mime};base64,${b64}`;
            }
            function fetchIconAsDataURL(url, cb) {
                if (!GMX) { cb(null); return; }
                GMX({
                    method: "GET",
                    url,
                    responseType: "arraybuffer",
                    onload: function(resp) {
                        if (resp.status >= 200 && resp.status < 400 && resp.response) {
                            const mime = mimeFrom(url, (resp.responseHeaders || "").toLowerCase());
                            const dataURL = arrayBufferToDataURL(resp.response, mime);
                            cb(dataURL);
                        } else cb(null);
                    },
                    onerror: function() { cb(null); }
                });
            }

            function fetchIconAsDataURLOnce(url, cb) {
                if (!url || typeof cb !== "function") return;
                const pending = inflightFetches.get(url);
                if (pending) {
                    pending.push(cb);
                    return;
                }
                inflightFetches.set(url, [cb]);
                fetchIconAsDataURL(url, (dataURL) => {
                    const callbacks = inflightFetches.get(url) || [];
                    inflightFetches.delete(url);
                    callbacks.forEach((fn) => {
                        try { fn(dataURL); } catch {}
                    });
                });
            }

            function shouldBypassIconCache(url) {
                try {
                    if (typeof opts.shouldBypassIconCache === 'function') {
                        return !!opts.shouldBypassIconCache(url);
                    }
                } catch (err) {
                    console.warn(`${opts.consoleTag} shouldBypassIconCache error`, err);
                }
                return false;
            }

            function hashString(input) {
                const text = String(input || "");
                let hash = 5381;
                for (let i = 0; i < text.length; i++) {
                    hash = ((hash << 5) + hash + text.charCodeAt(i)) >>> 0;
                }
                return `${text.length}_${hash.toString(16)}`;
            }

            function getThemeStoreKey(source) {
                if (!themeStoreEnabled) return "";
                return `${themeStoreKeyBase}::${hashString(source)}`;
            }

            function getCachedThemeAdaptiveIconDataURL(source) {
                const input = String(source || "").trim();
                if (!input || !themeStoreEnabled) return "";
                const key = getThemeStoreKey(input);
                if (!key) return "";

                if (themeMemoryCache && themeMemoryCache.has(key)) {
                    const memoryVal = themeMemoryCache.get(key);
                    if (!memoryVal) return "";
                    if (memoryVal && memoryVal.source === input && typeof memoryVal.adapted === "string") {
                        return memoryVal.adapted;
                    }
                    return "";
                }

                let stored = null;
                try {
                    stored = safeGMGet(key, null);
                } catch {
                    stored = null;
                }
                if (
                    stored &&
                    typeof stored === "object" &&
                    !Array.isArray(stored) &&
                    stored.source === input &&
                    typeof stored.adapted === "string" &&
                    stored.adapted
                ) {
                    if (themeMemoryCache) rememberThemeMemoryCache(key, { source: input, adapted: stored.adapted });
                    return stored.adapted;
                }

                if (themeMemoryCache) rememberThemeMemoryCache(key, null);
                return "";
            }

            function saveThemeAdaptiveIconDataURL(source, adaptedDataURL) {
                const input = String(source || "").trim();
                const dataURL = String(adaptedDataURL || "").trim();
                if (!input || !dataURL || !themeStoreEnabled) return;
                if (maxDataUrlChars > 0 && dataURL.length > maxDataUrlChars) return;
                const key = getThemeStoreKey(input);
                if (!key) return;
                const payload = {
                    source: input,
                    adapted: dataURL,
                    savedAt: Date.now()
                };
                if (themeMemoryCache) rememberThemeMemoryCache(key, { source: input, adapted: dataURL });
                try {
                    safeGMSet(key, payload);
                } catch {}
            }

            function isLikelySvgUrl(value) {
                const url = String(value || "").trim();
                if (!url) return false;
                return /\.(svg)(\?|#|$)/i.test(url);
            }

            function decodeBase64Utf8(base64Payload) {
                const payload = String(base64Payload || "").replace(/\s+/g, "");
                if (!payload) return "";
                try {
                    const binary = atob(payload);
                    const bytes = new Uint8Array(binary.length);
                    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
                    if (typeof TextDecoder === "function") {
                        return new TextDecoder("utf-8").decode(bytes);
                    }
                    let escaped = "";
                    for (let i = 0; i < bytes.length; i++) {
                        escaped += `%${bytes[i].toString(16).padStart(2, "0")}`;
                    }
                    return decodeURIComponent(escaped);
                } catch {
                    return "";
                }
            }

            function decodeSvgDataUrl(dataUrl) {
                const raw = String(dataUrl || "").trim();
                if (!raw) return "";
                const match = raw.match(/^data:image\/svg\+xml(?:;([^,]*))?,([\s\S]*)$/i);
                if (!match) return "";
                const meta = String(match[1] || "").toLowerCase();
                const isBase64 = /(?:^|;)base64(?:;|$)/i.test(meta);
                const payload = match[2] || "";
                if (isBase64) return decodeBase64Utf8(payload);
                try {
                    return decodeURIComponent(payload);
                } catch {
                    return payload;
                }
            }

            function fetchSvgText(url, cb) {
                if (!GMX) {
                    cb("");
                    return;
                }
                GMX({
                    method: "GET",
                    url,
                    onload: function(resp) {
                        const status = Number(resp?.status || 0);
                        if (!(status >= 200 && status < 400)) {
                            cb("");
                            return;
                        }
                        const text = String(resp?.responseText || "").trim();
                        if (!text) {
                            cb("");
                            return;
                        }
                        const headers = String(resp?.responseHeaders || "").toLowerCase();
                        const match = headers.match(/content-type:\s*([^\r\n;]+)/i);
                        const contentType = match && match[1] ? match[1].trim().toLowerCase() : "";
                        const isSvgContent = contentType.includes("image/svg+xml") || /<svg[\s>]/i.test(text);
                        cb(isSvgContent ? text : "");
                    },
                    onerror: function() {
                        cb("");
                    }
                });
            }

            function resolveSvgSource(iconSource, cb) {
                const source = String(iconSource || "").trim();
                if (!source) {
                    cb("");
                    return;
                }

                if (/^<svg[\s>]/i.test(source)) {
                    cb(source);
                    return;
                }

                if (source.startsWith("data:")) {
                    if (!/^data:image\/svg\+xml/i.test(source)) {
                        cb("");
                        return;
                    }
                    cb(decodeSvgDataUrl(source));
                    return;
                }

                if (source.startsWith("blob:")) {
                    cb("");
                    return;
                }

                if (!isLikelySvgUrl(source)) {
                    cb("");
                    return;
                }

                fetchSvgText(source, cb);
            }

            function mergeClassNames(baseClassName, appendClassName) {
                const tokens = `${String(baseClassName || "")} ${String(appendClassName || "")}`
                    .split(/\s+/)
                    .map((part) => String(part || "").trim())
                    .filter(Boolean);
                if (tokens.length === 0) return "";
                return Array.from(new Set(tokens)).join(" ");
            }

            function isConvertiblePaintValue(rawValue) {
                const value = String(rawValue || "").trim();
                if (!value) return false;
                if (/^none$/i.test(value)) return false;
                if (/^url\s*\(/i.test(value)) return false;
                if (/^var\s*\(/i.test(value)) return false;
                if (/^context-(?:fill|stroke)$/i.test(value)) return false;
                if (/^(?:inherit|initial|unset)$/i.test(value)) return false;
                return true;
            }

            function normalizeSvgInlineStyleColor(styleText) {
                const raw = String(styleText || "").trim();
                if (!raw) return "";
                const declarations = raw.split(";");
                const normalized = [];
                for (const declarationRaw of declarations) {
                    const declaration = String(declarationRaw || "").trim();
                    if (!declaration) continue;
                    const separatorIndex = declaration.indexOf(":");
                    if (separatorIndex <= 0) continue;
                    const name = declaration.slice(0, separatorIndex).trim().toLowerCase();
                    const value = declaration.slice(separatorIndex + 1).trim();
                    if (!name || !value) continue;

                    if ((name === "fill" || name === "stroke") && isConvertiblePaintValue(value)) {
                        normalized.push(`${name}:currentColor`);
                    } else {
                        normalized.push(`${name}:${value}`);
                    }
                }
                return normalized.join(";");
            }

            function buildThemeAdaptiveSvgDataUrl(svgText) {
                const source = String(svgText || "").trim();
                if (!source) return "";

                if (/prefers-color-scheme\s*:\s*dark/i.test(source)) {
                    return `data:image/svg+xml,${encodeURIComponent(source)}`;
                }

                const DOMParserCtor = globalThis.DOMParser;
                const XMLSerializerCtor = globalThis.XMLSerializer;
                if (typeof DOMParserCtor !== "function" || typeof XMLSerializerCtor !== "function") {
                    return "";
                }

                let doc = null;
                try {
                    doc = new DOMParserCtor().parseFromString(source, "image/svg+xml");
                } catch {
                    doc = null;
                }
                if (!doc || doc.querySelector("parsererror")) return "";

                const root = doc.documentElement;
                if (!root || String(root.tagName || "").toLowerCase() !== "svg") return "";

                if (!root.getAttribute("xmlns")) {
                    root.setAttribute("xmlns", "http://www.w3.org/2000/svg");
                }

                const themeRootClassName = "st-theme-auto";
                const themeRootClass = (typeof mergeSvgClassNames === "function")
                    ? mergeSvgClassNames(root.getAttribute("class"), themeRootClassName)
                    : mergeClassNames(root.getAttribute("class"), themeRootClassName);
                if (themeRootClass) root.setAttribute("class", themeRootClass);

                const styleEl = doc.createElementNS(root.namespaceURI || "http://www.w3.org/2000/svg", "style");
                styleEl.textContent = `.${themeRootClassName}{color:${themeLightFillColor};}@media (prefers-color-scheme: dark){.${themeRootClassName}{color:${themeDarkFillColor};}}`;
                root.insertBefore(styleEl, root.firstChild || null);

                const autoFillTags = new Set(["path", "circle", "rect", "ellipse", "line", "polyline", "polygon", "text"]);
                const skipTags = new Set([
                    "defs", "clippath", "mask",
                    "lineargradient", "radialgradient", "stop",
                    "pattern", "filter", "image", "foreignobject",
                    "style", "script", "metadata", "title", "desc",
                    "symbol", "use"
                ]);

                const nodes = Array.from(root.querySelectorAll("*"));
                for (const node of nodes) {
                    const tag = String(node.tagName || "").toLowerCase();
                    if (!tag || skipTags.has(tag)) continue;
                    let blockedByAncestor = false;
                    try {
                        const ancestor = node.closest("defs,clipPath,mask,linearGradient,radialGradient,pattern,filter,symbol");
                        blockedByAncestor = !!ancestor && ancestor !== node;
                    } catch {}
                    if (blockedByAncestor) continue;

                    const fill = node.getAttribute("fill");
                    if (fill !== null && isConvertiblePaintValue(fill)) {
                        node.setAttribute("fill", "currentColor");
                    }
                    const stroke = node.getAttribute("stroke");
                    if (stroke !== null && isConvertiblePaintValue(stroke)) {
                        node.setAttribute("stroke", "currentColor");
                    }

                    if (node.hasAttribute("style")) {
                        const nextStyle = normalizeSvgInlineStyleColor(node.getAttribute("style"));
                        if (nextStyle) node.setAttribute("style", nextStyle);
                        else node.removeAttribute("style");
                    }

                    const hasPaintAttr = node.hasAttribute("fill") || node.hasAttribute("stroke");
                    if (!hasPaintAttr && autoFillTags.has(tag)) {
                        node.setAttribute("fill", "currentColor");
                    }
                }

                let markup = "";
                try {
                    markup = new XMLSerializerCtor().serializeToString(root);
                } catch {
                    markup = "";
                }
                if (!markup) return "";
                return `data:image/svg+xml,${encodeURIComponent(markup)}`;
            }

            function ensureThemeAdaptiveIconStored(iconSource, cb = null) {
                const source = String(iconSource || "").trim();
                const callback = (typeof cb === "function") ? cb : null;

                if (!source || !themeAdaptEnabled) {
                    if (callback) callback("");
                    return;
                }

                const cached = getCachedThemeAdaptiveIconDataURL(source);
                if (cached) {
                    if (callback) callback(cached);
                    return;
                }

                const pending = inflightThemeBuilds.get(source);
                if (pending) {
                    if (callback) pending.push(callback);
                    return;
                }

                inflightThemeBuilds.set(source, callback ? [callback] : []);

                resolveSvgSource(source, (svgText) => {
                    const themedDataUrl = svgText ? buildThemeAdaptiveSvgDataUrl(svgText) : "";
                    if (themedDataUrl) {
                        saveThemeAdaptiveIconDataURL(source, themedDataUrl);
                    } else if (themeMemoryCache && themeStoreEnabled) {
                        rememberThemeMemoryCache(getThemeStoreKey(source), null);
                    }

                    const queue = inflightThemeBuilds.get(source) || [];
                    inflightThemeBuilds.delete(source);
                    queue.forEach((fn) => {
                        try { fn(themedDataUrl); } catch {}
                    });
                });
            }

            function markImageSource(imgEl, source) {
                if (!imgEl) return;
                const marker = String(source || "");
                try {
                    imgEl.dataset.stIconSource = marker;
                    return;
                } catch {}
                try {
                    imgEl.__stIconSource = marker;
                } catch {}
            }

            function isImageSourceCurrent(imgEl, source) {
                if (!imgEl) return false;
                const marker = String(source || "");
                try {
                    if (imgEl.dataset && imgEl.dataset.stIconSource === marker) return true;
                } catch {}
                try {
                    return imgEl.__stIconSource === marker;
                } catch {
                    return false;
                }
            }

            function parseSvgUseIconSource(value) {
                const source = String(value || "").trim();
                if (!source.startsWith(SVG_USE_ICON_PREFIX)) return null;
                const href = source.slice(SVG_USE_ICON_PREFIX.length).trim();
                return href ? { href } : null;
            }

            function parseFontIconSource(value) {
                const source = String(value || "").trim();
                if (!source.startsWith(FONT_ICON_PREFIX)) return null;
                const name = source.slice(FONT_ICON_PREFIX.length).trim();
                return name ? { name } : null;
            }

            function resolveSvgUseIconHref(rawHref, source) {
                const href = String(rawHref || "").trim();
                if (!href) return "";
                if (!resolveSvgUseHref) return href;
                try {
                    const resolved = resolveSvgUseHref(href, {
                        source,
                        isDark: isDarkModeNow()
                    });
                    return String(resolved || href).trim();
                } catch (err) {
                    console.warn(`${opts.consoleTag} resolveSvgUseHref error`, err);
                    return href;
                }
            }

            function rememberOriginalImageDisplay(imgEl) {
                if (!imgEl) return;
                try {
                    if (!imgEl.dataset.stIconOriginalDisplaySaved) {
                        imgEl.dataset.stIconOriginalDisplay = imgEl.style.display || "";
                        imgEl.dataset.stIconOriginalDisplaySaved = "1";
                    }
                } catch {
                    try {
                        if (!imgEl.__stIconOriginalDisplaySaved) {
                            imgEl.__stIconOriginalDisplay = imgEl.style.display || "";
                            imgEl.__stIconOriginalDisplaySaved = true;
                        }
                    } catch {}
                }
            }

            function restoreOriginalImageDisplay(imgEl) {
                if (!imgEl) return;
                try {
                    if (imgEl.dataset.stIconOriginalDisplaySaved) {
                        imgEl.style.display = imgEl.dataset.stIconOriginalDisplay || "";
                        delete imgEl.dataset.stIconOriginalDisplay;
                        delete imgEl.dataset.stIconOriginalDisplaySaved;
                        return;
                    }
                } catch {}
                try {
                    if (imgEl.__stIconOriginalDisplaySaved) {
                        imgEl.style.display = imgEl.__stIconOriginalDisplay || "";
                        imgEl.__stIconOriginalDisplay = "";
                        imgEl.__stIconOriginalDisplaySaved = false;
                    }
                } catch {}
            }

            function removeSvgUseIcon(imgEl) {
                if (!imgEl) return;
                try {
                    const svg = imgEl.__stSvgUseIcon || null;
                    if (svg && svg.parentNode) svg.parentNode.removeChild(svg);
                    imgEl.__stSvgUseIcon = null;
                } catch {}
                restoreOriginalImageDisplay(imgEl);
            }

            function removeFontIcon(imgEl) {
                if (!imgEl) return;
                try {
                    const iconEl = imgEl.__stFontIcon || null;
                    if (iconEl && iconEl.parentNode) iconEl.parentNode.removeChild(iconEl);
                    imgEl.__stFontIcon = null;
                } catch {}
                restoreOriginalImageDisplay(imgEl);
            }

            function copyIconImageBoxStyle(imgEl, svgEl) {
                if (!imgEl || !svgEl) return;
                const width = imgEl.style?.width || imgEl.getAttribute?.("width") || "24px";
                const height = imgEl.style?.height || imgEl.getAttribute?.("height") || "24px";
                const verticalAlign = imgEl.style?.verticalAlign || "middle";
                const flexShrink = imgEl.style?.flexShrink || "0";
                Object.assign(svgEl.style, {
                    width: /^\d+(?:\.\d+)?$/.test(String(width)) ? `${width}px` : String(width),
                    height: /^\d+(?:\.\d+)?$/.test(String(height)) ? `${height}px` : String(height),
                    display: "inline-block",
                    verticalAlign,
                    flexShrink,
                    color: isDarkModeNow() ? themeDarkFillColor : themeLightFillColor
                });
            }

            function createSvgUseElement(href) {
                const useEl = document.createElementNS(SVG_NAMESPACE, "use");
                useEl.setAttribute("href", href);
                try { useEl.setAttributeNS(XLINK_NAMESPACE, "href", href); } catch {}
                useEl.setAttribute("fill", "currentColor");
                return useEl;
            }

            function renderSvgUseIcon(imgEl, spec, sourceMarker, deferredCount = 0) {
                if (!imgEl || !spec) return;
                if (!isImageSourceCurrent(imgEl, sourceMarker)) return;
                const parent = imgEl.parentNode;
                if (!parent) {
                    rememberOriginalImageDisplay(imgEl);
                    imgEl.style.display = "none";
                    if (deferredCount < 2) {
                        const schedule = typeof globalThis.requestAnimationFrame === "function"
                            ? globalThis.requestAnimationFrame
                            : (fn) => setTimeout(fn, 0);
                        schedule(() => renderSvgUseIcon(imgEl, spec, sourceMarker, deferredCount + 1));
                    } else {
                        removeSvgUseIcon(imgEl);
                        imgEl.src = getDefaultIconURL();
                    }
                    return;
                }

                const href = resolveSvgUseIconHref(spec.href, sourceMarker);
                if (!href) {
                    removeSvgUseIcon(imgEl);
                    imgEl.src = getDefaultIconURL();
                    return;
                }

                let svgEl = null;
                try { svgEl = imgEl.__stSvgUseIcon || null; } catch {}
                if (!svgEl || svgEl.parentNode !== parent) {
                    if (svgEl && svgEl.parentNode) {
                        try { svgEl.parentNode.removeChild(svgEl); } catch {}
                    }
                    svgEl = document.createElementNS(SVG_NAMESPACE, "svg");
                    try { imgEl.__stSvgUseIcon = svgEl; } catch {}
                    try { parent.insertBefore(svgEl, imgEl.nextSibling); } catch { parent.appendChild(svgEl); }
                }

                svgEl.setAttribute("viewBox", "0 0 24 24");
                svgEl.setAttribute("aria-hidden", "true");
                svgEl.setAttribute("focusable", "false");
                svgEl.setAttribute("fill", "currentColor");
                svgEl.setAttribute("data-st-icon-svg-use", "true");
                copyIconImageBoxStyle(imgEl, svgEl);

                const useEl = createSvgUseElement(href);
                try {
                    svgEl.replaceChildren(useEl);
                } catch {
                    while (svgEl.firstChild) svgEl.removeChild(svgEl.firstChild);
                    svgEl.appendChild(useEl);
                }

                rememberOriginalImageDisplay(imgEl);
                imgEl.style.display = "none";
            }

            function renderFontIcon(imgEl, spec, sourceMarker, deferredCount = 0) {
                if (!imgEl || !spec) return;
                if (!isImageSourceCurrent(imgEl, sourceMarker)) return;
                const parent = imgEl.parentNode;
                if (!parent) {
                    rememberOriginalImageDisplay(imgEl);
                    imgEl.style.display = "none";
                    if (deferredCount < 2) {
                        const schedule = typeof globalThis.requestAnimationFrame === "function"
                            ? globalThis.requestAnimationFrame
                            : (fn) => setTimeout(fn, 0);
                        schedule(() => renderFontIcon(imgEl, spec, sourceMarker, deferredCount + 1));
                    } else {
                        removeFontIcon(imgEl);
                        imgEl.src = getDefaultIconURL();
                    }
                    return;
                }

                const name = String(spec.name || "").trim();
                if (!name) {
                    removeFontIcon(imgEl);
                    imgEl.src = getDefaultIconURL();
                    return;
                }

                let iconEl = null;
                try { iconEl = imgEl.__stFontIcon || null; } catch {}
                if (!iconEl || iconEl.parentNode !== parent) {
                    if (iconEl && iconEl.parentNode) {
                        try { iconEl.parentNode.removeChild(iconEl); } catch {}
                    }
                    iconEl = document.createElement("span");
                    try { imgEl.__stFontIcon = iconEl; } catch {}
                    try { parent.insertBefore(iconEl, imgEl.nextSibling); } catch { parent.appendChild(iconEl); }
                }

                iconEl.className = "mat-icon notranslate gds-icon-l google-symbols mat-ligature-font mat-icon-no-color";
                iconEl.setAttribute("aria-hidden", "true");
                iconEl.setAttribute("data-st-icon-font", "true");
                iconEl.textContent = name;
                copyIconImageBoxStyle(imgEl, iconEl);
                const fontSize = iconEl.style.height || "24px";
                Object.assign(iconEl.style, {
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                    fontFamily: "\"Google Symbols\", \"Material Symbols Rounded\", \"Material Symbols Outlined\", \"Material Icons\", sans-serif",
                    fontSize,
                    fontStyle: "normal",
                    fontWeight: "400",
                    lineHeight: "1",
                    letterSpacing: "normal",
                    textTransform: "none",
                    whiteSpace: "nowrap",
                    wordWrap: "normal",
                    direction: "ltr",
                    fontFeatureSettings: "\"liga\"",
                    WebkitFontFeatureSettings: "\"liga\"",
                    fontVariationSettings: "\"FILL\" 0, \"wght\" 400, \"GRAD\" 0, \"opsz\" 24"
                });

                rememberOriginalImageDisplay(imgEl);
                imgEl.style.display = "none";
            }

            function setIconImage(imgEl, iconUrl, iconDarkUrl = "", iconAdaptive = false) {
                const fallback = getDefaultIconURL();
                if (!imgEl) return;
                const lightSource = String(iconUrl || "").trim();
                const darkSource = String(iconDarkUrl || "").trim();
                const source = (darkSource && (isDarkModeNow() || !lightSource)) ? darkSource : lightSource;
                const shouldUseThemeAdapt = themeAdaptEnabled && normalizeLocalBoolean(iconAdaptive, false) && !darkSource;
                const sourceMarker = `${source}::ta=${shouldUseThemeAdapt ? "1" : "0"}`;
                markImageSource(imgEl, sourceMarker);
                const svgUseSpec = parseSvgUseIconSource(source);
                if (svgUseSpec) {
                    removeFontIcon(imgEl);
                    renderSvgUseIcon(imgEl, svgUseSpec, sourceMarker);
                    return;
                }
                const fontIconSpec = parseFontIconSource(source);
                if (fontIconSpec) {
                    removeSvgUseIcon(imgEl);
                    renderFontIcon(imgEl, fontIconSpec, sourceMarker);
                    return;
                }
                removeSvgUseIcon(imgEl);
                removeFontIcon(imgEl);

                if (!source) {
                    imgEl.src = fallback;
                    return;
                }

                if (shouldUseThemeAdapt) {
                    const cachedThemeIcon = getCachedThemeAdaptiveIconDataURL(source);
                    if (cachedThemeIcon) {
                        imgEl.src = cachedThemeIcon;
                        return;
                    }
                }

                if (source.startsWith("data:") || source.startsWith("blob:")) {
                    imgEl.src = source;
                    if (shouldUseThemeAdapt && !source.startsWith("blob:")) {
                        ensureThemeAdaptiveIconStored(source, (themedDataUrl) => {
                            if (!themedDataUrl || !isImageSourceCurrent(imgEl, sourceMarker)) return;
                            imgEl.src = themedDataUrl;
                        });
                    }
                    return;
                }

                if (shouldBypassIconCache(source)) {
                    imgEl.src = source;
                    imgEl.onerror = () => {
                        imgEl.onerror = null;
                        imgEl.src = fallback;
                    };
                    if (shouldUseThemeAdapt) {
                        ensureThemeAdaptiveIconStored(source, (themedDataUrl) => {
                            if (!themedDataUrl || !isImageSourceCurrent(imgEl, sourceMarker)) return;
                            imgEl.src = themedDataUrl;
                        });
                    }
                    return;
                }

                const cached = getCachedIconDataURL(source);
                if (cached) {
                    imgEl.src = cached;
                    if (shouldUseThemeAdapt) {
                        ensureThemeAdaptiveIconStored(source, (themedDataUrl) => {
                            if (!themedDataUrl || !isImageSourceCurrent(imgEl, sourceMarker)) return;
                            imgEl.src = themedDataUrl;
                        });
                    }
                    return;
                }

                imgEl.src = source;

                const onErr = () => {
                    imgEl.removeEventListener('error', onErr);
                    fetchIconAsDataURLOnce(source, (dataURL) => {
                        if (dataURL) {
                            saveCachedIconDataURL(source, dataURL);
                            imgEl.src = dataURL;
                        } else {
                            imgEl.src = fallback;
                        }
                    });
                };
                imgEl.addEventListener('error', onErr, { once: true });

                if (shouldUseThemeAdapt) {
                    ensureThemeAdaptiveIconStored(source, (themedDataUrl) => {
                        if (!themedDataUrl || !isImageSourceCurrent(imgEl, sourceMarker)) return;
                        imgEl.src = themedDataUrl;
                    });
                }
            }

            return Object.freeze({
                setIconImage,
                ensureThemeAdaptiveIconStored
            });
        }

export { createIconManager };
