function panelCreateEnhancedKeyboardCaptureInput(ctx, labelText, currentValue, {
            placeholder = "点击此处，然后按下快捷键组合",
            hint = "💡 支持 Ctrl/Shift/Alt/Cmd + 字母/数字/功能键等组合",
            methodName = "getHotkey",
            captureType = "hotkey"
        } = {}) {
            const { options, state, core, uiShared } = ctx;
            const { theme, colors, style } = uiShared;
            const { addThemeChangeListener, removeThemeChangeListener } = theme;
            const { getPrimaryColor, getTextColor, getBorderColor, getInputBackgroundColor, getHoverColor } = colors;
            const { styleInputField } = style;

            const container = document.createElement("div");
            container.style.margin = "12px 0 4px";

            const label = document.createElement("div");
            label.textContent = labelText;
            Object.assign(label.style, {
                fontWeight: "bold",
                fontSize: "0.9em",
                marginBottom: "8px"
            });
            container.appendChild(label);

            const inputContainer = document.createElement("div");
            Object.assign(inputContainer.style, {
                display: "flex",
                alignItems: "center",
                gap: "10px",
                marginBottom: "8px"
            });

            const mainInput = document.createElement("input");
            mainInput.type = "text";
            mainInput.placeholder = placeholder;
            mainInput.readOnly = true;
            mainInput.dataset.shortcutCapture = "1";
            mainInput.value = currentValue || "";
            Object.assign(mainInput.style, {
                flexGrow: "1",
                cursor: "pointer",
                textAlign: "center",
                fontWeight: "bold",
                fontSize: "14px",
                minWidth: "200px"
            });

            const labelForMessage = String(labelText || "").trim().replace(/[:：]\s*$/, "");

            const clearButton = document.createElement("button");
            clearButton.type = "button";
            clearButton.textContent = "🗑️";
            clearButton.title = options.text.buttons.clear || `清除${labelForMessage}`;
            Object.assign(clearButton.style, {
                padding: "8px 12px",
                border: "1px solid",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "14px",
                backgroundColor: "transparent",
                flexShrink: "0"
            });

            const statusDiv = document.createElement("div");
            Object.assign(statusDiv.style, {
                fontSize: "0.8em",
                marginTop: "5px",
                opacity: "0.7",
                minHeight: "20px"
            });
            statusDiv.textContent = hint;

            let isCapturing = false;
            const capturedModifiers = new Set();
            let capturedMainKey = "";

            function formatCaptureMessage(template, vars = {}) {
                let out = String(template ?? "");
                for (const [key, value] of Object.entries(vars || {})) {
                    out = out.split(`{${key}}`).join(String(value ?? ""));
                }
                return out;
            }

            function startCapture() {
                if (isCapturing) return;
                isCapturing = true;
                capturedModifiers.clear();
                capturedMainKey = "";
                mainInput.value = "";
                mainInput.placeholder = formatCaptureMessage(
                    options?.text?.editor?.capture?.placeholderDuringCapture || "请按下{label}组合...",
                    { label: labelForMessage }
                );
                statusDiv.textContent = formatCaptureMessage(
                    options?.text?.editor?.capture?.statusCapturing || "🎯 正在捕获{label}，请按下组合键...",
                    { label: labelForMessage }
                );
                mainInput.focus();
                updateCaptureState();
            }

            function stopCapture() {
                if (!isCapturing) return;
                isCapturing = false;
                mainInput.placeholder = placeholder;
                const finalKeys = buildHotkeyString();
                if (finalKeys) {
                    mainInput.value = finalKeys;
                    const displayKeys = core?.hotkeys?.formatForDisplay ? (core.hotkeys.formatForDisplay(finalKeys) || finalKeys) : finalKeys;
                    statusDiv.textContent = formatCaptureMessage(
                        options?.text?.editor?.capture?.statusCaptured || "✅ 已捕获{label}: {keys}",
                        { label: labelForMessage, keys: displayKeys }
                    );
                } else {
                    statusDiv.textContent = formatCaptureMessage(
                        options?.text?.editor?.capture?.statusInvalid || "❌ 未捕获到有效的{label}",
                        { label: labelForMessage }
                    );
                }
                mainInput.blur();
                updateCaptureState();
            }

            function buildHotkeyString() {
                if (!capturedMainKey) return "";
                const raw = [...capturedModifiers, capturedMainKey].filter(Boolean).join("+");
                return core?.hotkeys?.normalize ? core.hotkeys.normalize(raw) : raw;
            }

            function updateCaptureState() {
                if (isCapturing) {
                    mainInput.style.backgroundColor = getPrimaryColor() + "20";
                    mainInput.style.borderColor = getPrimaryColor();
                    mainInput.style.boxShadow = `0 0 0 1px ${getPrimaryColor()}`;
                } else {
                    styleInputField(mainInput, state.isDarkMode);
                }
            }

            function handleKeyEvent(e) {
                if (!isCapturing) return;
                e.preventDefault();
                e.stopPropagation();

                const code = e.code;
                const key = e.key;

                if (['ControlLeft', 'ControlRight'].includes(code) || key === 'Control') {
                    if (e.type === 'keydown') capturedModifiers.add('CTRL');
                    else capturedModifiers.delete('CTRL');
                    updateDisplay();
                    return;
                }
                if (['ShiftLeft', 'ShiftRight'].includes(code) || key === 'Shift') {
                    if (e.type === 'keydown') capturedModifiers.add('SHIFT');
                    else capturedModifiers.delete('SHIFT');
                    updateDisplay();
                    return;
                }
                if (['AltLeft', 'AltRight'].includes(code) || key === 'Alt') {
                    if (e.type === 'keydown') capturedModifiers.add('ALT');
                    else capturedModifiers.delete('ALT');
                    updateDisplay();
                    return;
                }
                if (['MetaLeft', 'MetaRight'].includes(code) || key === 'Meta') {
                    if (e.type === 'keydown') capturedModifiers.add('CMD');
                    else capturedModifiers.delete('CMD');
                    updateDisplay();
                    return;
                }

                if (e.type === 'keydown') {
                    const standardKey = core?.hotkeys?.getMainKeyFromEvent ? core.hotkeys.getMainKeyFromEvent(e) : "";
                    if (!standardKey) return;

                    if (captureType === "hotkey" && core?.hotkeys?.isAllowedMainKey && !core.hotkeys.isAllowedMainKey(standardKey)) {
                        const displayKey = core?.hotkeys?.formatKeyToken ? core.hotkeys.formatKeyToken(standardKey) : standardKey;
                        statusDiv.textContent = formatCaptureMessage(
                            options?.text?.editor?.capture?.statusUnsupportedHotkey || "❌ 不支持的快捷键: {key}",
                            { key: displayKey }
                        );
                        return;
                    }

                    if (captureType === "simulate" && core?.hotkeys?.isAllowedSimulateMainKey && !core.hotkeys.isAllowedSimulateMainKey(standardKey)) {
                        const displayKey = core?.hotkeys?.formatKeyToken ? core.hotkeys.formatKeyToken(standardKey) : standardKey;
                        statusDiv.textContent = formatCaptureMessage(
                            options?.text?.editor?.capture?.statusUnsupportedSimulate || "❌ 不支持的模拟按键: {key}",
                            { key: displayKey }
                        );
                        return;
                    }

                    capturedMainKey = standardKey;
                    updateDisplay();
                    setTimeout(stopCapture, 100);
                }
            }

            function updateDisplay() {
                if (!isCapturing) return;
                const orderedMods = core?.hotkeys?.modifierOrder || ['CTRL', 'SHIFT', 'ALT', 'CMD'];
                const displayParts = [];

                for (const mod of orderedMods) {
                    if (!capturedModifiers.has(mod)) continue;
                    displayParts.push(core?.hotkeys?.formatModifierToken ? core.hotkeys.formatModifierToken(mod) : mod);
                }

                if (capturedMainKey) {
                    displayParts.push(core?.hotkeys?.formatKeyToken ? core.hotkeys.formatKeyToken(capturedMainKey) : capturedMainKey);
                }

                mainInput.value = displayParts.join(" + ");
            }

            mainInput.addEventListener("click", startCapture);
            mainInput.addEventListener("focus", startCapture);
            mainInput.addEventListener("keydown", handleKeyEvent);
            mainInput.addEventListener("keyup", handleKeyEvent);
            mainInput.addEventListener("blur", () => {
                setTimeout(() => {
                    if (isCapturing && document.activeElement !== mainInput) {
                        stopCapture();
                    }
                }, 100);
            });

            clearButton.addEventListener("click", () => {
                mainInput.value = "";
                capturedModifiers.clear();
                capturedMainKey = "";
                statusDiv.textContent = formatCaptureMessage(
                    options?.text?.editor?.capture?.statusCleared || "🗑️ {label}已清除",
                    { label: labelForMessage }
                );
                if (isCapturing) {
                    stopCapture();
                }
            });

            inputContainer.appendChild(mainInput);
            inputContainer.appendChild(clearButton);
            container.appendChild(inputContainer);
            container.appendChild(statusDiv);

            const updateTheme = (isDark) => {
                label.style.color = getTextColor(isDark);
                statusDiv.style.color = getTextColor(isDark);
                if (!isCapturing) {
                    styleInputField(mainInput, isDark);
                }
                clearButton.style.color = getTextColor(isDark);
                clearButton.style.borderColor = getBorderColor(isDark);
                clearButton.style.backgroundColor = getInputBackgroundColor(isDark);
                clearButton.onmouseover = () => {
                    clearButton.style.backgroundColor = getHoverColor(isDark);
                    clearButton.style.borderColor = "#F44336";
                };
                clearButton.onmouseout = () => {
                    clearButton.style.backgroundColor = getInputBackgroundColor(isDark);
                    clearButton.style.borderColor = getBorderColor(isDark);
                };
            };

            updateTheme(state.isDarkMode);
            addThemeChangeListener(updateTheme);

            const destroy = () => {
                removeThemeChangeListener(updateTheme);
            };

            const result = { container, destroy };
            result[methodName] = () => mainInput.value.trim();
            return result;
        }

export { panelCreateEnhancedKeyboardCaptureInput };
