import test from "node:test";
import assert from "node:assert/strict";

import {
    X_REPLY_SORT_RECENCY_URL,
    X_REPLY_SORT_RELEVANT_URL,
    getXReplySortModeFromUrl,
    getXStatusPath,
    resolveXReplySortUrl
} from "../src/sites/x/reply-sort-url.js";

const STATUS_URL = "https://x.com/TomoriNao2022/status/2088564819888853486";
const STATUS_RECENCY_URL = `${STATUS_URL}?sort_replies=recency`;

test("X reply-sort templates encode relevant and recency modes", () => {
    assert.equal(getXReplySortModeFromUrl(X_REPLY_SORT_RELEVANT_URL), "relevant");
    assert.equal(getXReplySortModeFromUrl(X_REPLY_SORT_RECENCY_URL), "recency");
    assert.equal(getXReplySortModeFromUrl("https://x.com/home"), "");
});

test("X status paths keep the current post and ignore photo suffixes", () => {
    assert.equal(getXStatusPath("/TomoriNao2022/status/2088564819888853486"), "/TomoriNao2022/status/2088564819888853486");
    assert.equal(getXStatusPath("/TomoriNao2022/status/2088564819888853486/photo/1"), "/TomoriNao2022/status/2088564819888853486");
    assert.equal(getXStatusPath("/home"), "");
    assert.equal(getXStatusPath("/i/grok"), "");
});

test("X reply-sort URLs rewrite to the current status page", () => {
    assert.equal(resolveXReplySortUrl(X_REPLY_SORT_RELEVANT_URL, STATUS_RECENCY_URL), STATUS_URL);
    assert.equal(resolveXReplySortUrl(X_REPLY_SORT_RECENCY_URL, STATUS_URL), STATUS_RECENCY_URL);
    assert.equal(
        resolveXReplySortUrl(X_REPLY_SORT_RECENCY_URL, "https://twitter.com/foo/status/1?lang=en"),
        "https://twitter.com/foo/status/1?sort_replies=recency"
    );
});

test("X reply-sort URLs stay put when the current page is not a post", () => {
    assert.equal(resolveXReplySortUrl(X_REPLY_SORT_RECENCY_URL, "https://x.com/home"), "https://x.com/home");
    assert.equal(resolveXReplySortUrl("https://x.com/home", STATUS_URL), "https://x.com/home");
});
