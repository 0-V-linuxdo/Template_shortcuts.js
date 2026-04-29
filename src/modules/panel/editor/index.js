/* -------------------------------------------------------------------------- *
 * Panel Editor · Entry
 * -------------------------------------------------------------------------- */

import { clone } from "../../shared/base.js";
import { panelCreateUrlMethodConfigUI } from "./url-method.js";
import { panelCreateInputField, panelCreateIconField } from "./fields.js";
import { panelCreateIconLibraryUI } from "./icon-library.js";
import { panelCreateEnhancedKeyboardCaptureInput } from "./hotkey-capture.js";

export function panelOpenShortcutEditor(ctx, { item = null, index = -1, renderShortcutsList, updateStatsDisplay } = {}) {
            const {
                options,
                state,
                core,
                uiShared,
                idPrefix,
                cssPrefix,
                classes,
                ids,
                setIconImage,
                ensureThemeAdaptiveIconStored,
                debounce,
            } = ctx;
            const { theme, colors, style, dialogs, layout } = uiShared;
            const { addThemeChangeListener, removeThemeChangeListener } = theme;
            const {
                getPrimaryColor,
                getInputBackgroundColor,
                getTextColor,
                getBorderColor,
                getHoverColor
            } = colors;
            const { styleButton, styleInputField } = style;
            const { showAlert } = dialogs;
            const { autoResizeTextarea } = layout;

            const normalizeHotkey = core.normalizeHotkey;
            const normalizeLocalBoolean = (value, fallback = false) => {
                if (typeof value === "boolean") return value;
                const token = String(value ?? "").trim().toLowerCase();
                if (!token) return fallback;
                if (["1", "true", "yes", "on"].includes(token)) return true;
                if (["0", "false", "no", "off"].includes(token)) return false;
                return fallback;
            };

            const isNew = !item;
            const temp = item
                ? { ...item, data: (item && typeof item.data === "object" && !Array.isArray(item.data)) ? clone(item.data) : {} }
                : {
                name: "",
                actionType: "url",
                url: "",
                urlMethod: "current",
                urlAdvanced: "href",
                selector: "",
                simulateKeys: "",
                customAction: "",
                hotkey: "",
                icon: "",
                iconDark: "",
                iconAdaptive: false,
                labelKey: "",
                data: {}
            };
            if (item && !item.actionType) {
                temp.actionType = item.url ? 'url' : (item.selector ? 'selector' : (item.simulateKeys ? 'simulate' : (item.customAction ? 'custom' : 'url')));
            }
            if (!temp.customAction) temp.customAction = "";
            if (!temp.urlMethod) temp.urlMethod = "current";
            if (!temp.urlAdvanced) temp.urlAdvanced = "href";
            temp.iconAdaptive = normalizeLocalBoolean(temp.iconAdaptive, false);

            const editOverlay = document.createElement("div");
            editOverlay.id = ids.editOverlay;
            editOverlay.className = classes?.overlay || "";
            editOverlay.style.zIndex = "99999";
            try {
                const prefix = String(cssPrefix || "").trim();
                if (prefix) editOverlay.style.setProperty(`--${prefix}-overlay-bg`, "rgba(0, 0, 0, 0.3)");
            } catch {}

            const formDiv = document.createElement("div");
            formDiv.id = ids.editForm;
            formDiv.className = classes?.panel || "";
            Object.assign(formDiv.style, {
                opacity: "0", transform: "translateY(20px)",
                transition: "opacity 0.3s ease, transform 0.3s ease",
                maxHeight: "90vh", overflowY: "auto",
                width: "100%", maxWidth: "500px", minWidth: "320px"
            });
            formDiv.onclick = (e) => e.stopPropagation();

            const h3 = document.createElement("h3");
            h3.textContent = isNew
                ? (options?.text?.editor?.titles?.add || "Add shortcut")
                : (options?.text?.editor?.titles?.edit || "Edit shortcut");
            Object.assign(h3.style, { marginTop: "0", marginBottom: "15px", fontSize: "1.1em" });
            formDiv.appendChild(h3);

            const initialDisplayName = item && typeof core?.getShortcutDisplayName === "function"
                ? core.getShortcutDisplayName(item)
                : String(temp.name || "");
            const nameInput = panelCreateInputField(ctx, options?.text?.editor?.labels?.name || "Name:", initialDisplayName, "text");
            formDiv.appendChild(nameInput.label);

            const actionTypeDiv = document.createElement("div");
            actionTypeDiv.style.margin = "15px 0";
            const actionTypeLabel = document.createElement("div");
            actionTypeLabel.textContent = options?.text?.editor?.labels?.actionType || "Action type:";
            Object.assign(actionTypeLabel.style, { fontWeight: "bold", fontSize: "0.9em", marginBottom: "8px" });
            actionTypeDiv.appendChild(actionTypeLabel);
            const builtinLabels = Object.freeze({
                url: options?.text?.stats?.url || "URL jump",
                selector: options?.text?.stats?.selector || "Element click",
                simulate: options?.text?.stats?.simulate || "Key simulation",
                custom: options?.text?.stats?.custom || "Custom action"
            });

            const builtinOrder = Array.isArray(core?.actions?.builtins)
                ? core.actions.builtins.slice()
                : ["url", "selector", "simulate", "custom"];
            const builtinSet = new Set(builtinOrder);

            const actionEntries = (typeof core?.actions?.list === "function") ? core.actions.list() : [];
            const entriesByType = new Map(actionEntries.map((entry) => [String(entry?.type || "").trim(), entry]));
            const usedTypes = new Set();
            const actionTypes = [];

            function addActionType(type, fallbackLabel) {
                const normalized = String(type || "").trim();
                if (!normalized || usedTypes.has(normalized)) return;
                usedTypes.add(normalized);
                const entry = entriesByType.get(normalized);
                const metaLabel = entry && entry.meta && typeof entry.meta.label === "string" ? entry.meta.label.trim() : "";
                const builtinLabel = builtinLabels[normalized] || "";
                actionTypes.push({ value: normalized, text: builtinLabel || metaLabel || fallbackLabel || normalized });
            }

            builtinOrder.forEach((type) => addActionType(type, builtinLabels[type] || type));

            const extraTypes = [];
            actionEntries.forEach((entry) => {
                const type = String(entry?.type || "").trim();
                if (!type || usedTypes.has(type)) return;
                const metaLabel = entry && entry.meta && typeof entry.meta.label === "string" ? entry.meta.label.trim() : "";
                extraTypes.push({ value: type, text: metaLabel || type });
            });
            extraTypes.sort((a, b) => String(a.text).localeCompare(String(b.text), state.effectiveLocale || "zh-CN", { numeric: true }));
            extraTypes.forEach((opt) => addActionType(opt.value, opt.text));

            if (temp.actionType && !usedTypes.has(temp.actionType)) {
                const suffix = options?.text?.editor?.actionTypeHints?.unregisteredSuffix || " (unregistered)";
                addActionType(temp.actionType, `${temp.actionType}${suffix}`);
            }

            const actionTypeHint = document.createElement("div");
            Object.assign(actionTypeHint.style, { marginTop: "6px", fontSize: "12px", opacity: "0.75", lineHeight: "1.4" });
            actionTypeDiv.appendChild(actionTypeHint);

            function isBuiltinActionType(type) {
                const normalized = String(type || "").trim();
                const entry = entriesByType.get(normalized);
                if (entry && entry.meta && typeof entry.meta.builtin === "boolean") return entry.meta.builtin;
                return builtinSet.has(normalized);
            }

            function updateActionTypeHint(type) {
                const normalized = String(type || "").trim();
                if (!normalized) {
                    actionTypeHint.textContent = "";
                    return;
                }
                if (!entriesByType.has(normalized)) {
                    actionTypeHint.textContent = options?.text?.editor?.actionTypeHints?.unregistered || "This type currently has no registered handler; triggering it will report an unknown actionType.";
                    return;
                }
                if (!isBuiltinActionType(normalized)) {
                    actionTypeHint.textContent = options?.text?.editor?.actionTypeHints?.extended || "Extended type: pass parameters in the data JSON below.";
                    return;
                }
                actionTypeHint.textContent = "";
            }
            const radioGroup = document.createElement("div");
            Object.assign(radioGroup.style, { display: 'flex', gap: '15px', flexWrap: 'wrap' });
            const actionInputs = {};
            actionTypes.forEach(at => {
                const radioLabel = document.createElement("label");
                Object.assign(radioLabel.style, { display: 'inline-flex', alignItems: 'center', cursor: 'pointer' });
                const radio = document.createElement("input");
                radio.type = "radio";
                radio.name = "actionType";
                radio.value = at.value;
                radio.checked = temp.actionType === at.value;
                Object.assign(radio.style, { marginRight: "5px", cursor: 'pointer' });
                radio.addEventListener('change', () => {
                    if (radio.checked) {
                        temp.actionType = at.value;
                        const isBuiltin = isBuiltinActionType(at.value);
                        urlContainer.style.display = (isBuiltin && at.value === 'url') ? 'block' : 'none';
                        selectorContainer.style.display = (isBuiltin && at.value === 'selector') ? 'block' : 'none';
	                        simulateContainer.style.display = (isBuiltin && at.value === 'simulate') ? 'block' : 'none';
	                        customContainer.style.display = (isBuiltin && at.value === 'custom') ? 'block' : 'none';
	                        updateActionTypeHint(at.value);
                            applyDataEditorMode({ maybeReplaceValue: true });
	                    }
	                });
                radioLabel.appendChild(radio);
                radioLabel.appendChild(document.createTextNode(at.text));
                radioGroup.appendChild(radioLabel);
            });
            actionTypeDiv.appendChild(radioGroup);
            formDiv.appendChild(actionTypeDiv);

            const editorTabsText = options?.text?.editor?.tabs || {};
            const tabBar = document.createElement("div");
            tabBar.setAttribute("role", "tablist");
            Object.assign(tabBar.style, {
                display: "flex",
                gap: "8px",
                margin: "0 0 12px 0",
                paddingBottom: "10px",
                borderBottom: "1px solid"
            });

            const generalTabBtn = document.createElement("button");
            generalTabBtn.type = "button";
            generalTabBtn.setAttribute("role", "tab");
            generalTabBtn.textContent = editorTabsText.general || "General";
            Object.assign(generalTabBtn.style, {
                border: "1px solid",
                borderRadius: "999px",
                padding: "6px 14px",
                fontSize: "13px",
                fontWeight: "bold",
                cursor: "pointer",
                transition: "background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease"
            });

            const iconTabBtn = document.createElement("button");
            iconTabBtn.type = "button";
            iconTabBtn.setAttribute("role", "tab");
            iconTabBtn.textContent = editorTabsText.icon || "Icon";
            Object.assign(iconTabBtn.style, {
                border: "1px solid",
                borderRadius: "999px",
                padding: "6px 14px",
                fontSize: "13px",
                fontWeight: "bold",
                cursor: "pointer",
                transition: "background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease"
            });

            const dataTabBtn = document.createElement("button");
            dataTabBtn.type = "button";
            dataTabBtn.setAttribute("role", "tab");
            dataTabBtn.textContent = editorTabsText.data || "Data";
            Object.assign(dataTabBtn.style, {
                border: "1px solid",
                borderRadius: "999px",
                padding: "6px 14px",
                fontSize: "13px",
                fontWeight: "bold",
                cursor: "pointer",
                transition: "background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease"
            });

            const generalPanel = document.createElement("div");
            generalPanel.setAttribute("role", "tabpanel");
            const dataPanel = document.createElement("div");
            dataPanel.setAttribute("role", "tabpanel");
            dataPanel.style.display = "none";
            const iconPanel = document.createElement("div");
            iconPanel.setAttribute("role", "tabpanel");
            iconPanel.style.display = "none";

            const generalPanelId = `${idPrefix}-editor-tab-panel-general`;
            const dataPanelId = `${idPrefix}-editor-tab-panel-data`;
            const iconPanelId = `${idPrefix}-editor-tab-panel-icon`;
            const generalTabId = `${idPrefix}-editor-tab-general`;
            const dataTabId = `${idPrefix}-editor-tab-data`;
            const iconTabId = `${idPrefix}-editor-tab-icon`;
            generalTabBtn.id = generalTabId;
            dataTabBtn.id = dataTabId;
            iconTabBtn.id = iconTabId;
            generalPanel.id = generalPanelId;
            dataPanel.id = dataPanelId;
            iconPanel.id = iconPanelId;
            generalPanel.setAttribute("aria-labelledby", generalTabId);
            dataPanel.setAttribute("aria-labelledby", dataTabId);
            iconPanel.setAttribute("aria-labelledby", iconTabId);
            generalTabBtn.setAttribute("aria-controls", generalPanelId);
            dataTabBtn.setAttribute("aria-controls", dataPanelId);
            iconTabBtn.setAttribute("aria-controls", iconPanelId);
            tabBar.appendChild(iconTabBtn);
            tabBar.appendChild(generalTabBtn);
            tabBar.appendChild(dataTabBtn);
            formDiv.appendChild(tabBar);
            formDiv.appendChild(generalPanel);
            formDiv.appendChild(dataPanel);
            formDiv.appendChild(iconPanel);

            const updateEditorTabsTheme = (isDark) => {
                const borderColor = getBorderColor(isDark);
                const inactiveBackground = getInputBackgroundColor(isDark);
                const inactiveTextColor = getTextColor(isDark);
                const activeBackground = getPrimaryColor();
                tabBar.style.borderBottomColor = borderColor;

                [generalTabBtn, dataTabBtn, iconTabBtn].forEach((btn) => {
                    const isActive = btn.getAttribute("data-active") === "1";
                    btn.style.borderColor = isActive ? activeBackground : borderColor;
                    btn.style.backgroundColor = isActive ? activeBackground : inactiveBackground;
                    btn.style.color = isActive ? "#ffffff" : inactiveTextColor;
                    btn.onmouseover = () => {
                        if (btn.getAttribute("data-active") === "1") return;
                        btn.style.backgroundColor = getHoverColor(isDark);
                        btn.style.borderColor = getPrimaryColor();
                    };
                    btn.onmouseout = () => {
                        const activeNow = btn.getAttribute("data-active") === "1";
                        btn.style.borderColor = activeNow ? activeBackground : borderColor;
                        btn.style.backgroundColor = activeNow ? activeBackground : inactiveBackground;
                        btn.style.color = activeNow ? "#ffffff" : inactiveTextColor;
                    };
                });
            };

            const setActiveEditorTab = (nextTab) => {
                const normalizedTab = String(nextTab || "").trim();
                const tab = (normalizedTab === "icon" || normalizedTab === "data") ? normalizedTab : "general";
                const isGeneral = tab === "general";
                const isData = tab === "data";
                const isIcon = tab === "icon";
                generalTabBtn.setAttribute("data-active", isGeneral ? "1" : "0");
                dataTabBtn.setAttribute("data-active", isData ? "1" : "0");
                iconTabBtn.setAttribute("data-active", isIcon ? "1" : "0");
                generalTabBtn.setAttribute("aria-selected", isGeneral ? "true" : "false");
                dataTabBtn.setAttribute("aria-selected", isData ? "true" : "false");
                iconTabBtn.setAttribute("aria-selected", isIcon ? "true" : "false");
                generalPanel.style.display = isGeneral ? "block" : "none";
                dataPanel.style.display = isData ? "block" : "none";
                iconPanel.style.display = isIcon ? "block" : "none";
                updateEditorTabsTheme(state.isDarkMode);
                requestAnimationFrame(() => {
                    const activePanel = isGeneral ? generalPanel : (isData ? dataPanel : iconPanel);
                    activePanel.querySelectorAll("textarea").forEach((ta) => {
                        autoResizeTextarea(ta);
                    });
                });
            };

            generalTabBtn.addEventListener("click", () => setActiveEditorTab("general"));
            dataTabBtn.addEventListener("click", () => setActiveEditorTab("data"));
            iconTabBtn.addEventListener("click", () => setActiveEditorTab("icon"));

            const urlContainer = document.createElement('div');
            const urlTextarea = panelCreateInputField(
                ctx,
                options?.text?.editor?.labels?.url || "Target URL:",
                temp.url,
                "textarea",
                options?.text?.editor?.placeholders?.url || "Example: https://example.com/search?q=%s"
            );
            urlContainer.appendChild(urlTextarea.label);

            const urlMethodContainer = panelCreateUrlMethodConfigUI(ctx, temp.urlMethod, temp.urlAdvanced);
            urlContainer.appendChild(urlMethodContainer.container);

            generalPanel.appendChild(urlContainer);
            actionInputs.url = urlTextarea.input;

            const selectorContainer = document.createElement('div');
            const selectorTextarea = panelCreateInputField(
                ctx,
                options?.text?.editor?.labels?.selector || "Target selector:",
                temp.selector,
                "textarea",
                options?.text?.editor?.placeholders?.selector || 'Example: label[for="sidebar-visible"]'
            );
            selectorContainer.appendChild(selectorTextarea.label);
            generalPanel.appendChild(selectorContainer);
            actionInputs.selector = selectorTextarea.input;

            const simulateContainer = document.createElement('div');
            const simulateCapture = panelCreateEnhancedKeyboardCaptureInput(ctx, options?.text?.editor?.labels?.simulate || "Simulated keys:", temp.simulateKeys, {
                placeholder: options.text.hints.simulate,
                hint: options.text.hints.simulateHelp,
                methodName: "getSimulateKeys",
                captureType: "simulate"
            });
            const { container: simulateInputContainer, destroy: destroySimulateKeysCapture } = simulateCapture;
            const getSimulateKeys = simulateCapture.getSimulateKeys;
            simulateContainer.appendChild(simulateInputContainer);
            generalPanel.appendChild(simulateContainer);

            const customContainer = document.createElement('div');
            const customActionField = panelCreateInputField(
                ctx,
                options?.text?.editor?.labels?.customAction || "Custom action:",
                temp.customAction,
                "text",
                options?.text?.editor?.placeholders?.customAction || "Choose/type a key from customActions provided by the script"
            );
            customContainer.appendChild(customActionField.label);
            generalPanel.appendChild(customContainer);
            actionInputs.customAction = customActionField.input;

            try {
                const keys = Object.keys(options.customActions || {}).filter(Boolean).sort();
                if (keys.length) {
                    const datalist = document.createElement("datalist");
                    datalist.id = `${idPrefix}-custom-actions-list`;
                    keys.forEach(k => {
                        const opt = document.createElement("option");
                        opt.value = k;
                        datalist.appendChild(opt);
                    });
                    customActionField.input.setAttribute("list", datalist.id);
                    customActionField.label.appendChild(datalist);
                }
	            } catch {}

                const defaultDataLabelText = options?.text?.editor?.labels?.data || "Extra parameters (data JSON, optional):";
                const defaultDataPlaceholder = options?.text?.editor?.placeholders?.data || 'Example: {"foo":"bar"}';

                const customActionDataAdapters = (options?.customActionDataAdapters && typeof options.customActionDataAdapters === "object")
                    ? options.customActionDataAdapters
                    : null;

                function isPlainObject(value) {
                    return !!value && typeof value === "object" && !Array.isArray(value);
                }

                function formatJsonDataForEditor(data) {
                    const obj = isPlainObject(data) ? data : {};
                    if (Object.keys(obj).length === 0) return "";
                    try {
                        return JSON.stringify(obj, null, 2);
                    } catch {
                        return "";
                    }
                }

                function getCustomActionDataAdapter(customActionKey) {
                    const key = String(customActionKey || "").trim();
                    if (!key || !customActionDataAdapters) return null;
                    const adapter = customActionDataAdapters[key];
                    if (!adapter || typeof adapter !== "object" || Array.isArray(adapter)) return null;
                    return adapter;
                }

                function getAdapterText(adapter, field, fallback = "") {
                    if (!adapter) return fallback;
                    const raw = adapter[field];
                    if (typeof raw === "function") {
                        try {
                            return String(raw({ shortcut: temp, ctx }) ?? fallback);
                        } catch {
                            return fallback;
                        }
                    }
                    return typeof raw === "string" ? raw : fallback;
                }

                function formatCustomActionData(adapter, data) {
                    if (!adapter) return formatJsonDataForEditor(data);
                    const formatter = typeof adapter.format === "function" ? adapter.format : null;
                    if (formatter) {
                        try {
                            return String(formatter(data, { shortcut: temp, ctx }) ?? "");
                        } catch {
                            return "";
                        }
                    }
                    return formatJsonDataForEditor(data);
                }

                let lastDataAdapterKey = "";

                function applyDataEditorMode({ maybeReplaceValue = false } = {}) {
                    if (!dataField || !dataTextarea) return;

                    const customActionKey = String(actionInputs.customAction?.value || temp.customAction || "").trim();
                    const adapter = (temp.actionType === "custom") ? getCustomActionDataAdapter(customActionKey) : null;
                    const nextDataAdapterKey = adapter ? customActionKey : "";

                    const labelText = getAdapterText(adapter, "label", defaultDataLabelText);
                    try {
                        const textNode = dataField.label?.firstChild;
                        if (textNode && textNode.nodeType === 3) textNode.textContent = labelText;
                    } catch {}

                    dataTextarea.placeholder = getAdapterText(adapter, "placeholder", defaultDataPlaceholder);

                    const adapterChanged = nextDataAdapterKey !== lastDataAdapterKey;
                    lastDataAdapterKey = nextDataAdapterKey;
                    if (!maybeReplaceValue || !adapterChanged) return;

                    const current = String(dataTextarea.value || "");
                    const currentTrim = current.trim();
                    const baselineJsonTrim = formatJsonDataForEditor(temp.data).trim();

                    const shouldReplaceValue = !currentTrim || currentTrim === "{}" || (baselineJsonTrim && currentTrim === baselineJsonTrim);
                    if (!shouldReplaceValue) return;

                    dataTextarea.value = adapter ? formatCustomActionData(adapter, temp.data) : formatJsonDataForEditor(temp.data);
                    try {
                        if (dataTextarea.tagName === "TEXTAREA") autoResizeTextarea(dataTextarea);
                    } catch {}
                }

	                const initialDataAdapter = (temp.actionType === "custom")
	                    ? getCustomActionDataAdapter(temp.customAction)
	                    : null;
                    lastDataAdapterKey = initialDataAdapter ? String(temp.customAction || "").trim() : "";

            const dataField = panelCreateInputField(
                ctx,
                getAdapterText(initialDataAdapter, "label", defaultDataLabelText),
                initialDataAdapter ? formatCustomActionData(initialDataAdapter, temp.data) : formatJsonDataForEditor(temp.data),
                "textarea",
                getAdapterText(initialDataAdapter, "placeholder", defaultDataPlaceholder)
            );
	            dataPanel.appendChild(dataField.label);
	            const dataTextarea = dataField.input;
                actionInputs.customAction?.addEventListener?.("input", () => applyDataEditorMode({ maybeReplaceValue: true }));
                actionInputs.customAction?.addEventListener?.("change", () => applyDataEditorMode({ maybeReplaceValue: true }));

            const iconField = panelCreateIconField(
                ctx,
                options?.text?.editor?.labels?.icon || "Icon URL:",
                temp.icon,
                temp.iconDark
            );
            const {
                label: iconLabel,
                input: iconTextarea,
                darkInput: iconDarkTextarea,
                darkLabel: iconDarkLabel,
                darkRow: iconDarkRow,
                preview: iconPreview,
                darkPreview: iconDarkPreview,
                destroy: destroyIconField
            } = iconField;
            iconPanel.appendChild(iconLabel);

            const refreshIconPreviews = () => {
                const lightVal = iconTextarea.value.trim();
                const darkVal = iconDarkTextarea.value.trim();
                setIconImage(iconPreview, lightVal || "", "", temp.iconAdaptive);
                if (!iconDarkPreview) return;
                if (darkVal) {
                    iconDarkPreview.style.display = "block";
                    setIconImage(iconDarkPreview, "", darkVal, false);
                } else {
                    setIconImage(iconDarkPreview, "", "", false);
                    iconDarkPreview.style.display = "none";
                    iconDarkPreview.removeAttribute("src");
                }
            };

            refreshIconPreviews();
            const debouncedPreview = debounce(() => {
                refreshIconPreviews();
            }, 300);
            iconTextarea.addEventListener("input", () => {
                autoResizeTextarea(iconTextarea);
                refreshIconAdaptiveVisibility();
                debouncedPreview();
            });
            iconDarkTextarea.addEventListener("input", () => {
                autoResizeTextarea(iconDarkTextarea);
                refreshIconAdaptiveVisibility();
                debouncedPreview();
            });

            const iconAdaptiveRow = document.createElement("div");
            Object.assign(iconAdaptiveRow.style, {
                display: "inline-flex",
                alignSelf: "flex-start",
                width: "fit-content",
                maxWidth: "100%",
                position: "relative",
                alignItems: "center",
                justifyContent: "flex-start",
                gap: "10px",
                marginTop: "8px",
                marginBottom: "10px",
                padding: "6px 10px",
                border: "1px solid",
                borderRadius: "6px"
            });

            const iconAdaptiveLabelText = options?.text?.panel?.iconAdaptiveLabel || "SVG adaptive processing";
            const iconAdaptiveHintText = options?.text?.panel?.iconAdaptiveHint || "Only applies when the main icon is an SVG and no dark-mode icon URL is set";
            const iconAdaptiveHintPaletteByTheme = {
                light: {
                    helpText: "#9d174d",
                    helpBg: "#ffe4ee",
                    helpBgActive: "#ffd6e7",
                    helpBorder: "#f8a4c7",
                    tooltipText: "#831843",
                    tooltipBg: "#fff1f7",
                    tooltipBorder: "#f9a8d4",
                    tooltipShadow: "0 10px 24px rgba(190, 24, 93, 0.18)"
                },
                dark: {
                    helpText: "#e7c0d4",
                    helpBg: "rgba(231, 192, 212, 0.10)",
                    helpBgActive: "rgba(231, 192, 212, 0.18)",
                    helpBorder: "rgba(231, 192, 212, 0.38)",
                    tooltipText: "#f7dce9",
                    tooltipBg: "rgba(41, 31, 38, 0.96)",
                    tooltipBorder: "rgba(231, 192, 212, 0.35)",
                    tooltipShadow: "0 14px 30px rgba(0, 0, 0, 0.45)"
                }
            };
            const iconAdaptiveLabel = document.createElement("div");
            iconAdaptiveLabel.textContent = iconAdaptiveLabelText;
            Object.assign(iconAdaptiveLabel.style, {
                fontSize: "0.9em",
                fontWeight: "bold",
                minWidth: "0",
                flex: "0 1 auto",
                cursor: "default"
            });

            const iconAdaptiveHelpWrap = document.createElement("span");
            Object.assign(iconAdaptiveHelpWrap.style, {
                position: "relative",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                flex: "0 0 auto"
            });

            const iconAdaptiveHelpBtn = document.createElement("button");
            iconAdaptiveHelpBtn.type = "button";
            iconAdaptiveHelpBtn.textContent = "?";
            iconAdaptiveHelpBtn.setAttribute("aria-label", `${iconAdaptiveLabelText} help`);
            iconAdaptiveHelpBtn.setAttribute("aria-haspopup", "true");
            iconAdaptiveHelpBtn.setAttribute("aria-expanded", "false");
            Object.assign(iconAdaptiveHelpBtn.style, {
                width: "20px",
                minWidth: "20px",
                height: "20px",
                borderRadius: "999px",
                border: "1px solid",
                padding: "0",
                margin: "0",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "12px",
                fontWeight: "bold",
                lineHeight: "1",
                boxSizing: "border-box",
                transition: "background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease, box-shadow 0.2s ease"
            });

            const iconAdaptiveSwitch = document.createElement("button");
            iconAdaptiveSwitch.type = "button";
            iconAdaptiveSwitch.setAttribute("role", "switch");
            iconAdaptiveSwitch.setAttribute("aria-label", iconAdaptiveLabelText);
            Object.assign(iconAdaptiveSwitch.style, {
                width: "42px",
                minWidth: "42px",
                height: "24px",
                borderRadius: "999px",
                border: "1px solid",
                padding: "2px",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "flex-start",
                transition: "background-color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease",
                boxSizing: "border-box"
            });

            const iconAdaptiveThumb = document.createElement("span");
            Object.assign(iconAdaptiveThumb.style, {
                width: "18px",
                height: "18px",
                borderRadius: "999px",
                backgroundColor: "#ffffff",
                transition: "transform 0.2s ease, background-color 0.2s ease"
            });
            iconAdaptiveSwitch.appendChild(iconAdaptiveThumb);

            const iconAdaptiveTooltip = document.createElement("div");
            iconAdaptiveTooltip.textContent = iconAdaptiveHintText;
            Object.assign(iconAdaptiveTooltip.style, {
                display: "none",
                position: "absolute",
                left: "50%",
                bottom: "calc(100% + 6px)",
                zIndex: "50",
                transform: "translateX(-50%)",
                width: "220px",
                maxWidth: "min(280px, calc(100vw - 48px))",
                padding: "6px 8px",
                borderRadius: "6px",
                border: "1px solid",
                fontSize: "12px",
                lineHeight: "1.35",
                whiteSpace: "normal",
                wordBreak: "break-word",
                overflowWrap: "anywhere",
                pointerEvents: "none",
                boxSizing: "border-box",
                boxShadow: "0 4px 12px rgba(0,0,0,0.28)"
            });

            let iconAdaptiveTooltipPinned = false;
            let iconAdaptiveHelpHover = false;
            let iconAdaptiveHintPalette = iconAdaptiveHintPaletteByTheme.light;
            const applyIconAdaptiveHelpBtnVisual = () => {
                const shouldActive =
                    iconAdaptiveHelpHover ||
                    iconAdaptiveTooltipPinned ||
                    iconAdaptiveTooltip.style.display === "block";
                iconAdaptiveHelpBtn.style.color = iconAdaptiveHintPalette.helpText;
                iconAdaptiveHelpBtn.style.borderColor = iconAdaptiveHintPalette.helpBorder;
                iconAdaptiveHelpBtn.style.backgroundColor = shouldActive
                    ? iconAdaptiveHintPalette.helpBgActive
                    : iconAdaptiveHintPalette.helpBg;
            };
            const applyIconAdaptiveTooltipVisual = () => {
                const isDark = !!state.isDarkMode;
                iconAdaptiveTooltip.style.color = getTextColor(isDark);
                iconAdaptiveTooltip.style.backgroundColor = getInputBackgroundColor(isDark);
                iconAdaptiveTooltip.style.borderColor = getBorderColor(isDark);
                iconAdaptiveTooltip.style.boxShadow = "0 4px 12px rgba(0,0,0,0.28)";
            };
            const setIconAdaptiveTooltipVisible = (visible) => {
                const show = !!visible;
                iconAdaptiveTooltip.style.display = show ? "block" : "none";
                iconAdaptiveHelpBtn.setAttribute("aria-expanded", show ? "true" : "false");
                applyIconAdaptiveHelpBtnVisual();
            };

            const hideIconAdaptiveTooltip = () => {
                iconAdaptiveTooltipPinned = false;
                setIconAdaptiveTooltipVisible(false);
            };

            const applyIconAdaptiveSwitchVisual = (isDark) => {
                const checked = !!temp.iconAdaptive;
                iconAdaptiveSwitch.setAttribute("aria-checked", checked ? "true" : "false");
                iconAdaptiveSwitch.style.justifyContent = checked ? "flex-end" : "flex-start";
                iconAdaptiveSwitch.style.backgroundColor = checked ? getPrimaryColor() : getInputBackgroundColor(isDark);
                iconAdaptiveSwitch.style.borderColor = checked ? getPrimaryColor() : getBorderColor(isDark);
                iconAdaptiveSwitch.style.boxShadow = "none";
                iconAdaptiveThumb.style.backgroundColor = "#ffffff";
            };

            const isSvgLikeIconSource = (value) => {
                const source = String(value || "").trim();
                if (!source) return false;
                if (/^<svg[\s>]/i.test(source)) return true;
                if (/^data:image\/svg\+xml(?:;|,)/i.test(source)) return true;
                if (/\.svg(?:[?#].*)?$/i.test(source)) return true;
                return false;
            };

            const refreshIconAdaptiveVisibility = () => {
                const hasSvgMainIcon = isSvgLikeIconSource(iconTextarea.value);
                const hasDarkIcon = !!String(iconDarkTextarea.value || "").trim();
                const visible = hasSvgMainIcon && !hasDarkIcon;
                if (!visible) hideIconAdaptiveTooltip();
                iconAdaptiveRow.style.display = visible ? "inline-flex" : "none";
            };

            const refreshIconDarkFieldVisibility = () => {
                const visible = !temp.iconAdaptive;
                if (iconDarkLabel) iconDarkLabel.style.display = visible ? "block" : "none";
                if (iconDarkRow) iconDarkRow.style.display = visible ? "grid" : "none";
            };

            const toggleIconAdaptiveEnabled = (nextChecked = !temp.iconAdaptive) => {
                temp.iconAdaptive = !!nextChecked;
                refreshIconPreviews();
                refreshIconDarkFieldVisibility();
                if (typeof renderShortcutsList === "function") renderShortcutsList(state.isDarkMode);
                applyIconAdaptiveSwitchVisual(state.isDarkMode);
            };

            iconAdaptiveSwitch.addEventListener("click", () => toggleIconAdaptiveEnabled());
            iconAdaptiveSwitch.addEventListener("keydown", (event) => {
                if (event.key === " " || event.key === "Enter") {
                    event.preventDefault();
                    toggleIconAdaptiveEnabled();
                }
            });
            iconAdaptiveSwitch.addEventListener("focus", () => {
                iconAdaptiveSwitch.style.boxShadow = `0 0 0 1px ${getPrimaryColor()}`;
            });
            iconAdaptiveSwitch.addEventListener("blur", () => {
                iconAdaptiveSwitch.style.boxShadow = "none";
            });

            iconAdaptiveHelpBtn.addEventListener("mouseenter", () => {
                iconAdaptiveHelpHover = true;
                setIconAdaptiveTooltipVisible(true);
            });
            iconAdaptiveHelpBtn.addEventListener("mouseleave", () => {
                iconAdaptiveHelpHover = false;
                if (!iconAdaptiveTooltipPinned) setIconAdaptiveTooltipVisible(false);
                else applyIconAdaptiveHelpBtnVisual();
            });
            iconAdaptiveHelpBtn.addEventListener("focus", () => {
                iconAdaptiveHelpBtn.style.boxShadow = `0 0 0 1px ${getPrimaryColor()}`;
                setIconAdaptiveTooltipVisible(true);
            });
            iconAdaptiveHelpBtn.addEventListener("blur", () => {
                iconAdaptiveHelpBtn.style.boxShadow = "none";
                iconAdaptiveHelpHover = false;
                if (!iconAdaptiveTooltipPinned) setIconAdaptiveTooltipVisible(false);
                else applyIconAdaptiveHelpBtnVisual();
            });
            iconAdaptiveHelpBtn.addEventListener("keydown", (event) => {
                if (event.key === "Escape") {
                    event.preventDefault();
                    hideIconAdaptiveTooltip();
                    iconAdaptiveHelpBtn.blur();
                }
            });
            iconAdaptiveHelpBtn.addEventListener("click", (event) => {
                event.preventDefault();
                iconAdaptiveTooltipPinned = !iconAdaptiveTooltipPinned;
                setIconAdaptiveTooltipVisible(iconAdaptiveTooltipPinned);
            });

            const handleIconAdaptiveDocPointerDown = (event) => {
                if (!iconAdaptiveTooltipPinned) return;
                if (iconAdaptiveHelpWrap.contains(event.target)) return;
                hideIconAdaptiveTooltip();
            };
            document.addEventListener("pointerdown", handleIconAdaptiveDocPointerDown, true);
            applyIconAdaptiveSwitchVisual(state.isDarkMode);

            iconAdaptiveHelpWrap.appendChild(iconAdaptiveHelpBtn);
            iconAdaptiveHelpWrap.appendChild(iconAdaptiveTooltip);
            iconAdaptiveRow.appendChild(iconAdaptiveLabel);
            iconAdaptiveRow.appendChild(iconAdaptiveHelpWrap);
            iconAdaptiveRow.appendChild(iconAdaptiveSwitch);
            iconPanel.appendChild(iconAdaptiveRow);
            refreshIconAdaptiveVisibility();
            refreshIconDarkFieldVisibility();

            const iconLibrary = panelCreateIconLibraryUI(
                ctx,
                iconTextarea,
                iconPreview,
                iconDarkTextarea,
                () => !!temp.iconAdaptive
            );
            const { container: iconLibraryContainer, destroy: destroyIconLibrary } = iconLibrary;
            iconPanel.appendChild(iconLibraryContainer);

            const hotkeyCapture = panelCreateEnhancedKeyboardCaptureInput(ctx, options?.text?.editor?.labels?.hotkey || "Shortcut:", temp.hotkey, {
                placeholder: options.text.hints.hotkey,
                hint: options.text.hints.hotkeyHelp,
                methodName: "getHotkey"
            });
            const { container: hotkeyContainer, destroy: destroyHotkeyCapture } = hotkeyCapture;
            const getHotkey = hotkeyCapture.getHotkey;
            generalPanel.appendChild(hotkeyContainer);

            const initialBuiltin = isBuiltinActionType(temp.actionType);
            urlContainer.style.display = (initialBuiltin && temp.actionType === 'url') ? 'block' : 'none';
            selectorContainer.style.display = (initialBuiltin && temp.actionType === 'selector') ? 'block' : 'none';
            simulateContainer.style.display = (initialBuiltin && temp.actionType === 'simulate') ? 'block' : 'none';
            customContainer.style.display = (initialBuiltin && temp.actionType === 'custom') ? 'block' : 'none';
            updateActionTypeHint(temp.actionType);
            setActiveEditorTab("general");

            const btnRow = document.createElement("div");
            Object.assign(btnRow.style, {
                marginTop: "20px", display: "flex", justifyContent: "flex-end",
                gap: "10px", flexWrap: "wrap"
            });

            const confirmBtn = document.createElement("button");
	            confirmBtn.textContent = options.text.buttons.confirm || "OK";
	            confirmBtn.onclick = () => {
	                const inputName = nameInput.input.value.trim();
                    if (!isNew && temp.labelKey && inputName === initialDisplayName) {
                        temp.name = item?.name || inputName;
                    } else {
                        temp.name = inputName;
                        if (temp.labelKey && inputName !== initialDisplayName) temp.labelKey = "";
                    }
	                temp.url = actionInputs.url.value.trim();
	                temp.selector = actionInputs.selector.value.trim();
                temp.simulateKeys = getSimulateKeys().replace(/\s+/g, "");
                temp.customAction = (actionInputs.customAction?.value || "").trim();
                temp.icon = iconTextarea.value.trim();
                temp.iconDark = iconDarkTextarea.value.trim();
                temp.iconAdaptive = !!temp.iconAdaptive;

	                let parsedData = {};
	                const dataTextRaw = String(dataTextarea?.value || "");
	                const dataText = dataTextRaw.trim();
                    const adapter = (temp.actionType === "custom") ? getCustomActionDataAdapter(temp.customAction) : null;
                    if (adapter && typeof adapter.parse === "function") {
                        try {
                            parsedData = adapter.parse(dataTextRaw, { shortcut: temp, ctx }) ?? {};
                        } catch {
                            showAlert(options?.text?.editor?.validation?.dataParseFailed || "Failed to parse data. Please check the input.");
                            return;
                        }
                        if (!isPlainObject(parsedData)) {
                            showAlert(options?.text?.editor?.validation?.dataJsonMustBeObject || "data must be a JSON object (for example {\"foo\":\"bar\"}).");
                            return;
                        }
                    } else if (dataText) {
	                    try {
	                        parsedData = JSON.parse(dataText);
	                    } catch {
	                        showAlert(options?.text?.editor?.validation?.dataJsonParseFailed || "Failed to parse data JSON. Please check the format.");
	                        return;
	                    }
	                    if (!isPlainObject(parsedData)) {
	                        showAlert(options?.text?.editor?.validation?.dataJsonMustBeObject || "data must be a JSON object (for example {\"foo\":\"bar\"}).");
	                        return;
	                    }
	                }
	                temp.data = parsedData;

                const finalHotkey = getHotkey();
                const urlMethodConfig = urlMethodContainer.getConfig();
                temp.urlMethod = urlMethodConfig.method;
                temp.urlAdvanced = urlMethodConfig.advanced;

                if (!temp.name) { showAlert(options?.text?.editor?.validation?.nameRequired || "Please enter a name."); return; }
                const isBuiltinAction = isBuiltinActionType(temp.actionType);
                if (isBuiltinAction && temp.actionType === 'url' && !temp.url) { showAlert(options?.text?.editor?.validation?.urlRequired || "Please enter a target URL."); return; }
                if (isBuiltinAction && temp.actionType === 'selector' && !temp.selector) { showAlert(options?.text?.editor?.validation?.selectorRequired || "Please enter a target selector."); return; }
                if (isBuiltinAction && temp.actionType === 'simulate' && !temp.simulateKeys) { showAlert(options?.text?.editor?.validation?.simulateRequired || "Please set simulated keys."); return; }
                if (isBuiltinAction && temp.actionType === 'custom' && !temp.customAction) { showAlert(options?.text?.editor?.validation?.customActionRequired || "Please set a custom action key."); return; }
                if (!finalHotkey) { showAlert(options?.text?.editor?.validation?.hotkeyRequired || "Please set a shortcut."); return; }
                if (finalHotkey.endsWith('+')) { showAlert(options?.text?.editor?.validation?.hotkeyIncomplete || "Shortcut is incomplete (missing main key)."); return; }

                const normalizedNewHotkey = normalizeHotkey(finalHotkey);
                if (core.getShortcuts().some((s, i) => normalizeHotkey(s.hotkey) === normalizedNewHotkey && i !== index)) {
                    showAlert(options?.text?.editor?.validation?.hotkeyDuplicate || "This shortcut is already used by another item. Choose another combination.");
                    return;
                }
                temp.hotkey = finalHotkey;

                if (isBuiltinAction) {
                    if (temp.actionType !== 'url') {
                        temp.url = "";
                        temp.urlMethod = "current";
                        temp.urlAdvanced = "href";
                    }
                    if (temp.actionType !== 'selector') temp.selector = "";
                    if (temp.actionType !== 'simulate') temp.simulateKeys = "";
                    if (temp.actionType !== 'custom') temp.customAction = "";
                }

                const normalized = core.normalizeShortcut(temp);
                if (
                    normalized.icon &&
                    !normalized.iconDark &&
                    normalized.iconAdaptive &&
                    typeof ensureThemeAdaptiveIconStored === "function"
                ) {
                    ensureThemeAdaptiveIconStored(normalized.icon);
                }
                core.mutateShortcuts((list) => {
                    if (isNew) {
                        list.push(normalized);
                    } else {
                        list[index] = normalized;
                    }
                });
                if (typeof renderShortcutsList === "function") renderShortcutsList(state.isDarkMode);
                if (typeof updateStatsDisplay === "function") updateStatsDisplay();
                closeEdit();
            };
            btnRow.appendChild(confirmBtn);

            const cancelBtn = document.createElement("button");
            cancelBtn.textContent = options.text.buttons.cancel || "Cancel";
            cancelBtn.onclick = closeEdit;
            btnRow.appendChild(cancelBtn);

            formDiv.appendChild(btnRow);
            editOverlay.appendChild(formDiv);
            document.body.appendChild(editOverlay);
            state.currentEditCloser = closeEdit;

            const updateEditPanelTheme = (isDark) => {
                h3.style.borderBottom = `1px solid ${getBorderColor(isDark)}`;
                h3.style.paddingBottom = "10px";
                styleInputField(nameInput.input, isDark);
                styleInputField(actionInputs.url, isDark);
                styleInputField(actionInputs.selector, isDark);
                if (actionInputs.customAction) styleInputField(actionInputs.customAction, isDark);
                styleInputField(iconTextarea, isDark);
                styleInputField(iconDarkTextarea, isDark);
                iconAdaptiveRow.style.backgroundColor = getInputBackgroundColor(isDark);
                iconAdaptiveRow.style.borderColor = getBorderColor(isDark);
                iconAdaptiveLabel.style.color = getTextColor(isDark);
                iconAdaptiveHintPalette = isDark ? iconAdaptiveHintPaletteByTheme.dark : iconAdaptiveHintPaletteByTheme.light;
                applyIconAdaptiveHelpBtnVisual();
                applyIconAdaptiveTooltipVisual();
                applyIconAdaptiveSwitchVisual(isDark);
                styleInputField(dataTextarea, isDark);
                actionTypeHint.style.color = getTextColor(isDark);
                actionTypeDiv.querySelectorAll('input[type="radio"]').forEach(rb => rb.style.accentColor = getPrimaryColor());
                urlMethodContainer.updateTheme(isDark);
                updateEditorTabsTheme(isDark);
                styleButton(confirmBtn, "#2196F3", "#1e88e5");
                styleButton(cancelBtn, "#9E9E9E", "#757575");
            };

            addThemeChangeListener(updateEditPanelTheme);
            updateEditPanelTheme(state.isDarkMode);

            requestAnimationFrame(() => {
                formDiv.style.opacity = "1";
                    formDiv.style.transform = "translateY(0)";
                    setTimeout(() => {
                    [actionInputs.url, actionInputs.selector, iconTextarea, iconDarkTextarea, dataTextarea].forEach(ta => {
                        if (ta && ta.tagName === 'TEXTAREA') {
                            autoResizeTextarea(ta);
                        }
                    });
                    }, 350);
            });

            function closeEdit() {
                state.currentEditCloser = null;
                removeThemeChangeListener(updateEditPanelTheme);
                try { document.removeEventListener("pointerdown", handleIconAdaptiveDocPointerDown, true); } catch {}
                try { if (typeof destroyIconField === "function") destroyIconField(); } catch {}
                try { if (typeof destroyIconLibrary === "function") destroyIconLibrary(); } catch {}
                try { if (typeof destroySimulateKeysCapture === "function") destroySimulateKeysCapture(); } catch {}
                try { if (typeof destroyHotkeyCapture === "function") destroyHotkeyCapture(); } catch {}
                formDiv.style.opacity = "0";
                formDiv.style.transform = "translateY(20px)";
                setTimeout(() => editOverlay.remove(), 300);
            }
        }
