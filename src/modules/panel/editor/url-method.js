function panelCreateUrlMethodConfigUI(ctx, currentMethod = "current", currentAdvanced = "href") {
            const { URL_METHODS, uiShared, state, options } = ctx;
            const { colors } = uiShared;
            const { getPrimaryColor, getTextColor, getHoverColor, getInputBackgroundColor, getBorderColor } = colors;

            const container = document.createElement("div");
            container.style.marginTop = "10px";

            const titleRow = document.createElement("div");
            Object.assign(titleRow.style, {
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "8px"
            });

            const title = document.createElement("div");
            title.textContent = options?.text?.editor?.labels?.urlMethod || "跳转方式:";
            Object.assign(title.style, { fontWeight: "bold", fontSize: "0.9em" });
            titleRow.appendChild(title);

            const expandButton = document.createElement("button");
            expandButton.type = "button";
            expandButton.title = options?.text?.editor?.labels?.urlMethodToggleAdvanced || "展开/折叠高级选项";
            Object.assign(expandButton.style, {
                width: "32px", height: "32px", padding: "0", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "16px", border: "1px solid transparent", background: "transparent",
                borderRadius: "4px", transition: "background-color 0.2s ease, border-color 0.2s ease"
            });
            titleRow.appendChild(expandButton);
            container.appendChild(titleRow);

            const methodRow = document.createElement("div");
            Object.assign(methodRow.style, {
                display: "flex",
                gap: "15px",
                marginBottom: "10px",
                flexWrap: "wrap"
            });

            const methods = Object.entries(URL_METHODS || {}).map(([value, cfg]) => ({
                value,
                text: (cfg && cfg.name) ? cfg.name : value
            }));

            let selectedMethod = currentMethod;
            let selectedAdvanced = currentAdvanced;
            let isExpanded = false;

            methods.forEach(method => {
                const label = document.createElement("label");
                Object.assign(label.style, {
                    display: 'inline-flex',
                    alignItems: 'center',
                    cursor: 'pointer'
                });

                const radio = document.createElement("input");
                radio.type = "radio";
                radio.name = "urlMethod";
                radio.value = method.value;
                radio.checked = selectedMethod === method.value;
                Object.assign(radio.style, { marginRight: "5px", cursor: 'pointer' });

                radio.addEventListener('change', () => {
                    if (radio.checked) {
                        selectedMethod = method.value;
                        const defaultAdvanced = Object.keys(URL_METHODS[method.value].options)[0];
                        selectedAdvanced = defaultAdvanced;
                        updateAdvancedOptions();
                        updateTheme(state.isDarkMode);
                    }
                });

                label.appendChild(radio);
                label.appendChild(document.createTextNode(method.text));
                methodRow.appendChild(label);
            });
            container.appendChild(methodRow);

            const advancedContainer = document.createElement("div");
            Object.assign(advancedContainer.style, {
                display: "none",
                marginTop: "10px",
                padding: "8px",
                borderRadius: "6px",
                border: "1px solid"
            });
            container.appendChild(advancedContainer);

            function updateAdvancedOptions() {
                advancedContainer.replaceChildren();
                const advancedTitle = document.createElement("div");
                advancedTitle.textContent = options?.text?.editor?.labels?.urlMethodAdvanced || "高级选项:";
                Object.assign(advancedTitle.style, {
                    fontWeight: "bold",
                    fontSize: "0.8em",
                    marginBottom: "8px",
                    opacity: "0.8"
                });
                advancedContainer.appendChild(advancedTitle);

                const advancedRow = document.createElement("div");
                Object.assign(advancedRow.style, {
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px"
                });

                const methodConfig = URL_METHODS[selectedMethod];
                if (methodConfig) {
                    Object.entries(methodConfig.options).forEach(([key, option]) => {
                        const label = document.createElement("label");
                        Object.assign(label.style, {
                            display: 'flex',
                            alignItems: 'flex-start',
                            cursor: 'pointer',
                            gap: '8px'
                        });

                        const radio = document.createElement("input");
                        radio.type = "radio";
                        radio.name = "urlAdvanced";
                        radio.value = key;
                        radio.checked = selectedAdvanced === key;
                        Object.assign(radio.style, { cursor: 'pointer', marginTop: '2px' });
                        radio.style.accentColor = getPrimaryColor();

                        radio.addEventListener('change', () => {
                            if (radio.checked) {
                                selectedAdvanced = key;
                            }
                        });

                        const textContainer = document.createElement("div");
                        Object.assign(textContainer.style, {
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '2px'
                        });

                        const nameSpan = document.createElement("span");
                        nameSpan.textContent = option.name;
                        Object.assign(nameSpan.style, {
                            fontWeight: "bold",
                            fontSize: "0.9em"
                        });

                        const descSpan = document.createElement("span");
                        descSpan.textContent = option.desc;
                        Object.assign(descSpan.style, {
                            fontSize: "0.8em",
                            opacity: "0.7",
                            lineHeight: "1.3"
                        });

                        textContainer.appendChild(nameSpan);
                        textContainer.appendChild(descSpan);

                        label.appendChild(radio);
                        label.appendChild(textContainer);
                        advancedRow.appendChild(label);
                    });
                }
                advancedContainer.appendChild(advancedRow);
            }

            expandButton.addEventListener("click", () => {
                isExpanded = !isExpanded;
                advancedContainer.style.display = isExpanded ? 'block' : 'none';
                expandButton.textContent = isExpanded ? '▲' : '▼';
                if (isExpanded) {
                    updateTheme(state.isDarkMode);
                    updateAdvancedOptions();
                }
            });

            expandButton.textContent = isExpanded ? '▲' : '▼';
            updateAdvancedOptions();

            function updateTheme(isDark) {
                title.style.color = getTextColor(isDark);
                expandButton.style.color = getTextColor(isDark);
                expandButton.onmouseover = () => {
                    expandButton.style.backgroundColor = getHoverColor(isDark);
                    expandButton.style.borderColor = getPrimaryColor();
                };
                expandButton.onmouseout = () => {
                    expandButton.style.backgroundColor = 'transparent';
                    expandButton.style.borderColor = 'transparent';
                };
                expandButton.dispatchEvent(new Event('mouseout'));

                advancedContainer.style.backgroundColor = getInputBackgroundColor(isDark);
                advancedContainer.style.borderColor = getBorderColor(isDark);
                container.querySelectorAll('input[type="radio"]').forEach(radio => {
                    radio.style.accentColor = getPrimaryColor();
                });
                container.querySelectorAll('label, span, div').forEach(el => {
                    if (el !== title && !el.querySelector('input')) {
                        el.style.color = getTextColor(isDark);
                    }
                });
            }

            function getConfig() {
                return {
                    method: selectedMethod,
                    advanced: selectedAdvanced
                };
            }

            return {
                container,
                updateTheme,
                getConfig
            };
        }

export { panelCreateUrlMethodConfigUI };
