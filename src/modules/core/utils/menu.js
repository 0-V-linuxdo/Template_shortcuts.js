/* -------------------------------------------------------------------------- *
 * Core Utils · Menu controller
 * -------------------------------------------------------------------------- */

import { sleep } from "../../shared/base.js";
import { DEFAULT_TIMING, safeQuerySelectorAll, isVisible, normalizeText, matchText, getElementLabelText, findFirst, waitFor, escapeForAttributeSelector } from "./dom.js";
import { resolveShortcutField } from "./shortcuts.js";
import { simulateClick, simulateHover } from "./events.js";

function resolveSelectorListFromSpec(ctx, spec) {
            if (!spec) return [];
            if (Array.isArray(spec)) {
                return spec.flatMap(item => resolveSelectorListFromSpec(ctx, item));
            }
            if (typeof spec === "string") {
                const trimmed = spec.trim();
                return trimmed ? [trimmed] : [];
            }
            if (typeof spec === "object") {
                if (Array.isArray(spec.selectors)) return resolveSelectorListFromSpec(ctx, spec.selectors);
                const fromId = typeof spec.fromShortcutId === "string" ? spec.fromShortcutId : "";
                const fromKey = typeof spec.fromShortcutKey === "string" ? spec.fromShortcutKey : "";
                const fromName = typeof spec.fromShortcutName === "string" ? spec.fromShortcutName : "";
                const field = typeof spec.field === "string" ? spec.field : "selector";
                const fallback = typeof spec.fallback === "string" ? spec.fallback : (typeof spec.selector === "string" ? spec.selector : "");
                const selector = (fromId || fromKey || fromName)
                    ? resolveShortcutField(ctx?.engine, { id: fromId, key: fromKey, name: fromName }, field, fallback)
                    : fallback;
                const trimmed = selector.trim();
                return trimmed ? [trimmed] : [];
            }
            return [];
        }

        function pickElement(candidates, { pick = "first", preferSvgPathDIncludes = [] } = {}) {
            if (!Array.isArray(candidates) || candidates.length === 0) return null;
            if (candidates.length === 1) return candidates[0];

            const pickLower = String(pick || "").toLowerCase();
            const list = candidates.slice();

            function bottomMostSort(a, b) {
                const aRect = a.getBoundingClientRect();
                const bRect = b.getBoundingClientRect();
                return bRect.bottom - aRect.bottom;
            }

            if (pickLower === "last") return list[list.length - 1] || null;
            if (pickLower === "bottommost") {
                list.sort(bottomMostSort);
                return list[0] || null;
            }

            if (pickLower === "prefersvgpath") {
                const includes = Array.isArray(preferSvgPathDIncludes) ? preferSvgPathDIncludes.filter(Boolean) : [];
                list.sort((a, b) => {
                    const aScore = includes.length ? (hasSvgPathDIncludes(a, includes) ? 1 : 0) : 0;
                    const bScore = includes.length ? (hasSvgPathDIncludes(b, includes) ? 1 : 0) : 0;
                    if (aScore !== bScore) return bScore - aScore;
                    return bottomMostSort(a, b);
                });
                return list[0] || null;
            }

            return list[0] || null;
        }

        function hasSvgPathDIncludes(element, includesAll = []) {
            if (!element || !Array.isArray(includesAll) || includesAll.length === 0) return false;
            let paths = [];
            try {
                paths = Array.from(element.querySelectorAll("svg path"));
            } catch {
                return false;
            }
            for (const path of paths) {
                const d = path.getAttribute("d") || "";
                if (includesAll.every(part => d.includes(part))) return true;
            }
            return false;
        }

        function createMenuController(menuConfig = {}, { parent = null } = {}) {
            const timing = { ...DEFAULT_TIMING, ...(menuConfig.timing || {}) };
            const triggerConfig = menuConfig.trigger || {};
            const rootConfig = menuConfig.root || {};

            const submenus = {};
            if (menuConfig.submenus && typeof menuConfig.submenus === "object") {
                for (const [key, cfg] of Object.entries(menuConfig.submenus)) {
                    if (!cfg) continue;
                    const submenuCfg = {
                        ...cfg,
                        trigger: { ...(cfg.trigger || {}) }
                    };
                    if (!submenuCfg.trigger.searchRoot) submenuCfg.trigger.searchRoot = "parentRoot";
                    submenus[key] = createMenuController(submenuCfg, { parent: null });
                }
            }

            function _setParent(p) {
                parent = p || null;
            }

            function getTriggerSearchRoot(ctx) {
                const mode = triggerConfig.searchRoot;
                if (mode === "parentRoot" && parent && typeof parent.getRootElement === "function") {
                    return parent.getRootElement(ctx);
                }
                return globalThis.document || null;
            }

            function getTriggerCandidateSet(ctx) {
                const root = getTriggerSearchRoot(ctx);
                const fallbackPick = triggerConfig.pick;
                const fallbackSvgIncludes = triggerConfig.preferSvgPathDIncludes;
                if (!root) return { candidates: [], pick: fallbackPick, preferSvgPathDIncludes: fallbackSvgIncludes };

                const specs = Array.isArray(triggerConfig.candidates) ? triggerConfig.candidates : [triggerConfig];
                for (const rawSpec of specs) {
                    if (!rawSpec) continue;
                    const spec = typeof rawSpec === "string" ? { selector: rawSpec } : rawSpec;

                    const selectors = resolveSelectorListFromSpec(ctx, spec.selectors || spec.selector || []);
                    const textMatch = (spec.textMatch !== undefined) ? spec.textMatch : (triggerConfig.textMatch ?? null);
                    const normalize = spec.normalize || triggerConfig.normalize || normalizeText;

                    let candidates = [];
                    for (const sel of selectors) {
                        candidates.push(...safeQuerySelectorAll(root, sel));
                    }
                    candidates = candidates.filter(isVisible);
                    if (textMatch) {
                        candidates = candidates.filter(el => matchText(getElementLabelText(el), textMatch, { normalize, element: el }));
                    }
                    if (candidates.length > 0) {
                        return {
                            candidates,
                            pick: spec.pick ?? fallbackPick,
                            preferSvgPathDIncludes: spec.preferSvgPathDIncludes ?? fallbackSvgIncludes
                        };
                    }
                }

                return { candidates: [], pick: fallbackPick, preferSvgPathDIncludes: fallbackSvgIncludes };
            }

            function getTriggerElement(ctx) {
                const set = getTriggerCandidateSet(ctx);
                return pickElement(set.candidates, {
                    pick: set.pick,
                    preferSvgPathDIncludes: set.preferSvgPathDIncludes
                });
            }

            function activateTrigger(ctx) {
                const el = getTriggerElement(ctx);
                if (!el) return false;
                const action = String(triggerConfig.action || "click").toLowerCase();
                if (action === "hover") return simulateHover(el);
                return simulateClick(el);
            }

            function getRootElement(ctx) {
                const doc = globalThis.document || null;
                if (!doc) return null;
                const triggerEl = getTriggerElement(ctx);
                if (!triggerEl) return null;

                const type = String(rootConfig.type || "ariaControls").toLowerCase();
                const requireVisible = rootConfig.requireVisible !== false;

                if (type === "selector") {
                    const selectors = resolveSelectorListFromSpec(ctx, rootConfig.selectors || rootConfig.selector || []);
                    const all = selectors.flatMap(sel => safeQuerySelectorAll(doc, sel));
                    const visible = requireVisible ? all.filter(isVisible) : all;
                    const pick = String(rootConfig.pick || (requireVisible ? "last" : "last")).toLowerCase();
                    if (pick === "first") return visible[0] || all[0] || null;
                    return visible[visible.length - 1] || all[all.length - 1] || null;
                }

                if (type === "arialabelledby") {
                    const baseSelector = rootConfig.selector || "";
                    const id = triggerEl.getAttribute && triggerEl.getAttribute("id");
                    if (id && baseSelector) {
                        const selector = `${baseSelector}[aria-labelledby="${escapeForAttributeSelector(id)}"]`;
                        const menu = safeQuerySelector(doc, selector);
                        if (menu && (!requireVisible || isVisible(menu))) return menu;
                    }
                    if (!baseSelector) return null;
                    const menus = safeQuerySelectorAll(doc, baseSelector);
                    const visibleMenus = requireVisible ? menus.filter(isVisible) : menus;
                    return visibleMenus[visibleMenus.length - 1] || menus[menus.length - 1] || null;
                }

                const controlsAttr = rootConfig.controlsAttr || "aria-controls";
                const expandedAttr = rootConfig.expandedAttr || "aria-expanded";
                const expandedValue = String(rootConfig.expandedValue || "true").toLowerCase();
                const expanded = (triggerEl.getAttribute && triggerEl.getAttribute(expandedAttr) || "").toLowerCase();
                if (expanded && expanded !== expandedValue) return null;

                const id = triggerEl.getAttribute && triggerEl.getAttribute(controlsAttr);
                if (!id) return null;
                const menu = doc.getElementById(id);
                if (!menu) return null;

                const requireRole = rootConfig.requireRole;
                if (requireRole) {
                    const role = (menu.getAttribute && menu.getAttribute("role")) || "";
                    if (role !== requireRole) return null;
                }

                const requireDataState = rootConfig.requireDataState;
                if (requireDataState) {
                    const state = (menu.getAttribute && menu.getAttribute("data-state") || "").toLowerCase();
                    if (state && state !== String(requireDataState).toLowerCase()) return null;
                }

                if (requireVisible && !isVisible(menu)) return null;
                return menu;
            }

            function isOpen(ctx) {
                return !!getRootElement(ctx);
            }

            async function ensureOpen(ctx, opts = {}) {
                const timeoutMs = opts.timeoutMs ?? timing.waitTimeoutMs;
                const intervalMs = opts.intervalMs ?? timing.pollIntervalMs;
                const openDelayMs = opts.openDelayMs ?? timing.openDelayMs;

                if (isOpen(ctx)) return true;
                if (!activateTrigger(ctx)) return false;
                if (openDelayMs > 0) await sleep(openDelayMs);
                await waitFor(() => isOpen(ctx), { timeoutMs, intervalMs });
                return isOpen(ctx);
            }

            async function ensureSubmenuOpen(ctx, submenuKey, opts = {}) {
                const sub = submenus[submenuKey];
                if (!sub) return false;
                if (!await ensureOpen(ctx, opts)) return false;
                return await sub.ensureOpen(ctx, opts);
            }

            function getOpenMenuRoots(ctx, { includeRoot = true, includeSubmenus = true } = {}) {
                const roots = [];
                if (includeRoot) {
                    const rootEl = getRootElement(ctx);
                    if (rootEl) roots.push(rootEl);
                }
                if (includeSubmenus) {
                    for (const sub of Object.values(submenus)) {
                        if (!sub) continue;
                        const subRoot = sub.getRootElement(ctx);
                        if (subRoot) roots.push(subRoot);
                    }
                }
                return roots;
            }

            async function clickInOpenMenus(ctx, {
                selector,
                textMatch = null,
                normalize = normalizeText,
                fallbackToFirst = false,
                waitForItem = false
            } = {}) {
                const selectorList = resolveSelectorListFromSpec(ctx, selector);
                if (selectorList.length === 0) return false;

                const tryClickOnce = () => {
                    const roots = getOpenMenuRoots(ctx, { includeRoot: true, includeSubmenus: true }).filter(Boolean);
                    if (roots.length === 0) return false;
                    for (const rootEl of roots) {
                        for (const sel of selectorList) {
                            const target = findFirst(rootEl, sel, { textMatch, normalize, fallbackToFirst });
                            if (target && simulateClick(target)) return true;
                        }
                    }
                    return false;
                };

                if (!waitForItem) return tryClickOnce();

                const timeoutMs = timing.waitTimeoutMs ?? DEFAULT_TIMING.waitTimeoutMs;
                const intervalMs = timing.pollIntervalMs ?? DEFAULT_TIMING.pollIntervalMs;
                const start = Date.now();
                while (Date.now() - start < timeoutMs) {
                    if (tryClickOnce()) return true;
                    await sleep(intervalMs);
                }
                return tryClickOnce();
            }

            async function oneStepClick(ctx, {
                selector,
                textMatch = null,
                normalize = normalizeText,
                fallbackToFirst = false,
                openSubmenus = [],
                waitForItem = true
            } = {}) {
                if (!selector) return false;
                if (await clickInOpenMenus(ctx, { selector, textMatch, normalize, fallbackToFirst, waitForItem: false })) return true;

                if (!await ensureOpen(ctx)) return false;

                if (await clickInOpenMenus(ctx, { selector, textMatch, normalize, fallbackToFirst, waitForItem: false })) return true;

                const submenuKeys = Array.isArray(openSubmenus) ? openSubmenus.filter(Boolean) : [];
                for (const key of submenuKeys) {
                    await ensureSubmenuOpen(ctx, key);
                    if (await clickInOpenMenus(ctx, { selector, textMatch, normalize, fallbackToFirst, waitForItem: false })) return true;
                }

                if (!waitForItem) return false;
                return await clickInOpenMenus(ctx, { selector, textMatch, normalize, fallbackToFirst, waitForItem: true });
            }

            function createControllerApi() {
                return {
                    _setParent,
                    timing,
                    getTriggerElement,
                    activateTrigger,
                    getRootElement,
                    isOpen,
                    ensureOpen,
                    ensureSubmenuOpen,
                    getOpenMenuRoots,
                    clickInOpenMenus,
                    oneStepClick
                };
            }

            const api = createControllerApi();
            for (const sub of Object.values(submenus)) {
                if (sub && typeof sub._setParent === "function") sub._setParent(api);
            }
            api.submenus = Object.freeze(submenus);
            return api;
        }

        function buildMenuActions({ menu, defs = [], defaultItemSelector = "", openSubmenus = [] } = {}) {
            const actions = {};
            const list = Array.isArray(defs) ? defs : [];

            for (const def of list) {
                if (!def) continue;
                const actionKey = def.actionKey || def.key;
                const textMatch = def.textMatch;
                const selector = def.selector || defaultItemSelector;
                if (!selector) continue;

                const clickKey = def.customActionKeys?.click;
                const oneStepKey = def.customActionKeys?.oneStep;

                if (actionKey) {
                    actions[actionKey] = ({ engine }) => menu.clickInOpenMenus({ engine }, { selector, textMatch, fallbackToFirst: !!def.fallbackToFirst });
                }
                if (clickKey) {
                    actions[clickKey] = ({ engine }) => menu.clickInOpenMenus({ engine }, { selector, textMatch, fallbackToFirst: !!def.fallbackToFirst });
                }
                if (oneStepKey) {
                    actions[oneStepKey] = ({ engine }) => menu.oneStepClick({ engine }, { selector, textMatch, openSubmenus, fallbackToFirst: !!def.fallbackToFirst });
                }
            }
            return actions;
        }

export {
    createMenuController,
    buildMenuActions
};
