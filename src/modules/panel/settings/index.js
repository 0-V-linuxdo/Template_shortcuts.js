/* -------------------------------------------------------------------------- *
 * Panel Settings · Entry
 * -------------------------------------------------------------------------- */

import { panelCreateDragAndDropController } from "../dnd.js";
import { panelOpenExportDialog, panelOpenImportDialog } from "../io.js";
import { panelOpenShortcutEditor } from "../editor/index.js";
import { panelNormalizeActionType, panelMatchesSearchQuery } from "../filter.js";

export function createSettingsPanelLayer(ctx = {}) {
            const {
                options,
                state,
                core,
                uiShared,
                idPrefix,
                cssPrefix,
                ids,
                classes,
                URL_METHODS,
                getUrlMethodDisplayText,
                setIconImage,
                safeGMGet,
                safeGMSet,
                panelFilter,
                setLocaleMode,
                debounce
            } = ctx;
            const { theme, colors, style, dialogs, layout } = uiShared;
            const { addThemeChangeListener, removeThemeChangeListener, detectInitialDarkMode } = theme;
            const {
                getPrimaryColor,
                getInputBackgroundColor,
                getTextColor,
                getBorderColor,
                getHoverColor
            } = colors;
            const { styleTableHeader, styleTableCell, styleButton, styleTransparentButton, styleInputField } = style;
            const { showConfirmDialog } = dialogs;
	            const { enableScrollLock, disableScrollLock, createResponsiveListener, shouldUseCompactMode } = layout;
                const matchesSearchQuery = panelFilter?.matchesSearchQuery || panelMatchesSearchQuery;
                const normalizeActionType = panelFilter?.normalizeActionType || panelNormalizeActionType;

	            function getShortcutStats() {
	                const list = core.getShortcuts();
	                const query = String(state.searchQuery || "").trim().toLowerCase();
	                const stats = { total: 0, byType: Object.create(null) };
	                list.forEach(shortcut => {
	                    if (!matchesSearchQuery(shortcut, query)) return;
	                    stats.total++;
                        const type = normalizeActionType(shortcut);
                        stats.byType[type] = (stats.byType[type] || 0) + 1;
	                });
	                return stats;
	            }

	            function filterShortcutsByType(type) {
	                const list = core.getShortcuts();
	                const query = String(state.searchQuery || "").trim().toLowerCase();
	                const filtered = [];
	                for (let i = 0; i < list.length; i++) {
	                    const shortcut = list[i];
	                    if (!matchesSearchQuery(shortcut, query)) continue;
                        const shortcutType = normalizeActionType(shortcut);
	                    if (type === 'all' || shortcutType === type) {
	                        filtered.push({ item: shortcut, index: i });
	                    }
	                }
	                return filtered;
	            }

            const ACTION_TYPE_COLOR_MAP = Object.freeze({
                all: "#52525B",
                url: "#4CAF50",
                selector: "#FF9800",
                simulate: "#2196F3",
                custom: "#607D8B"
            });

            const ACTION_TYPE_COLOR_PALETTE = Object.freeze([
                "#009688",
                "#3F51B5",
                "#E91E63",
                "#795548",
                "#673AB7",
                "#00BCD4",
                "#8BC34A",
                "#FFC107",
                "#CDDC39",
                "#FF5722"
            ]);

            function hashStringToNumber(input) {
                const str = String(input || "");
                let hash = 0;
                for (let i = 0; i < str.length; i++) {
                    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
                }
                return Math.abs(hash);
            }

            function getStableTypeColor(type) {
                const idx = hashStringToNumber(type) % ACTION_TYPE_COLOR_PALETTE.length;
                return ACTION_TYPE_COLOR_PALETTE[idx] || ACTION_TYPE_COLOR_MAP.all;
            }

            function getButtonColor(filterType) {
                const type = String(filterType || "").trim();
                if (!type) return ACTION_TYPE_COLOR_MAP.all;
                if (ACTION_TYPE_COLOR_MAP[type]) return ACTION_TYPE_COLOR_MAP[type];
                return getStableTypeColor(type);
            }

            function normalizeHexColor(value) {
                const v = String(value || "").trim();
                return /^#[0-9a-fA-F]{6}$/.test(v) ? v : "";
            }

            const SVG_NS = "http://www.w3.org/2000/svg";

            function createSvgNode(tag, attrs = {}) {
                const node = document.createElementNS(SVG_NS, tag);
                Object.entries(attrs || {}).forEach(([name, value]) => {
                    if (value === null || value === undefined) return;
                    node.setAttribute(name, String(value));
                });
                return node;
            }

            function createActionTypeIcon(typeMeta, iconOptions = {}) {
                const meta = typeMeta && typeof typeMeta === "object" ? typeMeta : {};
                const type = String(meta.type || iconOptions.type || "unknown").trim() || "unknown";
                const titleText = String(meta.label || iconOptions.label || type).trim() || type;
                const size = Number.isFinite(Number(iconOptions.size)) ? Math.max(12, Number(iconOptions.size)) : 18;
                const svg = createSvgNode("svg", {
                    viewBox: "0 0 24 24",
                    fill: "none",
                    "aria-hidden": "true",
                    focusable: "false"
                });
                Object.assign(svg.style, {
                    width: `${size}px`,
                    height: `${size}px`,
                    display: "block",
                    pointerEvents: "none",
                    flexShrink: "0"
                });

                const strokeAttrs = {
                    stroke: "currentColor",
                    "stroke-width": "1.8",
                    "stroke-linecap": "round",
                    "stroke-linejoin": "round"
                };
                const addPath = (d, attrs = {}) => svg.appendChild(createSvgNode("path", { d, ...strokeAttrs, ...attrs }));
                const addRect = (attrs = {}) => svg.appendChild(createSvgNode("rect", { ...strokeAttrs, ...attrs }));
                const addLine = (attrs = {}) => svg.appendChild(createSvgNode("line", { ...strokeAttrs, ...attrs }));

                if (type === "all") {
                    addLine({ x1: "9", y1: "6", x2: "20", y2: "6" });
                    addLine({ x1: "9", y1: "12", x2: "20", y2: "12" });
                    addLine({ x1: "9", y1: "18", x2: "20", y2: "18" });
                    addLine({ x1: "4", y1: "6", x2: "4.01", y2: "6" });
                    addLine({ x1: "4", y1: "12", x2: "4.01", y2: "12" });
                    addLine({ x1: "4", y1: "18", x2: "4.01", y2: "18" });
                } else if (type === "url") {
                    addPath("M10 13a5 5 0 0 0 7.54.54l2.46-2.46a5 5 0 0 0-7.07-7.07l-1.4 1.4");
                    addPath("M14 11a5 5 0 0 0-7.54-.54L4 12.92a5 5 0 0 0 7.07 7.07l1.4-1.4");
                } else if (type === "selector") {
                    addPath("M5 3 19 12 12.5 14.2 10 21 5 3Z");
                    addLine({ x1: "12.5", y1: "14.2", x2: "17", y2: "19" });
                } else if (type === "simulate") {
                    addRect({ x: "3", y: "6", width: "18", height: "12", rx: "2" });
                    addLine({ x1: "7", y1: "10", x2: "7.01", y2: "10" });
                    addLine({ x1: "10.5", y1: "10", x2: "10.51", y2: "10" });
                    addLine({ x1: "13.5", y1: "10", x2: "13.51", y2: "10" });
                    addLine({ x1: "17", y1: "10", x2: "17.01", y2: "10" });
                    addLine({ x1: "7", y1: "14", x2: "17", y2: "14" });
                } else if (type === "custom") {
                    addPath("M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.7-3.7a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9l-3.7 3.7Z");
                } else {
                    addPath("M9.6 3.5a2.4 2.4 0 0 1 4.8 0v1.1h1.1a2.4 2.4 0 0 1 0 4.8h-1.1v1.2h1.2a2.4 2.4 0 0 1 0 4.8h-1.2v1.1a2.4 2.4 0 0 1-4.8 0v-1.1H8.5a2.4 2.4 0 0 1 0-4.8h1.1V9.4H8.5a2.4 2.4 0 0 1 0-4.8h1.1V3.5Z");
                }

                svg.setAttribute("title", titleText);
                return svg;
            }

            function getActionTypeMeta(actionType) {
                const type = String(actionType || "").trim() || "unknown";
                const entry = (typeof core?.actions?.get === "function") ? core.actions.get(type) : null;
                const meta = entry && entry.meta && typeof entry.meta === "object" ? entry.meta : null;

                const builtinLabels = {
                    url: options?.text?.stats?.url || "URL jump",
                    selector: options?.text?.stats?.selector || "Element click",
                    simulate: options?.text?.stats?.simulate || "Key simulation",
                    custom: options?.text?.stats?.custom || "Custom action"
                };
                const labelRaw = builtinLabels[type] || (meta && typeof meta.label === "string" ? meta.label.trim() : "");
                const unknownLabel = options?.text?.actionTypes?.unknownLabel || "Unknown";
                const label = labelRaw || (type === "unknown" ? unknownLabel : type);

                const shortLabelRaw = meta && typeof meta.shortLabel === "string" ? meta.shortLabel.trim() : "";
                let shortLabel = shortLabelRaw;
                if (!shortLabel) {
                    if (type === "url") shortLabel = options?.text?.actionTypes?.urlShortLabel || "URL";
                    else if (type === "selector") shortLabel = options?.text?.actionTypes?.selectorShortLabel || "Click";
                    else if (type === "simulate") shortLabel = options?.text?.actionTypes?.simulateShortLabel || "Keys";
                    else if (type === "custom") shortLabel = options?.text?.actionTypes?.customShortLabel || "Custom";
                    else shortLabel = label.length > 4 ? label.slice(0, 4) : label;
                }

                const color = normalizeHexColor(meta?.color) || getButtonColor(type);

                const builtin = (meta && typeof meta.builtin === "boolean")
                    ? meta.builtin
                    : ["url", "selector", "simulate", "custom"].includes(type);

                return { type, label, shortLabel, color, builtin };
            }

            function getShortcutTargetText(item) {
                if (!item) return "-";
                if (item.actionType === "url") return item.url || "-";
                if (item.actionType === "selector") return item.selector || "-";
                if (item.actionType === "simulate") return item.simulateKeys || "-";
                if (item.actionType === "custom") return item.customAction || "-";
                const data = item.data && typeof item.data === "object" ? item.data : null;
                if (data && Object.keys(data).length > 0) {
                    try {
                        const json = JSON.stringify(data);
                        if (json.length <= 180) return json;
                        return json.slice(0, 177) + "...";
                    } catch {}
                }
                return "-";
            }

            function getShortcutDisplayName(item) {
                return typeof core?.getShortcutDisplayName === "function"
                    ? core.getShortcutDisplayName(item)
                    : String(item?.name || "");
            }

            function updateFilterButtonsState() {
                const buttons = document.querySelectorAll(`.${classes.filterButton}`);
                buttons.forEach(button => {
                    const filterType = button.dataset.filterType;
                    const isActive = state.currentFilter === filterType;
                    const color = filterType === "all"
                        ? getButtonColor("all")
                        : getActionTypeMeta(filterType).color;
                    button.dataset.active = isActive ? "1" : "0";
                    try {
                        const prefix = String(cssPrefix || "").trim();
                        if (prefix) button.style.setProperty(`--${prefix}-filter-color`, color);
                    } catch {}
                });
            }

            function setFilter(filterType) {
                if (state.currentFilter === filterType) return;
                state.currentFilter = filterType;
                updateFilterButtonsState();
                const panel = document.getElementById(ids.settingsPanel);
                if (panel) {
                    const event = new CustomEvent(state.filterChangedEventName, { detail: { filterType } });
                    panel.dispatchEvent(event);
                }
            }

            function createFilterButton(label, count, color, filterType) {
	                const button = document.createElement("button");
	                button.className = classes.filterButton;
	                button.dataset.filterType = filterType;
	                button.type = "button";
                    const labelText = String(label ?? "");
                    button.title = labelText;
                    button.setAttribute("aria-label", `${labelText}: ${String(count ?? "")}`);
	                const isActive = state.currentFilter === filterType;
                    button.dataset.active = isActive ? "1" : "0";
                    try {
                        const prefix = String(cssPrefix || "").trim();
                        if (prefix) button.style.setProperty(`--${prefix}-filter-color`, color);
                    } catch {}

                    const labelSpan = document.createElement("span");
                    labelSpan.className = classes.filterLabel;
                    Object.assign(labelSpan.style, {
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                        lineHeight: "1"
                    });
                    const iconMeta = filterType === "all"
                        ? { type: "all", label: labelText, color, builtin: true }
                        : getActionTypeMeta(filterType);
                    labelSpan.title = iconMeta.label;
                    labelSpan.setAttribute("aria-label", iconMeta.label);
                    labelSpan.appendChild(createActionTypeIcon(iconMeta, { size: 16 }));

                    const labelTextSpan = document.createElement("span");
                    labelTextSpan.className = `${classes.filterLabel}-text`;
                    labelTextSpan.textContent = labelText;
                    labelSpan.appendChild(labelTextSpan);

                    const countSpan = document.createElement("span");
                    countSpan.className = classes.filterCount;
                    countSpan.textContent = String(count ?? "");

                    button.appendChild(labelSpan);
                    button.appendChild(countSpan);

                button.addEventListener('click', () => {
                    setFilter(filterType);
                });
                return button;
            }

		            function createStatsDisplay() {
		                const stats = getShortcutStats();
		                const container = document.createElement("div");
		                container.id = ids.stats;
		                Object.assign(container.style, {
		                    position: "relative",
		                    flex: "0 1 auto",
		                    minWidth: "0"
		                });

		                const SCROLLBAR_HEIGHT_PX = 18;
		                const scrollbar = document.createElement("div");
		                Object.assign(scrollbar.style, {
		                    position: "absolute",
		                    left: "0",
		                    right: "0",
		                    top: `-${SCROLLBAR_HEIGHT_PX}px`,
		                    height: `${SCROLLBAR_HEIGHT_PX}px`,
		                    zIndex: "1",
		                    overflowX: "auto",
		                    overflowY: "hidden",
		                    WebkitOverflowScrolling: "touch",
		                    display: "none"
		                });

		                const scrollbarSpacer = document.createElement("div");
		                Object.assign(scrollbarSpacer.style, {
		                    width: "0px",
		                    height: "1px"
		                });
		                scrollbar.appendChild(scrollbarSpacer);

		                const viewport = document.createElement("div");
		                Object.assign(viewport.style, {
		                    width: "100%",
		                    boxSizing: "border-box",
		                    padding: "2px 0",
		                    overflowX: "hidden",
		                    overflowY: "hidden"
		                });

		                const row = document.createElement("div");
		                Object.assign(row.style, {
		                    display: "inline-flex",
		                    alignItems: "center",
		                    gap: "8px",
		                    flexWrap: "nowrap",
		                    willChange: "transform"
		                });

                        const byType = stats?.byType && typeof stats.byType === "object" ? stats.byType : {};
                        const presentTypes = Object.keys(byType).filter((type) => type && byType[type] > 0);
                        const builtinOrder = Array.isArray(core?.actions?.builtins)
                            ? core.actions.builtins.slice()
                            : ["url", "selector", "simulate", "custom"];

		                const filterButtons = [
		                    { type: 'all', label: options.text.stats.total || "Total", count: stats.total, color: getButtonColor("all") }
		                ];

                        builtinOrder.forEach((type) => {
                            const count = byType[type] || 0;
                            if (!count) return;
                            const meta = getActionTypeMeta(type);
                            filterButtons.push({ type, label: meta.label, count, color: meta.color });
                        });

                        const builtinSet = new Set(builtinOrder);
                        const extraButtons = presentTypes
                            .filter((type) => !builtinSet.has(type))
                            .map((type) => {
                                const meta = getActionTypeMeta(type);
                                return { type, label: meta.label, count: byType[type], color: meta.color };
                            })
                            .sort((a, b) => String(a.label).localeCompare(String(b.label), state.effectiveLocale || "zh-CN", { numeric: true }));

                        extraButtons.forEach((btn) => filterButtons.push(btn));
		                filterButtons.forEach(buttonData => {
		                    if (buttonData.type !== 'all' && buttonData.count === 0) return;
		                    const button = createFilterButton(buttonData.label, buttonData.count, buttonData.color, buttonData.type);
		                    row.appendChild(button);
		                });

		                const sync = () => {
		                    if (!container.isConnected) return;
		                    const viewportWidth = viewport.clientWidth || 0;
		                    const contentWidth = row.scrollWidth || 0;
		                    const hasOverflow = contentWidth > viewportWidth + 1;
		                    scrollbar.style.display = hasOverflow ? "block" : "none";
		                    if (!hasOverflow) {
		                        scrollbar.scrollLeft = 0;
		                        scrollbarSpacer.style.width = "0px";
		                        row.style.transform = "";
		                        return;
		                    }
		                    scrollbarSpacer.style.width = `${contentWidth}px`;
		                    const maxScroll = Math.max(0, contentWidth - viewportWidth);
		                    if (scrollbar.scrollLeft > maxScroll) scrollbar.scrollLeft = maxScroll;
		                    row.style.transform = `translateX(${-scrollbar.scrollLeft}px)`;
		                };

		                const scheduleSync = debounce(() => {
		                    requestAnimationFrame(() => {
		                        try { sync(); } catch {}
		                    });
		                }, 60);

		                scrollbar.addEventListener("scroll", () => {
		                    requestAnimationFrame(() => {
		                        row.style.transform = `translateX(${-scrollbar.scrollLeft}px)`;
		                    });
		                });

		                viewport.addEventListener(
		                    "wheel",
		                    (e) => {
		                        if (scrollbar.style.display === "none") return;
		                        const deltaX = Number(e.deltaX || 0);
		                        const deltaY = Number(e.deltaY || 0);
		                        const delta = Math.abs(deltaX) > 0 ? deltaX : (e.shiftKey ? deltaY : 0);
		                        if (!delta) return;
		                        e.preventDefault();
		                        scrollbar.scrollLeft += delta;
		                    },
		                    { passive: false }
		                );

		                let cleanup = () => {};
		                if (window.ResizeObserver) {
		                    const ro = new ResizeObserver(() => scheduleSync());
		                    ro.observe(container);
		                    ro.observe(row);
		                    cleanup = () => {
		                        try { ro.disconnect(); } catch {}
		                    };
		                } else {
		                    window.addEventListener("resize", scheduleSync);
		                    cleanup = () => {
		                        try { window.removeEventListener("resize", scheduleSync); } catch {}
		                    };
		                }
		                container.__shortcutTemplateStatsCleanup = cleanup;

		                viewport.appendChild(row);
		                container.appendChild(scrollbar);
		                container.appendChild(viewport);

		                requestAnimationFrame(() => {
		                    try { sync(); } catch {}
		                });
		                return container;
		            }

	            function updateStatsDisplay() {
	                const existingStats = document.getElementById(ids.stats);
	                if (existingStats) {
	                    if (typeof existingStats.__shortcutTemplateStatsCleanup === "function") {
	                        try { existingStats.__shortcutTemplateStatsCleanup(); } catch {}
	                    }
	                    const newStats = createStatsDisplay();
	                    existingStats.parentNode.replaceChild(newStats, existingStats);
	                }
	            }

	            /* ------------------------------------------------------------------
	             * 设置面板
	             * ------------------------------------------------------------------ */

	            function closeSettingsPanel() {
	                if (typeof state.currentPanelCloser === "function") {
	                    state.currentPanelCloser();
	                    return;
	                }
	                if (state.currentPanelOverlay) {
	                    if (typeof state.currentEditCloser === "function") {
	                        try { state.currentEditCloser(); } catch {}
	                    }
	                    try { state.currentPanelOverlay.remove(); } catch {}
	                    state.currentPanelOverlay = null;
	                    state.isSettingsPanelOpen = false;
	                    disableScrollLock();
	                    if (state.destroyResponsiveListener) {
	                        state.destroyResponsiveListener();
	                        state.destroyResponsiveListener = null;
	                    }
	                }
	            }

	        function openSettingsPanel() {
	            if (typeof state.currentPanelCloser === "function") {
	                closeSettingsPanel();
	                return;
	            }
	            if (state.currentPanelOverlay) {
	                try { state.currentPanelOverlay.remove(); } catch {}
	                state.currentPanelOverlay = null;
	            }
	            state.isSettingsPanelOpen = true;
	            enableScrollLock();

            const overlay = document.createElement("div");
            overlay.id = ids.settingsOverlay;
            overlay.className = classes.overlay;
            overlay.style.zIndex = "99998";
            overlay.onclick = (e) => { if (e.target === overlay) closePanel(); };

            const panel = document.createElement("div");
            panel.id = ids.settingsPanel;
            panel.className = classes.panel;
            Object.assign(panel.style, {
                opacity: "0", transform: "translateY(20px)",
                transition: "opacity 0.3s ease, transform 0.3s ease",
                maxHeight: "90vh", overflowY: "auto",
                width: "100%", maxWidth: "900px",
                minWidth: "320px"
            });
            panel.onclick = (e) => e.stopPropagation();

		            const headerContainer = document.createElement("div");
		            Object.assign(headerContainer.style, {
		                display: "flex",
		                justifyContent: "flex-start",
		                alignItems: "center",
		                marginBottom: "15px",
		                paddingBottom: "10px",
		                flexWrap: "nowrap",
		                gap: "10px",
		                minWidth: "0"
		            });

		            const leftSlot = document.createElement("div");
		            Object.assign(leftSlot.style, {
		                display: "flex",
		                alignItems: "center",
		                gap: "10px",
		                flex: "1 1 auto",
		                minWidth: "0"
		            });

			            const actionsContainer = document.createElement("div");
				            Object.assign(actionsContainer.style, {
				                display: "flex",
				                alignItems: "center",
				                justifyContent: "flex-end",
				                gap: "6px",
				                flex: "0 0 auto"
				            });

			            const title = document.createElement("h2");
			            title.textContent = options.panelTitle || 'Custom shortcuts';
			            Object.assign(title.style, {
			                margin: "0",
			                fontSize: "1.1em",
			                flex: "1 1 auto",
			                minWidth: "0",
			                overflow: "hidden",
			                textOverflow: "ellipsis",
			                whiteSpace: "nowrap"
			            });

		            const settingsBtn = document.createElement("button");
		            settingsBtn.type = "button";
		            settingsBtn.title = options.text.buttons.settings || "Settings";
                    settingsBtn.setAttribute("aria-label", options.text.buttons.settings || "Settings");
	            Object.assign(settingsBtn.style, {
	                width: "32px",
	                height: "32px",
	                display: "flex",
	                alignItems: "center",
	                justifyContent: "center",
	                padding: "0",
                    lineHeight: "1"
	            });
                    const settingsIcon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                    settingsIcon.setAttribute("viewBox", "0 0 24 24");
                    settingsIcon.setAttribute("fill", "none");
                    settingsIcon.setAttribute("aria-hidden", "true");
                    Object.assign(settingsIcon.style, {
                        width: "18px",
                        height: "18px",
                        display: "block",
                        pointerEvents: "none"
                    });
                    const iconStrokeAttrs = {
                        stroke: "currentColor",
                        "stroke-width": "1.7",
                        "stroke-linecap": "round",
                        "stroke-linejoin": "round"
                    };
                    const createIconNode = (tag, attrs = {}) => {
                        const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
                        Object.entries(attrs).forEach(([name, value]) => node.setAttribute(name, String(value)));
                        return node;
                    };
                    settingsIcon.appendChild(createIconNode("path", {
                        d: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 0 0-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 0 0-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 0 0-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 0 0-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 0 0 1.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.607 2.296.07 2.572-1.065Z",
                        ...iconStrokeAttrs
                    }));
                    settingsIcon.appendChild(createIconNode("circle", { cx: "12", cy: "12", r: "3.2", ...iconStrokeAttrs }));
                    settingsBtn.replaceChildren(settingsIcon);

			            const searchWidget = document.createElement("div");
			            Object.assign(searchWidget.style, {
			                display: "flex",
			                alignItems: "center",
			                width: "32px",
			                flex: "0 0 32px",
			                height: "32px",
			                maxWidth: "100%",
			                overflow: "hidden",
			                boxSizing: "border-box",
			                transition: "width 0.2s ease"
	            });

	            const searchIconBtn = document.createElement("button");
	            searchIconBtn.type = "button";
	            searchIconBtn.title = options.text.hints.searchPlaceholder || "Search";
                    searchIconBtn.setAttribute("aria-label", options.text.hints.searchPlaceholder || "Search");
	            Object.assign(searchIconBtn.style, {
	                width: "32px",
	                height: "32px",
	                display: "flex",
	                alignItems: "center",
	                justifyContent: "center",
	                fontSize: "16px",
	                lineHeight: "1",
	                border: "none",
	                backgroundColor: "transparent",
	                padding: "0",
	                flex: "0 0 32px"
	            });
                    const searchIcon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                    searchIcon.setAttribute("viewBox", "0 0 24 24");
                    searchIcon.setAttribute("fill", "none");
                    searchIcon.setAttribute("aria-hidden", "true");
                    Object.assign(searchIcon.style, {
                        width: "18px",
                        height: "18px",
                        display: "block",
                        pointerEvents: "none"
                    });
                    searchIcon.appendChild(createIconNode("circle", { cx: "10.5", cy: "10.5", r: "5.5", ...iconStrokeAttrs }));
                    searchIcon.appendChild(createIconNode("path", { d: "M15 15l4.5 4.5", ...iconStrokeAttrs }));
                    searchIconBtn.replaceChildren(searchIcon);

	            const searchInput = document.createElement("input");
	            searchInput.type = "text";
	            searchInput.placeholder = options.text.hints.searchPlaceholder || "Search name/target";
	            searchInput.value = String(state.searchQuery || "");
	            Object.assign(searchInput.style, {
	                flex: "1 1 auto",
	                minWidth: "0",
	                height: "32px",
	                border: "none",
	                outline: "none",
	                backgroundColor: "transparent",
	                padding: "0 4px",
	                fontSize: "14px",
	                display: "none"
	            });

		            const clearSearchBtn = document.createElement("button");
		            clearSearchBtn.type = "button";
		            clearSearchBtn.title = options.text.buttons.clear || "Clear";
		            clearSearchBtn.textContent = "×";
		        Object.assign(clearSearchBtn.style, {
		            width: "32px",
		            height: "32px",
		            display: "none",
		            alignItems: "center",
		            justifyContent: "center",
		            fontSize: "18px",
		            lineHeight: "1",
		            border: "none",
		            backgroundColor: "transparent",
		            padding: "0",
		            flex: "0 0 32px"
		        });

		            const searchDivider = document.createElement("div");
		            Object.assign(searchDivider.style, {
		                width: "1px",
		                height: "60%",
		                alignSelf: "center",
		                flex: "0 0 1px",
		                opacity: "0.6",
		                display: "none"
		            });

		            let isSearchExpanded = !!String(state.searchQuery || "").trim();

		            const refreshSearchWidgetStyle = (isDark = state.isDarkMode) => {
		                const hasValue = !!String(searchInput.value || "").trim();
		                const active = isSearchExpanded || hasValue;
		                searchWidget.style.borderColor = active ? getPrimaryColor() : getBorderColor(isDark);
		            searchIconBtn.style.color = active ? getPrimaryColor() : getTextColor(isDark);
		                searchDivider.style.backgroundColor = active ? getPrimaryColor() : getBorderColor(isDark);
		        };

	            const updateClearSearchVisibility = () => {
	                const hasValue = !!String(searchInput.value || "").trim();
	                clearSearchBtn.style.display = isSearchExpanded && hasValue ? "flex" : "none";
	            };

		            const setSearchExpanded = (expanded, { focus = false } = {}) => {
		                isSearchExpanded = !!expanded;
		                title.style.display = isSearchExpanded ? "none" : "";
		                searchWidget.style.flex = isSearchExpanded ? "1 1 auto" : "0 0 32px";
		                searchWidget.style.width = isSearchExpanded ? "100%" : "32px";
		                searchInput.style.display = isSearchExpanded ? "block" : "none";
		                searchDivider.style.display = isSearchExpanded ? "block" : "none";
		                updateClearSearchVisibility();
		                refreshSearchWidgetStyle();
		                if (isSearchExpanded) {
		                    if (focus) {
			                        searchInput.focus();
			                        searchInput.select();
		                    }
	                    return;
	                }
	                if (focus || document.activeElement === searchInput) {
	                    searchIconBtn.focus();
	                }
	            };

			            const applySearchImmediate = () => {
			                state.searchQuery = searchInput.value.trim();
			                renderShortcutsList(state.isDarkMode);
			                updateStatsDisplay();
			            };

	            const applySearchDebounced = debounce(applySearchImmediate, 120);

	            searchInput.addEventListener("input", () => {
	                updateClearSearchVisibility();
	                refreshSearchWidgetStyle();
	                applySearchDebounced();
	            });
	            searchInput.addEventListener("keydown", (e) => {
	                if (e.key === "Escape") {
	                    e.preventDefault();
	                    if (String(searchInput.value || "").trim()) {
	                        searchInput.value = "";
	                        updateClearSearchVisibility();
	                        applySearchImmediate();
	                    } else {
	                        setSearchExpanded(false, { focus: true });
	                    }
	                }
	            });
	            clearSearchBtn.addEventListener("click", () => {
	                searchInput.value = "";
	                updateClearSearchVisibility();
	                refreshSearchWidgetStyle();
	                applySearchImmediate();
	                searchInput.focus();
	            });
	            searchIconBtn.addEventListener("click", () => {
	                if (!isSearchExpanded) {
	                    setSearchExpanded(true, { focus: true });
	                    return;
	                }
	                if (!String(searchInput.value || "").trim()) {
	                    setSearchExpanded(false, { focus: true });
	                    return;
	                }
	                searchInput.focus();
	                searchInput.select();
	            });
	            searchInput.addEventListener("focus", () => {
	                if (!isSearchExpanded) {
	                    setSearchExpanded(true, { focus: true });
	                    return;
	                }
	                searchIconBtn.style.backgroundColor = "transparent";
	                clearSearchBtn.style.backgroundColor = "transparent";
	                searchWidget.style.borderColor = getPrimaryColor();
	                searchWidget.style.boxShadow = `0 0 0 1px ${getPrimaryColor()}`;
	            });
	            searchInput.addEventListener("blur", () => {
	                searchWidget.style.boxShadow = "none";
	                refreshSearchWidgetStyle();
	            });

		            updateClearSearchVisibility();
		            setSearchExpanded(isSearchExpanded);

		            const statsContainer = createStatsDisplay();
		
		            searchWidget.appendChild(searchInput);
		            searchWidget.appendChild(clearSearchBtn);
		            searchWidget.appendChild(searchDivider);
		            searchWidget.appendChild(searchIconBtn);

		            leftSlot.appendChild(title);
		            leftSlot.appendChild(searchWidget);
		            headerContainer.appendChild(leftSlot);
		            headerContainer.appendChild(statsContainer);

		            actionsContainer.appendChild(settingsBtn);
		            headerContainer.appendChild(actionsContainer);

	            panel.appendChild(headerContainer);

	            const listContainer = document.createElement("div");
		            Object.assign(listContainer.style, {
		                maxHeight: "calc(80vh - 150px)", overflowY: "auto", marginBottom: "15px",
		                width: "100%", overflowX: "hidden"
		            });
		            panel.appendChild(listContainer);

                    const dnd = panelCreateDragAndDropController(ctx, { renderShortcutsList, updateStatsDisplay });

			            function openExportDialog() {
			                panelOpenExportDialog(ctx, { overlay });
			            }

		            function openImportDialog() {
		                panelOpenImportDialog(ctx, { overlay, renderShortcutsList, updateStatsDisplay });
		            }

	            function resetToDefaults() {
	                const defaults = Array.isArray(options.defaultShortcuts) ? options.defaultShortcuts : [];
	                const normalized = defaults.map((sc) => core.normalizeShortcut(sc));
	                core.setShortcuts(normalized, { persist: false });
	                state.currentFilter = "all";
	                state.searchQuery = "";
	                searchInput.value = "";
	                updateClearSearchVisibility();
	                setSearchExpanded(false);
	                renderShortcutsList(state.isDarkMode);
	                updateStatsDisplay();
	            }

	            const bottomBar = document.createElement("div");
	            Object.assign(bottomBar.style, {
	                display: "flex", justifyContent: "space-between", alignItems: "center",
	                marginTop: "10px", flexWrap: "wrap", gap: "10px"
	            });

	            const leftBar = document.createElement("div");
	            Object.assign(leftBar.style, {
	                display: "flex",
	                alignItems: "center",
	                gap: "10px",
	                flexWrap: "wrap"
	            });
	            bottomBar.appendChild(leftBar);

	            const addBtn = document.createElement("button");
	            addBtn.textContent = options.text.buttons.addShortcut || "Add shortcut";
	            addBtn.onclick = () => { editShortcut(); };
	            leftBar.appendChild(addBtn);

	            let settingsMenuOverlay = null;
	            let settingsMenuKeydownHandler = null;

	            function closeSettingsMenu({ restoreFocus = true } = {}) {
	                if (!settingsMenuOverlay) return;
	                if (typeof settingsMenuKeydownHandler === "function") {
	                    document.removeEventListener("keydown", settingsMenuKeydownHandler, true);
	                }
	                try { settingsMenuOverlay.remove(); } catch {}
	                settingsMenuOverlay = null;
	                settingsMenuKeydownHandler = null;
	                if (restoreFocus) {
	                    try { settingsBtn.focus(); } catch {}
	                }
	            }

	            function openSettingsMenu() {
	                if (settingsMenuOverlay) {
	                    closeSettingsMenu();
	                    return;
	                }

	                const modal = document.createElement("div");
	                settingsMenuOverlay = modal;
                    modal.className = classes?.overlay || "";
                    modal.style.zIndex = "999999";
	                modal.onclick = (e) => {
	                    if (e.target === modal) closeSettingsMenu();
	                };

	                const dialog = document.createElement("div");
                    dialog.className = classes?.panel || "";
	                Object.assign(dialog.style, {
	                    width: "100%",
	                    maxWidth: "420px",
	                    borderRadius: "10px",
	                    padding: "18px",
	                    boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
	                    display: "flex",
	                    flexDirection: "column",
	                    gap: "12px"
	                });
	                dialog.onclick = (e) => e.stopPropagation();

	                const head = document.createElement("div");
	                Object.assign(head.style, {
	                    display: "flex",
	                    alignItems: "center",
	                    justifyContent: "space-between",
	                    gap: "10px"
	                });

	                const titleEl = document.createElement("h3");
	                titleEl.textContent = options.text.buttons.settings || "Settings";
	                Object.assign(titleEl.style, {
	                    margin: "0",
	                    fontSize: "1.05em",
	                    fontWeight: "bold"
	                });
	                head.appendChild(titleEl);

	                const closeBtn = document.createElement("button");
	                closeBtn.type = "button";
	                closeBtn.title = options.text.buttons.close || "Close";
	                closeBtn.textContent = "×";
	                Object.assign(closeBtn.style, {
	                    fontSize: "20px",
	                    lineHeight: "1"
	                });
	                closeBtn.onclick = () => closeSettingsMenu();
	                head.appendChild(closeBtn);

	                dialog.appendChild(head);
                    const p = String(cssPrefix || idPrefix || "shortcut").trim() || "shortcut";
                    styleTransparentButton(closeBtn, `var(--${p}-text)`, `var(--${p}-hover-bg)`);
                    closeBtn.style.padding = "6px 8px";
                    closeBtn.style.borderRadius = "6px";

                    const themeRow = document.createElement("div");
                    Object.assign(themeRow.style, {
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "12px"
                    });

                    const themeLabel = document.createElement("div");
                    themeLabel.textContent = options?.text?.panel?.themeModeLabel || "Panel theme";
                    Object.assign(themeLabel.style, {
                        fontSize: "14px",
                        fontWeight: "bold"
                    });

                    const themeSelect = document.createElement("select");
                    Object.assign(themeSelect.style, {
                        flex: "0 0 200px",
                        maxWidth: "100%"
                    });
                    styleInputField(themeSelect);

                    const persistUiPrefs = (patch = {}) => {
                        const key = options?.storageKeys?.uiPrefs;
                        if (!key) return;
                        const raw = safeGMGet(key, null);
                        const prev = (raw && typeof raw === "object" && !Array.isArray(raw)) ? raw : {};
                        safeGMSet(key, { ...prev, ...patch });
                    };

                    const addThemeOption = (value, label) => {
                        const opt = document.createElement("option");
                        opt.value = value;
                        opt.textContent = label;
                        themeSelect.appendChild(opt);
                    };

                    addThemeOption("auto", options?.text?.panel?.themeModeAuto || "Auto (follow page)");
                    addThemeOption("light", options?.text?.panel?.themeModeLight || "Light");
                    addThemeOption("dark", options?.text?.panel?.themeModeDark || "Dark");

                    themeSelect.value = String(state.themeMode || "auto");
                    themeSelect.onchange = () => {
                        state.themeMode = String(themeSelect.value || "auto");
                        persistUiPrefs({ themeMode: state.themeMode });
                        detectInitialDarkMode();
                    };

                    themeRow.appendChild(themeLabel);
                    themeRow.appendChild(themeSelect);
                    dialog.appendChild(themeRow);

                    const localeRow = document.createElement("div");
                    Object.assign(localeRow.style, {
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "12px"
                    });

                    const localeLabel = document.createElement("div");
                    localeLabel.textContent = options?.text?.panel?.languageLabel || "Interface language";
                    Object.assign(localeLabel.style, {
                        fontSize: "14px",
                        fontWeight: "bold"
                    });

                    const localeSelect = document.createElement("select");
                    Object.assign(localeSelect.style, {
                        flex: "0 0 200px",
                        maxWidth: "100%"
                    });
                    styleInputField(localeSelect);

                    const addLocaleOption = (value, label) => {
                        const opt = document.createElement("option");
                        opt.value = value;
                        opt.textContent = label;
                        localeSelect.appendChild(opt);
                    };

                    addLocaleOption("auto", options?.text?.panel?.languageAuto || "Auto (follow browser)");
                    addLocaleOption("zh-CN", options?.text?.panel?.languageZhCN || "Simplified Chinese");
                    addLocaleOption("en-US", options?.text?.panel?.languageEnUS || "English");

                    localeSelect.value = String(state.localeMode || "auto");
                    localeSelect.onchange = () => {
                        const nextMode = String(localeSelect.value || "auto");
                        if (typeof setLocaleMode === "function") {
                            setLocaleMode(nextMode, { persist: true, refreshPanel: true });
                        } else {
                            state.localeMode = nextMode;
                            persistUiPrefs({ localeMode: state.localeMode });
                        }
                    };

                    localeRow.appendChild(localeLabel);
                    localeRow.appendChild(localeSelect);
                    dialog.appendChild(localeRow);

                    const actionsLabel = document.createElement("div");
                    actionsLabel.textContent = options?.text?.panel?.actionsLabel || "Script config";
                    Object.assign(actionsLabel.style, {
                        fontSize: "14px",
                        fontWeight: "bold",
                        marginTop: "2px"
                    });
                    dialog.appendChild(actionsLabel);

	                const actions = document.createElement("div");
	                Object.assign(actions.style, {
	                    display: "flex",
	                    flexDirection: "row",
                        alignItems: "stretch",
                        flexWrap: "nowrap",
	                    gap: "10px"
	                });

	                const resetActionBtn = document.createElement("button");
	                resetActionBtn.textContent = options.text.buttons.reset || "Reset defaults";
	                resetActionBtn.onclick = () => {
	                    closeSettingsMenu({ restoreFocus: false });
	                    showConfirmDialog(options?.text?.panel?.resetConfirm || "Reset to the default configuration? Changes are saved only after clicking \"Save and close\".", () => {
	                        resetToDefaults();
	                    });
	                };
	                actions.appendChild(resetActionBtn);
                    styleButton(resetActionBtn, "#9E9E9E", "#757575");

	                const importActionBtn = document.createElement("button");
	                importActionBtn.textContent = options.text.buttons.import || "Import";
	                importActionBtn.onclick = () => {
	                    closeSettingsMenu({ restoreFocus: false });
	                    openImportDialog();
	                };
	                actions.appendChild(importActionBtn);
                    styleButton(importActionBtn, "#2196F3", "#1e88e5");

	                const exportActionBtn = document.createElement("button");
	                exportActionBtn.textContent = options.text.buttons.export || "Export";
	                exportActionBtn.onclick = () => {
	                    closeSettingsMenu({ restoreFocus: false });
	                    openExportDialog();
	                };
	                actions.appendChild(exportActionBtn);
                    styleButton(exportActionBtn, "#4CAF50", "#45A049");

                    [resetActionBtn, importActionBtn, exportActionBtn].forEach(btn => {
                        btn.style.flex = "1 1 0";
                        btn.style.minWidth = "0";
                    });

	                dialog.appendChild(actions);
	                modal.appendChild(dialog);
	                document.body.appendChild(modal);

	                settingsMenuKeydownHandler = (e) => {
	                    if (e.key === "Escape") {
	                        e.preventDefault();
	                        closeSettingsMenu();
	                    }
	                };
	                document.addEventListener("keydown", settingsMenuKeydownHandler, true);
	                closeBtn.focus();
	            }

	            settingsBtn.onclick = openSettingsMenu;

	            const saveBtn = document.createElement("button");
	            saveBtn.textContent = options.text.buttons.saveAndClose || "Save and close";
	            saveBtn.onclick = () => { core.persistShortcuts(); closePanel(); };
	            bottomBar.appendChild(saveBtn);

            panel.appendChild(bottomBar);
            overlay.appendChild(panel);
	            document.body.appendChild(overlay);
	            state.currentPanelOverlay = overlay;
	            state.currentPanelCloser = closePanel;
	
		            state.isCompactMode = shouldUseCompactMode(panel);

            panel.addEventListener(state.filterChangedEventName, () => {
                renderShortcutsList(state.isDarkMode);
            });

	            const updatePanelTheme = (isDark) => {
	                headerContainer.style.borderBottom = `1px solid ${getBorderColor(isDark)}`;
	                title.style.color = getTextColor(isDark);
	                styleButton(addBtn, "#FF9800", "#F57C00");
	                styleButton(saveBtn, "#4CAF50", "#45A049");
	                Object.assign(settingsBtn.style, {
	                    border: `1px solid ${getBorderColor(isDark)}`,
	                    borderRadius: "6px",
	                    backgroundColor: getInputBackgroundColor(isDark),
	                    color: getTextColor(isDark),
	                    cursor: "pointer",
	                    transition: "background-color 0.2s ease, border-color 0.2s ease"
	                });
	                settingsBtn.onmouseover = () => {
	                    settingsBtn.style.backgroundColor = getHoverColor(isDark);
	                    settingsBtn.style.borderColor = getPrimaryColor();
	                };
	                settingsBtn.onmouseout = () => {
	                    settingsBtn.style.backgroundColor = getInputBackgroundColor(isDark);
	                    settingsBtn.style.borderColor = getBorderColor(isDark);
	                };

	                Object.assign(searchWidget.style, {
	                    border: `1px solid ${getBorderColor(isDark)}`,
	                    borderRadius: "6px",
	                    backgroundColor: getInputBackgroundColor(isDark),
	                    color: getTextColor(isDark),
	                    transition: "width 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease, background-color 0.2s ease"
	                });
	                searchWidget.onmouseover = () => {
	                    if (document.activeElement === searchInput) return;
	                    searchWidget.style.backgroundColor = getHoverColor(isDark);
	                };
	                searchWidget.onmouseout = () => {
	                    if (document.activeElement === searchInput) return;
	                    searchWidget.style.backgroundColor = getInputBackgroundColor(isDark);
	                };

	                Object.assign(searchIconBtn.style, {
	                    color: getTextColor(isDark),
	                    cursor: "pointer",
	                    borderRadius: "6px",
	                    outline: "none",
	                    transition: "background-color 0.2s ease, color 0.2s ease"
	                });
	                searchIconBtn.onmouseover = () => {
	                    if (document.activeElement === searchInput) return;
	                    searchIconBtn.style.backgroundColor = getHoverColor(isDark);
	                };
	                searchIconBtn.onmouseout = () => {
	                    searchIconBtn.style.backgroundColor = "transparent";
	                };

	                Object.assign(searchInput.style, {
	                    color: getTextColor(isDark),
	                    caretColor: getPrimaryColor()
	                });

	                Object.assign(clearSearchBtn.style, {
	                    color: getTextColor(isDark),
	                    cursor: "pointer",
	                    borderRadius: "6px",
	                    outline: "none",
	                    transition: "background-color 0.2s ease, color 0.2s ease"
	                });
	                clearSearchBtn.onmouseover = () => {
	                    if (document.activeElement === searchInput) return;
	                    clearSearchBtn.style.backgroundColor = getHoverColor(isDark);
	                };
	                clearSearchBtn.onmouseout = () => {
	                    clearSearchBtn.style.backgroundColor = "transparent";
	                };

	                refreshSearchWidgetStyle(isDark);
	                renderShortcutsList(isDark);
	            };

            addThemeChangeListener(updatePanelTheme);
            updatePanelTheme(state.isDarkMode);

	            requestAnimationFrame(() => {
	                panel.style.opacity = "1";
	                panel.style.transform = "translateY(0)";
	                setTimeout(() => {
	                    if (!state.isSettingsPanelOpen) return;
	                    const destroyResponsiveListener = createResponsiveListener(panel, (compactMode) => {
	                        renderShortcutsList(state.isDarkMode, compactMode);
	                    });
		                    state.destroyResponsiveListener = () => {
		                        try { destroyResponsiveListener && destroyResponsiveListener(); } catch {}
		                    };
		                }, 100);
		            });

	            function renderShortcutsList(isDark = state.isDarkMode, forceCompactMode = null) {
	                const useCompactMode = forceCompactMode !== null ? forceCompactMode : shouldUseCompactMode(panel);
	                listContainer.replaceChildren();
	                if (useCompactMode) {
	                    renderCompactShortcutsList(isDark);
	                } else {
	                    renderStandardShortcutsList(isDark);
	                }
	            }

            function renderStandardShortcutsList(isDark = state.isDarkMode) {
                const filteredShortcuts = filterShortcutsByType(state.currentFilter);
                const table = document.createElement("table");
                table.style.width = "100%";
                table.style.borderCollapse = "collapse";
                table.style.tableLayout = "fixed";

                const thead = document.createElement("thead");
                const headRow = document.createElement("tr");
                const tableHeaders = options?.text?.panel?.tableHeaders || {};
                const headers = [
                    { text: tableHeaders.icon || "Icon", width: "60px", align: "center" },
                    { text: tableHeaders.name || "Name", width: "15%" },
                    { text: tableHeaders.type || "Type", width: "80px", align: "center" },
                    { text: tableHeaders.target || "Target", width: "40%" },
                    { text: tableHeaders.hotkey || "Shortcut", width: "15%" },
                    { text: tableHeaders.actions || "Actions", width: "120px", align: "center" }
                ];
                headers.forEach(header => {
                    const th = document.createElement("th");
                    th.innerText = header.text;
                    styleTableHeader(th, isDark);
                    if (header.width) th.style.width = header.width;
                    if (header.align) th.style.textAlign = header.align;
                    th.style.whiteSpace = "nowrap";
                    th.style.overflow = "hidden";
                    th.style.textOverflow = "ellipsis";
                    headRow.appendChild(th);
                });
                thead.appendChild(headRow);
                table.appendChild(thead);

                const tbody = document.createElement("tbody");
                tbody.id = ids.tableBody;

                filteredShortcuts.forEach(({ item, index }) => {
                    const row = createStandardTableRow(item, index, isDark);
                    tbody.appendChild(row);
                });

                table.appendChild(tbody);
                listContainer.appendChild(table);
            }

            function renderCompactShortcutsList(isDark = state.isDarkMode) {
                const filteredShortcuts = filterShortcutsByType(state.currentFilter);
                const container = document.createElement("div");
                container.className = classes.compactContainer;
                Object.assign(container.style, {
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                    width: "100%",
                    alignItems: "flex-start"
                });

                filteredShortcuts.forEach(({ item, index }) => {
                    const card = createCompactCard(item, index, isDark);
                    container.appendChild(card);
                });
                listContainer.appendChild(container);
            }

            function createShortcutIconPreview(item) {
                const iconBox = document.createElement("span");
                Object.assign(iconBox.style, {
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "32px",
                    height: "32px",
                    lineHeight: "0",
                    verticalAlign: "middle"
                });

                const iconImg = document.createElement("img");
                Object.assign(iconImg.style, {
                    width: "24px",
                    height: "24px",
                    objectFit: "contain",
                    display: "block",
                    flexShrink: "0"
                });
                iconBox.appendChild(iconImg);
                setIconImage(iconImg, item.icon, item.iconDark, item.iconAdaptive);
                return iconBox;
            }

            function createStandardTableRow(item, index, isDark) {
                const row = document.createElement("tr");
                dnd.setupDragAndDrop(row, item, index);

                const tdIcon = document.createElement("td");
                styleTableCell(tdIcon, isDark);
                tdIcon.style.textAlign = "center";
                tdIcon.appendChild(createShortcutIconPreview(item));

                const tdName = document.createElement("td");
                tdName.textContent = getShortcutDisplayName(item);
                styleTableCell(tdName, isDark);

                const tdType = document.createElement("td");
                const typeMeta = getActionTypeMeta(item.actionType);
                tdType.title = typeMeta.label;
                tdType.setAttribute("aria-label", typeMeta.label);
                Object.assign(tdType.style, {
                    color: typeMeta.color,
                    textAlign: "center"
                });
                const typeIconWrap = document.createElement("span");
                Object.assign(typeIconWrap.style, {
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "100%",
                    lineHeight: "0"
                });
                const typeIcon = createActionTypeIcon(typeMeta, { size: 20 });
                typeIconWrap.appendChild(typeIcon);
                tdType.appendChild(typeIconWrap);
                styleTableCell(tdType, isDark);

                const tdTarget = document.createElement("td");
                const targetText = getShortcutTargetText(item);
                tdTarget.textContent = targetText;
                    if (typeMeta.builtin && item.actionType === 'url' && item.url) {
                    const methodText = (typeof getUrlMethodDisplayText === "function")
                        ? getUrlMethodDisplayText(item.urlMethod)
                        : (URL_METHODS?.[item.urlMethod]?.name || options?.text?.builtins?.unknownUrlMethod || "Unknown jump method");
                    tdTarget.title = `${methodText}:\n---\n${targetText}`;
                } else {
                    let titleText = targetText;
                    if (!typeMeta.builtin) {
                        try {
                            const data = item.data && typeof item.data === "object" ? item.data : null;
                            if (data && Object.keys(data).length > 0) {
                                titleText = JSON.stringify(data, null, 2);
                            }
                        } catch {}
                    }
                    tdTarget.title = titleText;
                }
                Object.assign(tdTarget.style, {
                    wordBreak: "break-all", maxWidth: "300px", overflow: "hidden",
                    textOverflow: "ellipsis", whiteSpace: "nowrap"
                });
                styleTableCell(tdTarget, isDark);

                const tdHotkey = document.createElement("td");
                tdHotkey.textContent = core?.hotkeys?.formatForDisplay ? (core.hotkeys.formatForDisplay(item.hotkey) || "") : (item.hotkey || "");
                styleTableCell(tdHotkey, isDark);

                const tdAction = document.createElement("td");
                styleTableCell(tdAction, isDark);
                tdAction.style.textAlign = "center";
                const actionButtons = createActionButtons(item, index, isDark);
                tdAction.appendChild(actionButtons);

                row.appendChild(tdIcon);
                row.appendChild(tdName);
                row.appendChild(tdType);
                row.appendChild(tdTarget);
                row.appendChild(tdHotkey);
                row.appendChild(tdAction);
                return row;
            }

	            function createCompactCard(item, index, isDark) {
	                const card = document.createElement("div");
                card.className = classes.compactCard;
                Object.assign(card.style, {
                    border: `1px solid ${getBorderColor(isDark)}`,
                    borderRadius: "8px",
                    padding: "12px",
                    backgroundColor: getInputBackgroundColor(isDark),
                    transition: "border-color 0.2s ease, box-shadow 0.2s ease",
                    cursor: "move",
                    position: "relative",
                    width: "100%",
                    boxSizing: "border-box"
                });

		                dnd.setupDragAndDrop(card, item, index);

                const firstRow = document.createElement("div");
                Object.assign(firstRow.style, {
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginBottom: "8px",
                    flexWrap: "wrap"
                });

                const iconContainer = createShortcutIconPreview(item);
                iconContainer.style.flexShrink = "0";

                const nameContainer = document.createElement("div");
                Object.assign(nameContainer.style, {
                    fontWeight: "bold",
                    fontSize: "14px",
                    flexGrow: "1",
                    minWidth: "100px",
                    color: getTextColor(isDark)
                });
                nameContainer.textContent = getShortcutDisplayName(item);

                const typeContainer = document.createElement("div");
                const typeMeta = getActionTypeMeta(item.actionType);
                Object.assign(typeContainer.style, {
                    backgroundColor: typeMeta.color,
                    color: "white",
                    padding: "4px 6px",
                    borderRadius: "4px",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    lineHeight: "0",
                    whiteSpace: "nowrap",
                    flexShrink: "0"
                });
                typeContainer.title = typeMeta.label;
                typeContainer.setAttribute("aria-label", typeMeta.label);
                typeContainer.appendChild(createActionTypeIcon(typeMeta, { size: 16 }));

                const hotkeyContainer = document.createElement("div");
                Object.assign(hotkeyContainer.style, {
                    backgroundColor: getBorderColor(isDark),
                    color: getTextColor(isDark),
                    padding: "4px 8px",
                    borderRadius: "4px",
                    fontSize: "12px",
                    fontFamily: "monospace",
                    fontWeight: "bold",
                    whiteSpace: "nowrap",
                    minWidth: "60px",
                    textAlign: "center"
                });
                const noHotkeyText = options?.text?.panel?.compact?.noHotkey || "None";
                hotkeyContainer.textContent = core?.hotkeys?.formatForDisplay
                    ? (core.hotkeys.formatForDisplay(item.hotkey) || noHotkeyText)
                    : (item.hotkey || noHotkeyText);

                const actionButtons = createActionButtons(item, index, isDark);
                Object.assign(actionButtons.style, {
                    flexShrink: "0"
                });

                firstRow.appendChild(iconContainer);
                firstRow.appendChild(nameContainer);
                firstRow.appendChild(typeContainer);
                firstRow.appendChild(hotkeyContainer);
                firstRow.appendChild(actionButtons);

                const secondRow = document.createElement("div");
                Object.assign(secondRow.style, {
                    padding: "8px",
                    backgroundColor: isDark ? "#333333" : "#f8f9fa",
                    borderRadius: "4px",
                    fontSize: "13px",
                    color: isDark ? "#cccccc" : "#666666",
                    wordBreak: "break-all",
                    fontFamily: "monospace",
                    lineHeight: "1.4",
                    border: `1px solid ${getBorderColor(isDark)}`,
                    width: "100%",
                    boxSizing: "border-box"
                });

                const targetText = getShortcutTargetText(item);
                const displayTargetText = targetText === "-" ? (options?.text?.panel?.compact?.emptyTarget || "(No target configured)") : targetText;
                secondRow.textContent = displayTargetText;
                if (typeMeta.builtin && item.actionType === 'url' && item.url) {
                    const methodText = (typeof getUrlMethodDisplayText === "function")
                        ? getUrlMethodDisplayText(item.urlMethod)
                        : (URL_METHODS?.[item.urlMethod]?.name || options?.text?.builtins?.unknownUrlMethod || "Unknown jump method");
                    secondRow.title = `${methodText}:\n---\n${displayTargetText}`;
                } else {
                    let titleText = displayTargetText;
                    if (!typeMeta.builtin) {
                        try {
                            const data = item.data && typeof item.data === "object" ? item.data : null;
                            if (data && Object.keys(data).length > 0) {
                                titleText = JSON.stringify(data, null, 2);
                            }
                        } catch {}
                    }
                    secondRow.title = titleText;
                }

                card.appendChild(firstRow);
                card.appendChild(secondRow);

                card.addEventListener('mouseenter', () => {
                    card.style.borderColor = getPrimaryColor();
                    card.style.boxShadow = `0 2px 8px ${getPrimaryColor()}20`;
                });

                card.addEventListener('mouseleave', () => {
                    card.style.borderColor = getBorderColor(isDark);
                    card.style.boxShadow = 'none';
                });

                return card;
            }

            function createActionButtons(item, index, isDark) {
                const buttonContainer = document.createElement("div");
                Object.assign(buttonContainer.style, {
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: "6px",
                    flexWrap: "nowrap"
                });

                const editButton = document.createElement("button");
                editButton.textContent = "✍️";
                editButton.title = options.text.buttons.edit || "Edit";
                styleTransparentButton(editButton, "#FF9800", getHoverColor(isDark), isDark);
                Object.assign(editButton.style, {
                    minWidth: "32px",
                    height: "32px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                });
                editButton.onclick = (e) => {
                    e.stopPropagation();
                    editShortcut(item, index);
                };

                const delButton = document.createElement("button");
                delButton.textContent = "🗑️";
                delButton.title = options.text.buttons.delete || "Delete";
                styleTransparentButton(delButton, "#F44336", getHoverColor(isDark), isDark);
                Object.assign(delButton.style, {
                    minWidth: "32px",
                    height: "32px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                });
                delButton.onclick = (e) => {
                    e.stopPropagation();
                    const tpl = options?.text?.panel?.confirmDeleteShortcut || "Delete shortcut \"{name}\"?";
                    showConfirmDialog(tpl.replace("{name}", String(getShortcutDisplayName(item) ?? "")), () => {
                        core.mutateShortcuts((list) => { list.splice(index, 1); });
                        renderShortcutsList(state.isDarkMode);
                        updateStatsDisplay();
                    });
                };

                buttonContainer.appendChild(editButton);
                buttonContainer.appendChild(delButton);
                return buttonContainer;
            }

                    
		            function closePanel() {
		                closeSettingsMenu({ restoreFocus: false });
		                state.currentPanelCloser = null;
		                const statsEl = panel.querySelector(`#${ids.stats}`) || document.getElementById(ids.stats);
		                if (statsEl && typeof statsEl.__shortcutTemplateStatsCleanup === "function") {
		                    try { statsEl.__shortcutTemplateStatsCleanup(); } catch {}
		                }
		                if (typeof state.currentEditCloser === "function") {
		                    try { state.currentEditCloser(); } catch {}
		                }
		                state.isSettingsPanelOpen = false;
	                disableScrollLock();
	                if (state.destroyResponsiveListener) {
	                    state.destroyResponsiveListener();
	                    state.destroyResponsiveListener = null;
	                }
	                removeThemeChangeListener(updatePanelTheme);
	                panel.style.opacity = "0";
	                panel.style.transform = "translateY(20px)";
	                setTimeout(() => {
	                    if (overlay) overlay.remove();
	                    state.currentPanelOverlay = null;
	                }, 300);
	            }

	            function editShortcut(item = null, index = -1) {
                    panelOpenShortcutEditor(ctx, { item, index, renderShortcutsList, updateStatsDisplay });
	            }

}

	            return Object.freeze({ openSettingsPanel, closeSettingsPanel });
	        }
