/* -------------------------------------------------------------------------- *
 * X status-page reply sort URL templates
 * -------------------------------------------------------------------------- */

export const X_REPLY_SORT_RELEVANT_URL = "https://x.com/?sort_replies=relevant";
export const X_REPLY_SORT_RECENCY_URL = "https://x.com/?sort_replies=recency";
export const X_REPLY_SORT_RECENCY_PARAM = "sort_replies";
export const X_REPLY_SORT_RECENCY_VALUE = "recency";
export const X_REPLY_SORT_RELEVANT_VALUE = "relevant";

function normalizeText(value) {
    return String(value || "").trim();
}

export function isXHost(hostname) {
    const host = normalizeText(hostname).toLowerCase();
    return host === "x.com" || host === "www.x.com" || host === "twitter.com" || host === "www.twitter.com";
}

export function getXStatusPath(pathname) {
    const path = normalizeText(pathname).split("?")[0];
    const match = path.match(/^(\/(?:i\/)?[^/]+\/status\/\d+)/);
    return match ? match[1] : "";
}

function parseUrl(value, base) {
    try {
        return new URL(String(value || ""), base || "https://x.com");
    } catch {
        return null;
    }
}

export function getXReplySortModeFromUrl(targetUrl, base) {
    const parsed = parseUrl(targetUrl, base);
    if (!parsed || !isXHost(parsed.hostname)) return "";

    const sort = normalizeText(parsed.searchParams.get(X_REPLY_SORT_RECENCY_PARAM)).toLowerCase();
    if (sort === X_REPLY_SORT_RECENCY_VALUE) return X_REPLY_SORT_RECENCY_VALUE;
    if (sort === X_REPLY_SORT_RELEVANT_VALUE) return X_REPLY_SORT_RELEVANT_VALUE;
    return "";
}

export function resolveXReplySortUrl(targetUrl, currentHref) {
    const current = parseUrl(currentHref);
    const mode = getXReplySortModeFromUrl(targetUrl, current?.origin || "https://x.com");
    if (!mode) return String(targetUrl || "");

    const currentPath = getXStatusPath(current?.pathname || "");
    if (!current || !currentPath) {
        return current ? `${current.origin}${current.pathname}${current.search}${current.hash}` : String(targetUrl || "");
    }

    const next = new URL(currentPath, current.origin);
    if (mode === X_REPLY_SORT_RECENCY_VALUE) {
        next.searchParams.set(X_REPLY_SORT_RECENCY_PARAM, X_REPLY_SORT_RECENCY_VALUE);
    }
    return next.toString();
}
