import { createKeyboardLayer } from "./keyboard.js";
import { createSettingsPanelLayer } from "../../panel/settings/index.js";
import { gmRegisterMenuCommand } from "../../shared/platform/userscript.js";

/* -------------------------------------------------------------------------- *
 * Module 06 · Styling & exports (CSS injection, lifecycle, global API)
 * -------------------------------------------------------------------------- */

        function createEngineApi(ctx = {}) {
            const {
                options,
                state,
                core,
                uiShared,
                cssPrefix,
                ids,
                classes,
                URL_METHODS
            } = ctx;

            const keyboardLayer = createKeyboardLayer(ctx);
            const settingsPanelLayer = createSettingsPanelLayer(ctx);

            /* ------------------------------------------------------------------
             * 样式注入
             * ------------------------------------------------------------------ */

            function injectBaseCss() {
                const styleId = `${cssPrefix}-base-style`;
                let styleEl = document.getElementById(styleId);
                if (!styleEl) {
                    styleEl = document.createElement('style');
                    styleEl.id = styleId;
                    document.head.appendChild(styleEl);
                }

                const p = String(cssPrefix || "shortcut").trim() || "shortcut";
                styleEl.textContent = `
                    .${p}-btn {
                        background: var(--${p}-btn-bg, var(--${p}-primary));
                        border: 1px solid var(--${p}-btn-bg, var(--${p}-primary));
                        color: var(--${p}-btn-text, #fff);
                        border-radius: 6px;
                        padding: 8px 16px;
                        cursor: pointer;
                        font-size: 14px;
                        font-weight: 500;
                        transition: background-color 0.2s ease, border-color 0.2s ease, transform 0.05s ease;
                    }
                    .${p}-btn:hover {
                        background: var(--${p}-btn-hover-bg, var(--${p}-btn-bg, var(--${p}-primary)));
                        border-color: var(--${p}-btn-hover-bg, var(--${p}-btn-bg, var(--${p}-primary)));
                    }
                    .${p}-btn:active { transform: translateY(1px); }
                    .${p}-btn:disabled { opacity: 0.6; cursor: not-allowed; }
                    .${p}-btn:focus-visible {
                        outline: none;
                        box-shadow: 0 0 0 2px var(--${p}-panel-bg), 0 0 0 4px var(--${p}-primary);
                    }

                    .${p}-btn-ghost {
                        background: transparent;
                        color: var(--${p}-ghost-color, var(--${p}-text));
                        border: none;
                        border-radius: 4px;
                        padding: 6px 8px;
                        cursor: pointer;
                        font-size: 16px;
                        line-height: 1;
                        transition: background-color 0.2s ease;
                    }
                    .${p}-btn-ghost:hover { background: var(--${p}-ghost-hover-bg, var(--${p}-hover-bg)); }
                    .${p}-btn-ghost:focus-visible {
                        outline: none;
                        box-shadow: 0 0 0 2px var(--${p}-panel-bg), 0 0 0 4px var(--${p}-primary);
                    }

                    .${p}-input {
                        box-sizing: border-box;
                        width: 100%;
                        padding: 8px 10px;
                        border: 1px solid var(--${p}-border);
                        border-radius: 6px;
                        font-size: 14px;
                        outline: none;
                        background: var(--${p}-input-bg);
                        color: var(--${p}-text);
                        transition: border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease;
                    }
                    .${p}-input:focus {
                        border-color: var(--${p}-primary);
                        box-shadow: 0 0 0 1px var(--${p}-primary);
                    }

                    .${p}-th {
                        border-bottom: 2px solid var(--${p}-border);
                        padding: 10px 8px;
                        text-align: left;
                        background: var(--${p}-table-header-bg);
                        font-weight: bold;
                        position: sticky;
                        top: -1px;
                        z-index: 1;
                        color: var(--${p}-text);
                    }
                    .${p}-td {
                        padding: 10px 8px;
                        border-bottom: 1px solid var(--${p}-border);
                        vertical-align: middle;
                        color: var(--${p}-text);
                        font-size: 14px;
                    }

                    .${p}-overlay {
                        position: fixed;
                        top: 0;
                        left: 0;
                        width: 100vw;
                        height: 100vh;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        padding: 20px;
                        box-sizing: border-box;
                        background: var(--${p}-overlay-bg);
                    }

                    .${p}-panel {
                        background: var(--${p}-panel-bg);
                        color: var(--${p}-text);
                        border: 1px solid var(--${p}-border);
                        border-radius: 8px;
                        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
                        padding: 20px;
                        box-sizing: border-box;
                        font-family: sans-serif;
                        position: relative;
                    }

                    .${p}-filter-button {
                        flex: 0 0 auto;
                        display: inline-flex;
                        align-items: center;
                        padding: 6px 12px;
                        border-radius: 12px;
                        font-size: 12px;
                        font-weight: bold;
                        white-space: nowrap;
                        min-width: fit-content;
                        cursor: pointer;
                        transition: all 0.2s ease;
                        outline: none;
                        border: 2px solid var(--${p}-filter-color, var(--${p}-primary));
                        color: var(--${p}-filter-color, var(--${p}-primary));
                        background-color: transparent;
                    }
                    .${p}-filter-button[data-active="1"] {
                        background-color: var(--${p}-filter-color, var(--${p}-primary));
                        color: #fff;
                    }
                    .${p}-filter-button:hover:not([data-active="1"]) {
                        background-color: var(--${p}-hover-bg);
                        transform: scale(1.05);
                    }
                    .${p}-filter-label { margin-right: 6px; }
                    .${p}-filter-count {
                        background: var(--${p}-filter-color, var(--${p}-primary));
                        color: #fff;
                        padding: 2px 6px;
                        border-radius: 8px;
                    }
                    .${p}-filter-button[data-active="1"] .${p}-filter-count {
                        background: rgba(255,255,255,0.3);
                    }
                `;

                return () => {
                    try { styleEl.remove(); } catch {}
                };
            }

            function injectDragCss() {
                const styleId = `${cssPrefix}-drag-style`;
                let styleEl = document.getElementById(styleId);
                if (!styleEl) {
                    styleEl = document.createElement('style');
                    styleEl.id = styleId;
                    document.head.appendChild(styleEl);
                }

                const updateDragStyle = () => {
                    const primaryColor = uiShared.colors.getPrimaryColor();
                    styleEl.textContent = `
                        #${ids.tableBody}.is-dragging tr {
                            opacity: 0.5;
                        }
                        #${ids.tableBody} tr.dragging {
                            opacity: 1 !important;
                            background-color: ${primaryColor}30 !important;
                            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
                        }
                        #${ids.tableBody} tr.dragover-top {
                            border-top: 2px dashed ${primaryColor};
                        }
                        #${ids.tableBody} tr.dragover-bottom {
                            border-bottom: 2px dashed ${primaryColor};
                        }

                        .${classes.compactContainer}.is-dragging .${classes.compactCard} {
                            opacity: 0.5;
                        }
                        .${classes.compactCard}.dragging {
                            opacity: 1 !important;
                            background-color: ${primaryColor}30 !important;
                            box-shadow: 0 4px 12px rgba(0,0,0,0.3) !important;
                            transform: scale(1.02);
                            border-color: ${primaryColor} !important;
                        }
                        .${classes.compactCard}.dragover-top {
                            border-top: 3px dashed ${primaryColor} !important;
                        }
                        .${classes.compactCard}.dragover-bottom {
                            border-bottom: 3px dashed ${primaryColor} !important;
                        }

                        @media (max-width: ${options.ui.compactBreakpoint || 800}px) {
                            .${classes.compactCard} {
                                margin: 0;
                                max-width: 100%;
                                align-self: flex-start;
                            }
                            .${classes.compactContainer} {
                                align-items: stretch !important;
                            }
                        }
                    `;
                };

                uiShared.theme.addThemeChangeListener(updateDragStyle);
                updateDragStyle(state.isDarkMode);
                return () => {
                    uiShared.theme.removeThemeChangeListener(updateDragStyle);
                    try { styleEl.remove(); } catch {}
                };
            }

            /* ------------------------------------------------------------------
             * 生命周期
             * ------------------------------------------------------------------ */

            function init() {
                keyboardLayer.init();
                if (typeof state.destroyDarkModeObserver === "function") {
                    try { state.destroyDarkModeObserver(); } catch {}
                }
                state.destroyDarkModeObserver = uiShared.theme.setupDarkModeObserver();

                if (typeof state.destroyBaseCss === "function") {
                    try { state.destroyBaseCss(); } catch {}
                }
                state.destroyBaseCss = injectBaseCss();

                if (typeof state.destroyDragCss === "function") {
                    try { state.destroyDragCss(); } catch {}
                }
                state.destroyDragCss = injectDragCss();

                const menuLabel = options.menuCommandLabel || options.text.menuLabelFallback;
                const bootstrapMenuBridge = options?.menuBridge;
                const bootstrapMenuManaged = options?.bootstrapMenuManaged === true || bootstrapMenuBridge?.managedByBootstrap === true;
                if (!state.menuCommandRegistered && bootstrapMenuManaged) {
                    if (bootstrapMenuBridge?.managedByBootstrap && typeof bootstrapMenuBridge.setSettingsHandler === "function") {
                        try {
                            bootstrapMenuBridge.setSettingsHandler(settingsPanelLayer.openSettingsPanel);
                        } catch {}
                    }
                    state.menuCommandRegistered = true;
                } else if (!state.menuCommandRegistered) {
                    const commandId = gmRegisterMenuCommand(menuLabel, settingsPanelLayer.openSettingsPanel);
                    if (commandId !== null && commandId !== undefined) {
                        state.menuCommandRegistered = true;
                    }
                }
            }

            function destroy() {
                keyboardLayer.destroy();
                settingsPanelLayer.closeSettingsPanel();
                if (typeof state.destroyDragCss === "function") {
                    try { state.destroyDragCss(); } catch {}
                    state.destroyDragCss = null;
                }
                if (typeof state.destroyBaseCss === "function") {
                    try { state.destroyBaseCss(); } catch {}
                    state.destroyBaseCss = null;
                }
                if (typeof state.destroyDarkModeObserver === "function") {
                    try { state.destroyDarkModeObserver(); } catch {}
                    state.destroyDarkModeObserver = null;
                }
                if (options?.menuBridge?.managedByBootstrap && typeof options.menuBridge.setSettingsHandler === "function") {
                    try { options.menuBridge.setSettingsHandler(null); } catch {}
                }
                uiShared.layout.disableScrollLock();
            }

            function getShortcuts() {
                return core.getShortcuts();
            }

            function setShortcuts(newShortcuts) {
                core.setShortcuts(newShortcuts, { persist: true });
            }

            return Object.freeze({
                init,
                destroy,
                openSettingsPanel: settingsPanelLayer.openSettingsPanel,
                closeSettingsPanel: settingsPanelLayer.closeSettingsPanel,
                getShortcuts,
                setShortcuts,
                registerActionHandler: (actionType, handler, meta = {}) => core?.actions?.register?.(actionType, handler, meta),
                unregisterActionHandler: (actionType) => core?.actions?.unregister?.(actionType),
                listActionTypes: () => core?.actions?.list?.() || [],
                core,
                uiShared,
                URL_METHODS
            });
        }

export { createEngineApi };
