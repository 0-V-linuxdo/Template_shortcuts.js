import { panelMatchesCurrentView } from "./filter.js";

/* -------------------------------------------------------------------------- *
 * Module 05 · Panel Drag & Drop (reorder within current view)
 * -------------------------------------------------------------------------- */

	        function panelCreateDragAndDropController(ctx, { renderShortcutsList, updateStatsDisplay } = {}) {
            const { ids, classes, state, core, uiShared, options, panelFilter } = ctx;
            const { showAlert } = uiShared.dialogs;
            const matchesCurrentView = panelFilter?.matchesCurrentView || panelMatchesCurrentView;

            let draggingShortcutId = null;

            function reorderShortcutsInCurrentView(fromId, toId, { after = false } = {}) {
                const from = typeof fromId === "string" ? fromId.trim() : "";
                const to = typeof toId === "string" ? toId.trim() : "";
                if (!from || !to || from === to) return false;

                let changed = false;
                core.mutateShortcuts((list) => {
                    const indices = [];
                    const items = [];
                    for (let i = 0; i < list.length; i++) {
                        const sc = list[i];
                        if (matchesCurrentView(ctx, sc)) {
                            indices.push(i);
                            items.push(sc);
                        }
                    }

                    const fromPos = items.findIndex((sc) => sc && sc.id === from);
                    const toPos = items.findIndex((sc) => sc && sc.id === to);
                    if (fromPos < 0 || toPos < 0 || fromPos === toPos) return;

                    const moved = items.splice(fromPos, 1)[0];
                    let insertPos = toPos + (after ? 1 : 0);
                    if (fromPos < insertPos) insertPos -= 1;
                    if (insertPos < 0) insertPos = 0;
                    if (insertPos > items.length) insertPos = items.length;
                    items.splice(insertPos, 0, moved);

                    for (let i = 0; i < indices.length; i++) {
                        list[indices[i]] = items[i];
                    }
                    changed = true;
                });
                return changed;
            }

            function setupDragAndDrop(element, item, index) {
                const shortcutId = item && typeof item.id === "string" ? item.id : "";
                element.setAttribute("draggable", "true");
                element.style.cursor = "move";
                element.dataset.index = index;
                element.dataset.shortcutId = shortcutId;

                element.addEventListener("dragstart", (e) => {
                    draggingShortcutId = shortcutId || null;
                    try {
                        if (e.dataTransfer) {
                            e.dataTransfer.effectAllowed = "move";
                            e.dataTransfer.setData("text/plain", shortcutId || "");
                        }
                    } catch {}

                    element.classList.add("dragging");
                    const container = element.closest(`#${ids.tableBody}`) || element.closest(`.${classes.compactContainer}`);
                    if (container) container.classList.add("is-dragging");
                });

                element.addEventListener("dragover", (e) => {
                    e.preventDefault();
                    try { if (e.dataTransfer) e.dataTransfer.dropEffect = "move"; } catch {}

                    const container = element.closest(`#${ids.tableBody}`) || element.closest(`.${classes.compactContainer}`);
                    const draggingElement = container?.querySelector?.(".dragging") || document.querySelector(".dragging");
                    if (!draggingElement || draggingElement === element) return;

                    const rect = element.getBoundingClientRect();
                    const midY = rect.top + rect.height / 2;

                    if (container) {
                        container.querySelectorAll(".dragover-top, .dragover-bottom").forEach((el) => {
                            el.classList.remove("dragover-top", "dragover-bottom");
                        });
                    }

                    element.classList.add(e.clientY < midY ? "dragover-top" : "dragover-bottom");
                });

                element.addEventListener("dragleave", () => {
                    element.classList.remove("dragover-top", "dragover-bottom");
                });

                element.addEventListener("drop", (e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    const container = element.closest(`#${ids.tableBody}`) || element.closest(`.${classes.compactContainer}`);
                    if (container) {
                        container.querySelectorAll(".dragover-top, .dragover-bottom").forEach((el) => {
                            el.classList.remove("dragover-top", "dragover-bottom");
                        });
                    }

                    const fromId = draggingShortcutId || (() => {
                        try { return e.dataTransfer ? e.dataTransfer.getData("text/plain") : ""; } catch { return ""; }
                    })();
                    const toId = shortcutId;
                    const dropAfter = element.classList.contains("dragover-bottom");
                    if (!fromId || !toId || fromId === toId) return;

                    try {
                        const changed = reorderShortcutsInCurrentView(fromId, toId, { after: dropAfter });
                        if (changed) {
                            if (typeof renderShortcutsList === "function") renderShortcutsList(state.isDarkMode);
                            if (typeof updateStatsDisplay === "function") updateStatsDisplay();
                        }
                    } catch (err) {
                        console.error("Drag-and-drop error:", err);
                        const tpl = options?.text?.panel?.dragError || "Drag sorting error: {error}";
                        showAlert(tpl.replace("{error}", String(err ?? "")));
                    }
                });

                element.addEventListener("dragend", () => {
                    draggingShortcutId = null;
                    const container = element.closest(`#${ids.tableBody}`) || element.closest(`.${classes.compactContainer}`);
                    if (container) {
                        container.classList.remove("is-dragging");
                        container.querySelectorAll(".dragging, .dragover-top, .dragover-bottom").forEach((el) => {
                            el.classList.remove("dragging", "dragover-top", "dragover-bottom");
                        });
                    }
                });
            }

            return Object.freeze({ setupDragAndDrop });
        }

export { panelCreateDragAndDropController };
