/* -------------------------------------------------------------------------- *
 * Module 03 · Action registry (extensible action handlers)
 * -------------------------------------------------------------------------- */

        function createActionRegistry({ consoleTag = "[ShortcutEngine]" } = {}) {
            const entries = new Map();

            function normalizeType(actionType) {
                return String(actionType || "").trim();
            }

            function register(actionType, handler, meta = {}) {
                const type = normalizeType(actionType);
                if (!type) return false;
                if (typeof handler !== "function") {
                    console.warn(`${consoleTag} action handler for "${type}" is not a function; ignored.`);
                    return false;
                }
                const safeMeta = meta && typeof meta === "object" ? { ...meta } : {};
                entries.set(type, Object.freeze({ type, handler, meta: Object.freeze(safeMeta) }));
                return true;
            }

            function unregister(actionType) {
                const type = normalizeType(actionType);
                if (!type) return false;
                return entries.delete(type);
            }

            function has(actionType) {
                const type = normalizeType(actionType);
                if (!type) return false;
                return entries.has(type);
            }

            function get(actionType) {
                const type = normalizeType(actionType);
                if (!type) return null;
                return entries.get(type) || null;
            }

            function list() {
                return Array.from(entries.values()).map((entry) => entry);
            }

            return Object.freeze({
                register,
                unregister,
                has,
                get,
                list
            });
        }

export { createActionRegistry };
