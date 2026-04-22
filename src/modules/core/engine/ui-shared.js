/* -------------------------------------------------------------------------- *
 * Module 03 · UI shared (theme, colors, dialogs, layout, styles)
 * -------------------------------------------------------------------------- */

        function createUiSharedLayer(ctx = {}) {
            const { options, state, ids, idPrefix, cssPrefix } = ctx;
            const classPrefix = String(cssPrefix || idPrefix || "shortcut").trim() || "shortcut";

            function debounce(fn, delay = 300) {
                let t = null;
                return function(...args) {
                    clearTimeout(t);
                    t = setTimeout(() => fn.apply(this, args), delay);
                };
            }

            /* ------------------------------ Theme ------------------------------ */

            const darkModeListeners = [];
            function addThemeChangeListener(callback) {
                if (typeof callback === 'function' && !darkModeListeners.includes(callback)) {
                    darkModeListeners.push(callback);
                }
            }
            function removeThemeChangeListener(callback) {
                const idx = darkModeListeners.indexOf(callback);
                if (idx !== -1) darkModeListeners.splice(idx, 1);
            }
            function notifyThemeChangeListeners() {
                darkModeListeners.forEach(callback => {
                    try { callback(state.isDarkMode); } catch (e) {
                        console.error(`${options.consoleTag} theme change listener error`, e);
                    }
                });
            }

            function isColorDark(colorStr) {
                if (!colorStr || colorStr === 'transparent')
                    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
                try {
                    let r, g, b, a = 1;
                    if (colorStr.startsWith('rgba')) {
                        const parts = colorStr.match(/rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)\s*$/i);
                        if (!parts) return window.matchMedia('(prefers-color-scheme: dark)').matches;
                        [, r, g, b, a] = parts.map(Number);
                        a = isNaN(a) ? 1 : a;
                        if (a < 0.5) return false;
                    } else if (colorStr.startsWith('rgb')) {
                        const parts = colorStr.match(/rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)\s*$/i);
                        if (!parts) return window.matchMedia('(prefers-color-scheme: dark)').matches;
                        [, r, g, b] = parts.map(Number);
                    } else if (colorStr.startsWith('#')) {
                        let hex = colorStr.substring(1);
                        if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
                        if (hex.length === 4) hex = hex.split('').map(c => c + c).join('');
                        if (hex.length === 8) a = parseInt(hex.substring(6, 8), 16) / 255;
                        if (hex.length !== 6 && hex.length !== 8) return window.matchMedia('(prefers-color-scheme: dark)').matches;
                        r = parseInt(hex.substring(0, 2), 16);
                        g = parseInt(hex.substring(2, 4), 16);
                        b = parseInt(hex.substring(4, 6), 16);
                        if (a < 0.5) return false;
                    } else {
                        return window.matchMedia('(prefers-color-scheme: dark)').matches;
                    }
                    const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
                    return luminance < 0.5;
                } catch (e) {
                    console.warn(`${options.consoleTag} Error parsing color:`, colorStr, e);
                    return window.matchMedia('(prefers-color-scheme: dark)').matches;
                }
            }

            /* ------------------------------ Colors ----------------------------- */

            function getPrimaryColor() {
                return (options.colors && options.colors.primary) ? options.colors.primary : '#0066cc';
            }
            function getOverlayBackgroundColor(isDark = state.isDarkMode) {
                return isDark ? "rgba(0, 0, 0, 0.7)" : "rgba(0, 0, 0, 0.5)";
            }
            function getPanelBackgroundColor(isDark = state.isDarkMode) {
                return isDark ? "#1a1a1a" : "#ffffff";
            }
            function getInputBackgroundColor(isDark = state.isDarkMode) {
                return isDark ? "#2d2d2d" : "#f9f9f9";
            }
            function getTextColor(isDark = state.isDarkMode) {
                return isDark ? "#ffffff" : "#1a1a1a";
            }
            function getBorderColor(isDark = state.isDarkMode) {
                return isDark ? "#404040" : "#e0e0e0";
            }
            function getTableHeaderBackground(isDark = state.isDarkMode) {
                return isDark ? "#2d2d2d" : "#f5f5f5";
            }
            function getHoverColor(isDark = state.isDarkMode) {
                return isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)";
            }

            function applyThemeCssVariables(isDark = state.isDarkMode) {
                const root = document && document.documentElement ? document.documentElement : null;
                if (!root) return;

                const prefix = String(cssPrefix || idPrefix || "shortcut").trim() || "shortcut";
                const setVar = (name, value) => {
                    try { root.style.setProperty(`--${prefix}-${name}`, String(value ?? "")); } catch {}
                };

                setVar("primary", getPrimaryColor());
                setVar("overlay-bg", getOverlayBackgroundColor(isDark));
                setVar("panel-bg", getPanelBackgroundColor(isDark));
                setVar("input-bg", getInputBackgroundColor(isDark));
                setVar("text", getTextColor(isDark));
                setVar("border", getBorderColor(isDark));
                setVar("table-header-bg", getTableHeaderBackground(isDark));
                setVar("hover-bg", getHoverColor(isDark));
            }

            function detectInitialDarkMode() {
                const htmlEl = document.documentElement;
                const bodyEl = document.body;
                let detectedDarkMode = false;
                const mode = String(state.themeMode || "auto").trim().toLowerCase();
                if (mode === "dark") {
                    detectedDarkMode = true;
                } else if (mode === "light") {
                    detectedDarkMode = false;
                } else if (htmlEl.classList.contains('dark') || bodyEl?.classList?.contains('dark')) {
                    detectedDarkMode = true;
                } else if (htmlEl.getAttribute('data-theme') === 'dark' || bodyEl?.getAttribute?.('data-theme') === 'dark') {
                    detectedDarkMode = true;
                } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                    if (!htmlEl.classList.contains('light') && !bodyEl?.classList?.contains('light')) {
                        detectedDarkMode = true;
                    }
                } else {
                    try {
                        const bgColor = window.getComputedStyle(bodyEl || htmlEl).backgroundColor;
                        if (isColorDark(bgColor)) {
                            detectedDarkMode = true;
                        }
                    } catch (e) {
                        console.warn(`${options.consoleTag} Could not compute background color.`);
                    }
                }

                applyThemeCssVariables(detectedDarkMode);
                if (state.isDarkMode !== detectedDarkMode) {
                    state.isDarkMode = detectedDarkMode;
                    notifyThemeChangeListeners();
                }
            }

            function setupDarkModeObserver() {
                let cleaned = false;
                let intervalId = null;
                let observer = null;
                let removeMediaListener = null;

                if (window.matchMedia) {
                    const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
                    const listener = () => { detectInitialDarkMode(); };
                    if (darkModeMediaQuery.addEventListener) {
                        darkModeMediaQuery.addEventListener('change', listener);
                        removeMediaListener = () => darkModeMediaQuery.removeEventListener('change', listener);
                    } else if (darkModeMediaQuery.addListener) {
                        darkModeMediaQuery.addListener(listener);
                        removeMediaListener = () => darkModeMediaQuery.removeListener(listener);
                    }
                }

                const observerCallback = (mutations) => {
                    let themeMightHaveChanged = false;
                    for (const mutation of mutations) {
                        if (mutation.type === 'attributes' && (mutation.attributeName === 'class' || mutation.attributeName === 'data-theme')) {
                            themeMightHaveChanged = true;
                            break;
                        }
                    }
                    if (themeMightHaveChanged) {
                        detectInitialDarkMode();
                    }
                };
                observer = new MutationObserver(observerCallback);

                const observeTarget = document.documentElement || document.body;
                if (observeTarget) {
                    try {
                        observer.observe(observeTarget, { attributes: true, attributeFilter: ['class', 'data-theme'] });
                    } catch (err) {
                        console.warn(`${options.consoleTag} MutationObserver observe failed`, err);
                    }
                }

                intervalId = setInterval(() => { detectInitialDarkMode(); }, 5000);
                detectInitialDarkMode();

                return () => {
                    if (cleaned) return;
                    cleaned = true;
                    if (intervalId) {
                        clearInterval(intervalId);
                        intervalId = null;
                    }
                    if (observer) {
                        try { observer.disconnect(); } catch {}
                        observer = null;
                    }
                    if (removeMediaListener) {
                        try { removeMediaListener(); } catch {}
                        removeMediaListener = null;
                    }
                };
            }

            /* ------------------------------ Styles ----------------------------- */

            function styleTableHeader(th) {
                const prefix = String(cssPrefix || idPrefix || "shortcut").trim() || "shortcut";
                th.classList.add(`${prefix}-th`);
            }
            function styleTableCell(td) {
                const prefix = String(cssPrefix || idPrefix || "shortcut").trim() || "shortcut";
                td.classList.add(`${prefix}-td`);
            }
            function styleButton(btn, bgColor, hoverColor) {
                const prefix = String(cssPrefix || idPrefix || "shortcut").trim() || "shortcut";
                btn.classList.add(`${prefix}-btn`);
                try {
                    btn.style.setProperty(`--${prefix}-btn-bg`, String(bgColor ?? ""));
                    btn.style.setProperty(`--${prefix}-btn-hover-bg`, String(hoverColor ?? ""));
                } catch {}
            }
            function styleTransparentButton(btn, textColor, hoverBg) {
                const prefix = String(cssPrefix || idPrefix || "shortcut").trim() || "shortcut";
                btn.classList.add(`${prefix}-btn-ghost`);
                try {
                    btn.style.setProperty(`--${prefix}-ghost-color`, String(textColor ?? ""));
                    btn.style.setProperty(`--${prefix}-ghost-hover-bg`, String(hoverBg ?? ""));
                } catch {}
            }
            function styleInputField(input) {
                const prefix = String(cssPrefix || idPrefix || "shortcut").trim() || "shortcut";
                input.classList.add(`${prefix}-input`);
            }

            /* ------------------------------ Dialogs ---------------------------- */

            function showAlert(message, title = options.text.dialogs.alert || "提示") {
                const modal = document.createElement('div');
                modal.className = `${classPrefix}-overlay`;
                modal.style.zIndex = '999999';

                const dialog = document.createElement('div');
                dialog.className = `${classPrefix}-panel`;
                Object.assign(dialog.style, { maxWidth: '400px', width: '90%', maxHeight: '80vh', overflow: 'auto' });

                const titleEl = document.createElement('h3');
                titleEl.textContent = title;
                Object.assign(titleEl.style, {
                    margin: '0 0 15px 0', fontSize: '1.1em', fontWeight: 'bold'
                });
                dialog.appendChild(titleEl);

                const messageEl = document.createElement('p');
                messageEl.textContent = message;
                Object.assign(messageEl.style, {
                    margin: '0 0 20px 0', lineHeight: '1.4', whiteSpace: 'pre-wrap'
                });
                dialog.appendChild(messageEl);

                const buttonContainer = document.createElement('div');
                Object.assign(buttonContainer.style, {
                    textAlign: 'right'
                });

                const okButton = document.createElement('button');
                okButton.textContent = options.text.buttons.confirm || '确定';
                styleButton(okButton, "#4CAF50", "#45A049");
                okButton.onclick = () => {
                    document.body.removeChild(modal);
                };
                buttonContainer.appendChild(okButton);
                dialog.appendChild(buttonContainer);
                modal.appendChild(dialog);
                document.body.appendChild(modal);
                okButton.focus();
            }

            function showConfirmDialog(message, onConfirm, title = options.text.dialogs.confirm || "确认") {
                const modal = document.createElement('div');
                modal.className = `${classPrefix}-overlay`;
                modal.style.zIndex = '999999';

                const dialog = document.createElement('div');
                dialog.className = `${classPrefix}-panel`;
                Object.assign(dialog.style, { maxWidth: '400px', width: '90%', maxHeight: '80vh', overflow: 'auto' });

                const titleEl = document.createElement('h3');
                titleEl.textContent = title;
                Object.assign(titleEl.style, {
                    margin: '0 0 15px 0', fontSize: '1.1em', fontWeight: 'bold'
                });
                dialog.appendChild(titleEl);

                const messageEl = document.createElement('p');
                messageEl.textContent = message;
                Object.assign(messageEl.style, {
                    margin: '0 0 20px 0', lineHeight: '1.4', whiteSpace: 'pre-wrap'
                });
                dialog.appendChild(messageEl);

                const buttonContainer = document.createElement('div');
                Object.assign(buttonContainer.style, {
                    display: 'flex', justifyContent: 'flex-end', gap: '10px'
                });

                const cancelButton = document.createElement('button');
                cancelButton.textContent = options.text.buttons.cancel || '取消';
                styleButton(cancelButton, "#9E9E9E", "#757575");
                cancelButton.onclick = () => {
                    document.body.removeChild(modal);
                };
                buttonContainer.appendChild(cancelButton);

                const confirmButton = document.createElement('button');
                confirmButton.textContent = options.text.buttons.confirm || '确定';
                styleButton(confirmButton, "#F44336", "#D32F2F");
                confirmButton.onclick = () => {
                    document.body.removeChild(modal);
                    if (onConfirm) onConfirm();
                };
                buttonContainer.appendChild(confirmButton);

                dialog.appendChild(buttonContainer);
                modal.appendChild(dialog);
                document.body.appendChild(modal);
                cancelButton.focus();
            }

            function showPromptDialog(message, defaultValue = "", onConfirm = null, title = options.text.dialogs.prompt || "输入") {
                const modal = document.createElement('div');
                modal.className = `${classPrefix}-overlay`;
                modal.style.zIndex = '999999';

                const dialog = document.createElement('div');
                dialog.className = `${classPrefix}-panel`;
                Object.assign(dialog.style, { maxWidth: '400px', width: '90%', maxHeight: '80vh', overflow: 'auto' });

                const titleEl = document.createElement('h3');
                titleEl.textContent = title;
                Object.assign(titleEl.style, {
                    margin: '0 0 15px 0', fontSize: '1.1em', fontWeight: 'bold'
                });
                dialog.appendChild(titleEl);

                const messageEl = document.createElement('p');
                messageEl.textContent = message;
                Object.assign(messageEl.style, {
                    margin: '0 0 10px 0', lineHeight: '1.4', whiteSpace: 'pre-wrap'
                });
                dialog.appendChild(messageEl);

                const input = document.createElement('input');
                input.type = 'text';
                input.value = defaultValue || '';
                Object.assign(input.style, { width: '100%', marginBottom: '20px' });
                styleInputField(input);
                dialog.appendChild(input);

                const buttonContainer = document.createElement('div');
                Object.assign(buttonContainer.style, {
                    display: 'flex', justifyContent: 'flex-end', gap: '10px'
                });

                const cancelButton = document.createElement('button');
                cancelButton.textContent = options.text.buttons.cancel || '取消';
                styleButton(cancelButton, "#9E9E9E", "#757575");
                cancelButton.onclick = () => {
                    document.body.removeChild(modal);
                };
                buttonContainer.appendChild(cancelButton);

                const confirmButton = document.createElement('button');
                confirmButton.textContent = options.text.buttons.confirm || '确定';
                styleButton(confirmButton, "#4CAF50", "#45A049");
                confirmButton.onclick = () => {
                    const val = input.value;
                    document.body.removeChild(modal);
                    if (onConfirm) onConfirm(val);
                };
                buttonContainer.appendChild(confirmButton);

                dialog.appendChild(buttonContainer);
                modal.appendChild(dialog);
                document.body.appendChild(modal);
                input.focus();
                input.select();
            }

            /* ------------------------------ Layout ----------------------------- */

            function preventScrollEvent(e) {
                if (isEventFromPanel(e)) return;
                e.preventDefault();
                e.stopPropagation();
                return false;
            }

            function preventScrollKeyEvent(e) {
                const scrollKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'PageUp', 'PageDown', 'Home', 'End', 'Space'];
                if (scrollKeys.includes(e.code) || scrollKeys.includes(e.key)) {
                    if (isEventFromScrollableElement(e)) return;
                    e.preventDefault();
                    e.stopPropagation();
                    return false;
                }
            }

            function isEventFromPanel(e) {
                if (!e.target) return false;
                const panel = document.getElementById(ids.settingsPanel);
                const edit = document.getElementById(ids.editForm);
                return (panel && panel.contains(e.target)) || (edit && edit.contains(e.target));
            }

            function isEventFromScrollableElement(e) {
                if (!e.target) return false;
                let element = e.target;
                while (element && element !== document.body) {
                    const style = window.getComputedStyle(element);
                    const isScrollable = style.overflowY === 'auto' ||
                                        style.overflowY === 'scroll' ||
                                        style.overflow === 'auto' ||
                                        style.overflow === 'scroll';

                    if (isScrollable) {
                        return isEventFromPanel(e);
                    }
                    element = element.parentElement;
                }
                return false;
            }

            function enableScrollLock() {
                if (state.scrollLock.isLocked) return;
                const lock = state.scrollLock;

                lock.scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                lock.scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
                lock.originalBodyOverflow = document.body.style.overflow || '';
                lock.originalBodyPosition = document.body.style.position || '';
                lock.originalBodyTop = document.body.style.top || '';
                lock.originalBodyLeft = document.body.style.left || '';
                lock.originalBodyWidth = document.body.style.width || '';

                document.body.style.overflow = 'hidden';
                document.body.style.position = 'fixed';
                document.body.style.top = `-${lock.scrollTop}px`;
                document.body.style.left = `-${lock.scrollLeft}px`;
                document.body.style.width = '100%';

                lock.isLocked = true;

                document.addEventListener('wheel', preventScrollEvent, { passive: false, capture: true });
                document.addEventListener('touchmove', preventScrollEvent, { passive: false, capture: true });
                document.addEventListener('scroll', preventScrollEvent, { passive: false, capture: true });
                document.addEventListener('keydown', preventScrollKeyEvent, { passive: false, capture: true });
            }

            function disableScrollLock() {
                if (!state.scrollLock.isLocked) return;
                const lock = state.scrollLock;

                document.removeEventListener('wheel', preventScrollEvent, { capture: true });
                document.removeEventListener('touchmove', preventScrollEvent, { capture: true });
                document.removeEventListener('scroll', preventScrollEvent, { capture: true });
                document.removeEventListener('keydown', preventScrollKeyEvent, { capture: true });

                document.body.style.overflow = lock.originalBodyOverflow;
                document.body.style.position = lock.originalBodyPosition;
                document.body.style.top = lock.originalBodyTop;
                document.body.style.left = lock.originalBodyLeft;
                document.body.style.width = lock.originalBodyWidth;

                window.scrollTo(lock.scrollLeft, lock.scrollTop);
                lock.isLocked = false;
            }

            function shouldUseCompactMode(container) {
                if (!container) return false;
                const containerWidth = container.offsetWidth;
                return containerWidth < (options.ui.compactBreakpoint || 800);
            }

            function createResponsiveListener(container, callback) {
                if (!window.ResizeObserver) {
                    const handleResize = debounce(() => {
                        const newCompactMode = shouldUseCompactMode(container);
                        if (newCompactMode !== state.isCompactMode) {
                            state.isCompactMode = newCompactMode;
                            callback(state.isCompactMode);
                        }
                    }, 200);
                    window.addEventListener('resize', handleResize);
                    return () => window.removeEventListener('resize', handleResize);
                }

                const resizeObserver = new ResizeObserver(debounce((entries) => {
                    for (const entry of entries) {
                        if (entry.target === container) {
                            const newCompactMode = shouldUseCompactMode(container);
                            if (newCompactMode !== state.isCompactMode) {
                                state.isCompactMode = newCompactMode;
                                callback(state.isCompactMode);
                            }
                        }
                    }
                }, 200));

                try { resizeObserver.observe(container); } catch {}

                return () => {
                    try { resizeObserver.disconnect(); } catch {}
                };
            }

            function autoResizeTextarea(textarea) {
                textarea.style.height = "auto";
                const style = window.getComputedStyle(textarea);
                const lineHeight = parseInt(style.lineHeight) || 20;
                const paddingTop = parseInt(style.paddingTop) || 0;
                const paddingBottom = parseInt(style.paddingBottom) || 0;
                const minHeight = lineHeight + paddingTop + paddingBottom;
                const maxHeight = lineHeight * 5 + paddingTop + paddingBottom;
                let newHeight = textarea.scrollHeight;
                if (newHeight < minHeight) {
                    newHeight = minHeight;
                } else if (newHeight > maxHeight) {
                    newHeight = maxHeight;
                    textarea.style.overflowY = "auto";
                } else {
                    textarea.style.overflowY = "hidden";
                }
                textarea.style.height = newHeight + "px";
            }

            return Object.freeze({
                theme: Object.freeze({
                    addThemeChangeListener,
                    removeThemeChangeListener,
                    setupDarkModeObserver,
                    detectInitialDarkMode,
                    applyThemeCssVariables
                }),
                colors: Object.freeze({
                    getPrimaryColor,
                    getOverlayBackgroundColor,
                    getPanelBackgroundColor,
                    getInputBackgroundColor,
                    getTextColor,
                    getBorderColor,
                    getTableHeaderBackground,
                    getHoverColor
                }),
                style: Object.freeze({
                    styleTableHeader,
                    styleTableCell,
                    styleButton,
                    styleTransparentButton,
                    styleInputField
                }),
                dialogs: Object.freeze({
                    showAlert,
                    showConfirmDialog,
                    showPromptDialog
                }),
                layout: Object.freeze({
                    enableScrollLock,
                    disableScrollLock,
                    autoResizeTextarea,
                    createResponsiveListener,
                    shouldUseCompactMode
                }),
                utils: Object.freeze({
                    debounce
                })
            });
        }

export { createUiSharedLayer };
