import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const sourcePath = new URL("../src/sites/notion/index.js", import.meta.url);
const source = fs.readFileSync(sourcePath, "utf8");

test("Notion model picker keeps the updated trigger and grouped-menu contract", () => {
    assert.ok(source.includes('data-testid="agent-chat-model-button"'));
    assert.ok(source.includes('aria-haspopup="dialog"'));
    assert.ok(source.includes("for your hardest tasks"));
    assert.ok(source.includes("data-model-id"));
    assert.ok(source.includes("notionOwnedModelMenuRoots"));
    assert.ok(source.includes('role === "menuitem"'));
    assert.ok(source.includes("show\\s+more\\s+models"));
});

test("Notion model shortcuts support model-specific Effort selection", () => {
    assert.ok(source.includes("const NOTION_EFFORT_TARGETS"));
    assert.ok(source.includes('data-testid="unified-chat-reasoning-effort-button"'));
    assert.ok(source.includes('data-testid="agent-chat-reasoning-effort-button"'));
    assert.ok(source.includes("notionEffortTargetsForModel"));
    assert.ok(source.includes("applyNotionEffortSelection"));
    assert.ok(source.includes("waitForNotionEffortSelection"));
    assert.ok(source.includes("createModelPickerDataAdapter"));
    assert.ok(source.includes("effortId"));
    assert.ok(source.includes("effort: high"));
});
