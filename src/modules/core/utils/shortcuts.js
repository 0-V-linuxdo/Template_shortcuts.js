/* -------------------------------------------------------------------------- *
 * Core Utils · Shortcut lookup helpers
 * -------------------------------------------------------------------------- */

function getShortcuts(engine) {
            if (!engine || typeof engine.getShortcuts !== "function") return [];
            try {
                const list = engine.getShortcuts();
                return Array.isArray(list) ? list : [];
            } catch {
                return [];
            }
        }

        function findShortcutByName(engine, name) {
            const list = getShortcuts(engine);
            return list.find(s => s && s.name === name) || null;
        }

        function findShortcutByKey(engine, key) {
            const target = typeof key === "string" ? key.trim() : "";
            if (!target) return null;
            const list = getShortcuts(engine);
            return list.find(s => s && s.key === target) || null;
        }

        function findShortcutById(engine, id) {
            const target = typeof id === "string" ? id.trim() : "";
            if (!target) return null;
            const list = getShortcuts(engine);
            return list.find(s => s && s.id === target) || null;
        }

        function resolveShortcutField(engine, matcher, field, fallback = "") {
            if (!matcher || !field) return fallback;
            let shortcut = null;
            if (typeof matcher === "string") {
                shortcut = findShortcutByName(engine, matcher);
            } else if (matcher && typeof matcher === "object") {
                const id = typeof matcher.id === "string" ? matcher.id : "";
                const key = typeof matcher.key === "string" ? matcher.key : "";
                const name = typeof matcher.name === "string" ? matcher.name : "";
                shortcut = (id ? findShortcutById(engine, id) : null) ||
                    (key ? findShortcutByKey(engine, key) : null) ||
                    (name ? findShortcutByName(engine, name) : null);
            }
            const value = shortcut && typeof shortcut[field] === "string" ? shortcut[field].trim() : "";
            return value || fallback;
        }

export {
    getShortcuts,
    findShortcutByName,
    findShortcutByKey,
    findShortcutById,
    resolveShortcutField
};
