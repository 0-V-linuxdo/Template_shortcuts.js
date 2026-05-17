/* -------------------------------------------------------------------------- *
 * Quick Input · Config and runtime helpers
 * -------------------------------------------------------------------------- */

import { sleep, clampInt, normalizeHotkeyString, normalizeHotkeyFallback } from "../shared/base.js";
import { safeStoreGet, safeStoreSet } from "./storage.js";

const STEP_DELAY_MAX_MS = 30000;
        const LOOP_DELAY_MAX_MS = 300000;

        const DELAY_UNIT_FACTORS = Object.freeze({
            ms: 1,
            s: 1000,
            m: 60000
        });

        function normalizeDelayUnit(value) {
            const raw = String(value ?? "").trim().toLowerCase();
            if (!raw) return "";
            if (["ms", "millisecond", "milliseconds", "毫秒"].includes(raw)) return "ms";
            if (["s", "sec", "secs", "second", "seconds", "秒"].includes(raw)) return "s";
            if (["m", "min", "mins", "minute", "minutes", "分钟"].includes(raw)) return "m";
            return "";
        }

        function inferDelayUnitFromMs(value) {
            const ms = Math.max(0, Number(value) || 0);
            if (ms >= DELAY_UNIT_FACTORS.m) return "m";
            if (ms >= DELAY_UNIT_FACTORS.s) return "s";
            return "ms";
        }

        function getDelayUnitFactor(unit) {
            return DELAY_UNIT_FACTORS[normalizeDelayUnit(unit)] || DELAY_UNIT_FACTORS.ms;
        }

        function formatDelayNumber(value) {
            const num = Number(value);
            if (!Number.isFinite(num)) return "0";
            const rounded = Math.round(num * 10000) / 10000;
            if (Object.is(rounded, -0)) return "0";
            return Number.isInteger(rounded)
                ? String(rounded)
                : rounded.toFixed(4).replace(/\.?0+$/, "");
        }

        function convertDelayMsToDisplayValue(ms, unit) {
            return Math.max(0, Number(ms) || 0) / getDelayUnitFactor(unit);
        }

        function convertDelayInputToMs(value, unit) {
            const num = Number.parseFloat(String(value ?? "").trim());
            if (!Number.isFinite(num)) return NaN;
            return Math.max(0, num) * getDelayUnitFactor(unit);
        }

        function clampDelayMs(value, maxMs, fallbackMs) {
            const safeMax = Math.max(0, Number(maxMs) || 0);
            const safeFallback = clampInt(fallbackMs, { min: 0, max: safeMax, fallback: 0 });
            const rounded = Number.isFinite(value) ? Math.round(value) : safeFallback;
            return clampInt(rounded, { min: 0, max: safeMax, fallback: safeFallback });
        }

        function formatDelayInputValue(ms, unit) {
            return formatDelayNumber(convertDelayMsToDisplayValue(ms, unit));
        }

        function formatDelayWithUnit(ms, unit, unitLabels = null) {
            const normalizedUnit = normalizeDelayUnit(unit) || inferDelayUnitFromMs(ms);
            const labels = unitLabels && typeof unitLabels === "object" ? unitLabels : null;
            const unitLabel = String(
                labels?.[normalizedUnit]
                || DELAY_UNIT_LABELS[normalizedUnit]
                || DELAY_UNIT_LABELS.ms
            );
            return `${formatDelayInputValue(ms, normalizedUnit)} ${unitLabel}`;
        }

        const DELAY_UNIT_LABELS = Object.freeze({
            ms: "毫秒",
            s: "秒",
            m: "分钟"
        });

        const QUICK_INPUT_SVG_NS = "http://www.w3.org/2000/svg";

        const DEFAULT_LABELS = Object.freeze({
            title: "快捷输入",
            tabs: Object.freeze({ input: "输入", log: "日志" }),
            sections: Object.freeze({
                moreSettings: "更多设置"
            }),
            fields: Object.freeze({
                images: "图片：",
                preview: "预览：",
                text: "输入：",
                hotkeys: "触发快捷键\n(可选)：",
                loopCount: "循环次数：",
                newChatHotkey: "新对话快捷键：",
                stepDelay: "步骤间隔：",
                loopDelay: "循环间隔：",
                options: "选项："
            }),
            buttons: Object.freeze({
                run: "运行",
                replay: "重试",
                stop: "停止",
                pause: "暂停",
                resume: "继续",
                addHotkey: "增加快捷键",
                delete: "删除",
                exportToClipboard: "导出到剪贴板",
                importFromClipboard: "从剪贴板导入",
                clearImages: "清空图片"
            }),
            placeholders: Object.freeze({
                imageDrop: "点击选择 / 粘贴 / 拖拽图片",
                imageDropMore: "支持：点击上传、输入框粘贴、拖拽上传",
                imageDropOverlay: "松开鼠标继续追加图片",
                text: "在这里输入/粘贴要发送的文字…",
                hotkeyEmpty: "留空则不触发",
                hotkeyPrimary: "留空则不触发（例如：CTRL+I）",
                hotkeyExtra: "例如：CTRL+I",
                newChatHotkey: "例如：CTRL+N"
            }),
            hints: Object.freeze({
                flow: "流程：插入图片/文字 → (触发快捷键) → 发送 → (循环)"
            }),
            options: Object.freeze({
                clearBeforeRun: "运行前清空输入框与附件"
            }),
            delayUnits: Object.freeze({
                ms: "毫秒",
                s: "秒",
                m: "分钟"
            }),
            stages: Object.freeze({
                beforeReset: "重传前",
                beforeRepair: "补图前",
                loopStart: "本轮开始",
                afterComposerFocus: "输入框聚焦后",
                beforeImages: "贴图前",
                beforeText: "文字输入前",
                afterText: "文字输入后",
                beforeTool: "工具快捷键前",
                beforeSend: "发送前"
            }),
            aria: Object.freeze({
                close: "关闭",
                exportToClipboard: "导出当前快捷输入到剪贴板",
                importFromClipboard: "从剪贴板导入快捷输入",
                deleteHotkey: "删除该快捷键",
                deleteImage: "删除该图片",
                clearImages: "清空图片"
            }),
            messages: Object.freeze({
                noImagesDetected: "未检测到图片文件。",
                imagesLoaded: (count, kb, totalCount = count, renamedCount = 0) => `已添加图片：${count} 张（当前共 ${totalCount} 张，本次约 ${kb} KB${renamedCount > 0 ? `，重名自动改名 ${renamedCount} 张` : ""}）`,
                imageDeleted: (label, remaining) => `已删除图片${label}（剩余 ${remaining} 张）。`,
                imagesCleared: "已清除图片。",
                missingNewChatHotkey: "请填写「新对话快捷键」。",
                missingInput: "请先输入文字或载入图片。",
                startRows: (loopCount, toolHotkeys, newChatHotkey, imageCount) => [
                    { label: "循环次数：", value: `${loopCount} 次` },
                    { label: "工具快捷键：", value: toolHotkeys.length ? toolHotkeys.join("、") : "(无)" },
                    { label: "新对话快捷键：", value: newChatHotkey },
                    { label: "图片数量：", value: `${imageCount} 张` }
                ],
                start: (loopCount, toolHotkeys, newChatHotkey, imageCount) => [
                    `循环次数：${loopCount} 次`,
                    `工具快捷键：${toolHotkeys.length ? toolHotkeys.join("、") : "(无)"}`,
                    `新对话快捷键：${newChatHotkey}`,
                    `图片数量：${imageCount} 张`
                ].join("\n"),
                startSummary: "执行配置",
                loopMarker: (i, loopCount) => `—— 第 ${i}/${loopCount} 次 ——`,
                composerNotFound: "未找到输入框：请先点击一次输入框再运行。",
                textInserted: (ok) => (ok ? "已输入文字。" : "输入文字失败。"),
                textRetrying: (stage, attempt = 1, maxAttempts = 1) => `文字校验失败${stage ? `（${stage}）` : ""}：准备自动重试 ${attempt}/${maxAttempts} 次。`,
                textNotReady: (stage) => `文字未真正写入输入框${stage ? `（${stage}）` : ""}：自动补救后仍失败，已停止当前运行，避免发送空内容。`,
                hotkeyTriggered: (hotkey, ok) => (ok ? `已触发快捷键：${hotkey}` : `触发快捷键失败：${hotkey}`),
                waitingUploads: (count) => `等待图片上传完成…（${count} 张）`,
                resettingImages: (currentCount, expectedCount, attempt = 1, maxAttempts = 1) => `图片就绪等待超时：当前识别到 ${currentCount} / ${expectedCount} 张，准备清空当前附件并整组重传（第 ${attempt}/${maxAttempts} 次）。`,
                reuploadedImages: (count, expectedCount = count) => `已清空当前附件，并重新上传图片：${count} 张（目标共 ${expectedCount} 张）。`,
                clearAttachmentsFailed: "清空当前图片附件失败：已取消本轮发送。",
                repairingImages: (missingCount, currentCount, expectedCount, attempt, maxAttempts) => `检测到图片缺失：当前 ${currentCount} / ${expectedCount} 张，正在自动补齐缺失的 ${missingCount} 张（第 ${attempt}/${maxAttempts} 次）。`,
                repairedImages: (count, expectedCount) => `已自动补齐图片：${count} 张（目标共 ${expectedCount} 张）。`,
                uploadNotReady: "图片尚未上传完成：已取消发送，避免文字先发。",
                sendAttempted: (ok) => (ok ? "已尝试发送（Enter/Send）。" : "发送失败。"),
                maxDelayTitle: (formattedDelay) => `最大 ${formattedDelay}`,
                diagnostics: (json) => `诊断: ${json}`,
                savedHotkeyMissing: (hotkey) => `已保存：${hotkey}（未找到）`,
                imageCountNotReady: (current, expected) => `图片数量未达到预期：当前 ${current} 张，期望至少 ${expected} 张。`,
                imageUploadTimeout: (current) => `等待图片上传完成超时：当前识别到 ${current} 张图片。`,
                textVerifyFailed: (stage, actualLength, expectedLength) => `文字校验失败${stage ? `（${stage}）` : ""}：当前检测到 ${actualLength} / ${expectedLength} 个字符。`,
                imageReuploadFailed: "图片重新上传失败：已取消发送，避免文字先发。",
                imageInsertFailed: "图片插入失败：本轮将中止发送。",
                imagesInserted: (count) => `已成功插入图片：${count} 张。`,
                imageReady: "图片已就绪。",
                loopDelayBeforeNewChat: (ms, formattedDelay = formatDelayWithUnit(ms, inferDelayUnitFromMs(ms), DELAY_UNIT_LABELS)) => `循环间隔等待中：${formattedDelay}（发送后 → 新对话前）。`,
                newChatTriggered: (hotkey, ok) => (ok ? `已触发循环：${hotkey} 新建对话。` : `循环新建对话失败：${hotkey}。`),
                newChatRetrying: (hotkey, attempt, maxRetries) => `新对话校验失败：准备自动重试 ${attempt}/${maxRetries} 次（${hotkey}）。`,
                newChatNotReady: "新对话在自动重试后仍未就绪：已停止后续循环，避免在旧上下文继续执行。",
                replayNewChatTriggered: (hotkey, ok) => (ok ? "" : `重试前新建对话失败：${hotkey}。`),
                replayNewChatRetrying: (hotkey, attempt, maxRetries) => `重试前新对话校验失败：准备自动重试 ${attempt}/${maxRetries} 次（${hotkey}）。`,
                replayNewChatNotReady: "重试前新对话在自动重试后仍未就绪：已取消本次重试，避免在旧上下文继续执行。",
                inputUrlRecovering: (stage, hotkey) => `输入前 URL 校验失败${stage ? `（${stage}）` : ""}：准备自动重新触发 ${hotkey} 新建对话。`,
                inputUrlNotReady: (stage) => `输入前 URL 校验失败${stage ? `（${stage}）` : ""}：自动补救后仍未恢复，已停止后续循环，避免在错误会话继续执行。`,
                paused: "已暂停。",
                resumed: "已继续。",
                stopped: "已停止！",
                failed: "失败！",
                finished: "完成！",
                stopRequested: "收到停止请求，将尽快停止…",
                exportSuccess: "已导出快捷输入到剪贴板。",
                exportFailed: "导出失败：请检查剪贴板权限后重试。",
                importSuccess: "已从剪贴板导入快捷输入。",
                importClipboardReadFailed: "导入失败：无法读取剪贴板，请检查浏览器权限。",
                importJsonParseFailed: "导入失败：剪贴板内容不是有效 JSON。",
                importInvalidPayload: "导入失败：剪贴板中未找到有效的 Quick Input 数据。",
                importImageRestoreFailed: "导入失败：图片数据无法恢复，当前内容未改变。",
                missingAttachAdapter: "图片发送未配置：请在 quickInput.adapter.attachImages 中实现图片插入逻辑。"
            })
        });

        const DEFAULT_LABEL_MESSAGES = Object.freeze({
            "zh-CN": DEFAULT_LABELS,
            "en-US": Object.freeze({
                title: "Quick Input",
                tabs: Object.freeze({ input: "Input", log: "Log" }),
                sections: Object.freeze({
                    moreSettings: "More settings"
                }),
                fields: Object.freeze({
                    images: "Images:",
                    preview: "Preview:",
                    text: "Text:",
                    hotkeys: "Tool shortcuts\n(optional):",
                    loopCount: "Loop count:",
                    newChatHotkey: "New chat shortcut:",
                    stepDelay: "Step delay:",
                    loopDelay: "Loop delay:",
                    options: "Options:"
                }),
                buttons: Object.freeze({
                    run: "Run",
                    replay: "Retry",
                    stop: "Stop",
                    pause: "Pause",
                    resume: "Resume",
                    addHotkey: "Add shortcut",
                    delete: "Delete",
                    exportToClipboard: "Export to clipboard",
                    importFromClipboard: "Import from clipboard",
                    clearImages: "Clear images"
                }),
                placeholders: Object.freeze({
                    imageDrop: "Click / paste / drag images",
                    imageDropMore: "Supports click upload, input paste, and drag upload",
                    imageDropOverlay: "Release to append images",
                    text: "Type or paste text to send...",
                    hotkeyEmpty: "Leave empty to skip",
                    hotkeyPrimary: "Leave empty to skip (for example: CTRL+I)",
                    hotkeyExtra: "Example: CTRL+I",
                    newChatHotkey: "Example: CTRL+N"
                }),
                hints: Object.freeze({
                    flow: "Flow: insert images/text -> trigger shortcuts -> send -> repeat"
                }),
                options: Object.freeze({
                    clearBeforeRun: "Clear input and attachments before running"
                }),
                delayUnits: Object.freeze({
                    ms: "ms",
                    s: "s",
                    m: "min"
                }),
                stages: Object.freeze({
                    beforeReset: "Before re-upload",
                    beforeRepair: "Before image repair",
                    loopStart: "Loop start",
                    afterComposerFocus: "After focusing input",
                    beforeImages: "Before inserting images",
                    beforeText: "Before text input",
                    afterText: "After text input",
                    beforeTool: "Before tool shortcut",
                    beforeSend: "Before send"
                }),
                aria: Object.freeze({
                    close: "Close",
                    exportToClipboard: "Export this Quick Input session to clipboard",
                    importFromClipboard: "Import Quick Input from clipboard",
                    deleteHotkey: "Delete this shortcut",
                    deleteImage: "Delete this image",
                    clearImages: "Clear images"
                }),
                messages: Object.freeze({
                    noImagesDetected: "No image files detected.",
                    imagesLoaded: (count, kb, totalCount = count, renamedCount = 0) => `Added images: ${count} (current total ${totalCount}, about ${kb} KB this time${renamedCount > 0 ? `, auto-renamed ${renamedCount}` : ""}).`,
                    imageDeleted: (label, remaining) => `Deleted image${label} (${remaining} remaining).`,
                    imagesCleared: "Images cleared.",
                    missingNewChatHotkey: "Please enter the new chat shortcut.",
                    missingInput: "Enter text or load images first.",
                    startRows: (loopCount, toolHotkeys, newChatHotkey, imageCount) => [
                        { label: "Loop count:", value: `${loopCount}` },
                        { label: "Tool shortcuts:", value: toolHotkeys.length ? toolHotkeys.join(", ") : "(none)" },
                        { label: "New chat shortcut:", value: newChatHotkey },
                        { label: "Images:", value: `${imageCount}` }
                    ],
                    start: (loopCount, toolHotkeys, newChatHotkey, imageCount) => [
                        `Loop count: ${loopCount}`,
                        `Tool shortcuts: ${toolHotkeys.length ? toolHotkeys.join(", ") : "(none)"}`,
                        `New chat shortcut: ${newChatHotkey}`,
                        `Images: ${imageCount}`
                    ].join("\n"),
                    startSummary: "Run configuration",
                    loopMarker: (i, loopCount) => `-- Loop ${i}/${loopCount} --`,
                    composerNotFound: "Input box not found. Click the input box once, then run again.",
                    textInserted: (ok) => (ok ? "Text inserted." : "Failed to insert text."),
                    textRetrying: (stage, attempt = 1, maxAttempts = 1) => `Text verification failed${stage ? ` (${stage})` : ""}; retrying automatically ${attempt}/${maxAttempts}.`,
                    textNotReady: (stage) => `Text was not actually written to the input${stage ? ` (${stage})` : ""}; stopped to avoid sending empty content.`,
                    hotkeyTriggered: (hotkey, ok) => (ok ? `Triggered shortcut: ${hotkey}` : `Failed to trigger shortcut: ${hotkey}`),
                    waitingUploads: (count) => `Waiting for image uploads... (${count})`,
                    resettingImages: (currentCount, expectedCount, attempt = 1, maxAttempts = 1) => `Image readiness timed out: detected ${currentCount}/${expectedCount}; clearing attachments and re-uploading the group (${attempt}/${maxAttempts}).`,
                    reuploadedImages: (count, expectedCount = count) => `Cleared current attachments and re-uploaded images: ${count} (target ${expectedCount}).`,
                    clearAttachmentsFailed: "Failed to clear current image attachments; cancelled this send.",
                    repairingImages: (missingCount, currentCount, expectedCount, attempt, maxAttempts) => `Detected missing images: current ${currentCount}/${expectedCount}; repairing ${missingCount} missing image(s) (${attempt}/${maxAttempts}).`,
                    repairedImages: (count, expectedCount) => `Repaired images: ${count} (target ${expectedCount}).`,
                    uploadNotReady: "Images are not uploaded yet; cancelled send to avoid sending text first.",
                    sendAttempted: (ok) => (ok ? "Send attempted (Enter/Send)." : "Send failed."),
                    maxDelayTitle: (formattedDelay) => `Maximum ${formattedDelay}`,
                    diagnostics: (json) => `Diagnostics: ${json}`,
                    savedHotkeyMissing: (hotkey) => `Saved: ${hotkey} (not found)`,
                    imageCountNotReady: (current, expected) => `Image count is below the expected number: current ${current}, expected at least ${expected}.`,
                    imageUploadTimeout: (current) => `Timed out waiting for image uploads: currently detected ${current} image(s).`,
                    textVerifyFailed: (stage, actualLength, expectedLength) => `Text verification failed${stage ? ` (${stage})` : ""}: detected ${actualLength}/${expectedLength} characters.`,
                    imageReuploadFailed: "Image re-upload failed; cancelled send to avoid sending text first.",
                    imageInsertFailed: "Image insertion failed; this loop will stop.",
                    imagesInserted: (count) => `Inserted images successfully: ${count}.`,
                    imageReady: "Images are ready.",
                    loopDelayBeforeNewChat: (ms, formattedDelay = formatDelayWithUnit(ms, inferDelayUnitFromMs(ms), { ms: "ms", s: "s", m: "min" })) => `Waiting between loops: ${formattedDelay} (after send -> before new chat).`,
                    newChatTriggered: (hotkey, ok) => (ok ? `Loop triggered: ${hotkey} new chat.` : `Failed to create new chat for loop: ${hotkey}.`),
                    newChatRetrying: (hotkey, attempt, maxRetries) => `New chat verification failed; retrying ${attempt}/${maxRetries} (${hotkey}).`,
                    newChatNotReady: "New chat is still not ready after retries; stopped to avoid continuing in the old context.",
                    replayNewChatTriggered: (hotkey, ok) => (ok ? "" : `Failed to create new chat before retry: ${hotkey}.`),
                    replayNewChatRetrying: (hotkey, attempt, maxRetries) => `New chat verification before retry failed; retrying ${attempt}/${maxRetries} (${hotkey}).`,
                    replayNewChatNotReady: "New chat before retry is still not ready after retries; cancelled this retry.",
                    inputUrlRecovering: (stage, hotkey) => `URL verification before input failed${stage ? ` (${stage})` : ""}; triggering ${hotkey} to create a new chat.`,
                    inputUrlNotReady: (stage) => `URL verification before input failed${stage ? ` (${stage})` : ""}; recovery failed, so later loops were stopped.`,
                    paused: "Paused.",
                    resumed: "Resumed.",
                    stopped: "Stopped.",
                    failed: "Failed.",
                    finished: "Finished.",
                    stopRequested: "Stop requested; stopping as soon as possible...",
                    exportSuccess: "Quick Input exported to clipboard.",
                    exportFailed: "Export failed. Check clipboard permission and try again.",
                    importSuccess: "Quick Input imported from clipboard.",
                    importClipboardReadFailed: "Import failed. Unable to read clipboard; check browser permission.",
                    importJsonParseFailed: "Import failed. Clipboard content is not valid JSON.",
                    importInvalidPayload: "Import failed. No valid Quick Input data was found in clipboard.",
                    importImageRestoreFailed: "Import failed. Image data could not be restored, so current content was left unchanged.",
                    missingAttachAdapter: "Image sending is not configured. Implement image insertion in quickInput.adapter.attachImages."
                })
            })
        });

        const DEFAULT_CONFIG = Object.freeze({
            toolHotkeys: Object.freeze(["CTRL+I"]),
            toolHotkey: "CTRL+I",
            newChatHotkey: "CTRL+N",
            loopCount: 1,
            stepDelayMs: 1000,
            loopDelayMs: 20000,
            imageRecovery: Object.freeze({
                maxRepairAttempts: 4,
                maxResetAttempts: 3
            }),
            clearBeforeRun: true,
            panelPos: null
        });

        function normalizeToolHotkeys(value) {
            if (Array.isArray(value)) {
                return value.map(v => String(v ?? "").trim()).filter(Boolean);
            }
            if (typeof value === "string") {
                const trimmed = value.trim();
                return trimmed ? [trimmed] : [];
            }
            return [];
        }

        function normalizeImageRecovery(value, fallback = null) {
            const raw = value && typeof value === "object" && !Array.isArray(value) ? value : {};
            const base = fallback && typeof fallback === "object" && !Array.isArray(fallback)
                ? fallback
                : DEFAULT_CONFIG.imageRecovery;
            return Object.freeze({
                maxRepairAttempts: clampInt(raw.maxRepairAttempts, {
                    min: 0,
                    max: 10,
                    fallback: clampInt(base?.maxRepairAttempts, { min: 0, max: 10, fallback: 4 })
                }),
                maxResetAttempts: clampInt(raw.maxResetAttempts, {
                    min: 0,
                    max: 10,
                    fallback: clampInt(base?.maxResetAttempts, { min: 0, max: 10, fallback: 3 })
                })
            });
        }

        function loadConfig(storageKey, defaults) {
            const stored = safeStoreGet(storageKey, null);
            const raw = stored && typeof stored === "object" ? stored : {};
            const base = defaults && typeof defaults === "object" ? defaults : DEFAULT_CONFIG;

            const hasToolHotkeys = Object.prototype.hasOwnProperty.call(raw, "toolHotkeys");
            const hasToolHotkey = Object.prototype.hasOwnProperty.call(raw, "toolHotkey");
            const toolHotkeys = (hasToolHotkeys || hasToolHotkey)
                ? normalizeToolHotkeys(hasToolHotkeys ? raw.toolHotkeys : raw.toolHotkey)
                : normalizeToolHotkeys(base.toolHotkeys);

            const panelPos = (() => {
                const pos = raw.panelPos;
                if (!pos || typeof pos !== "object" || Array.isArray(pos)) return null;
                const left = Number(pos.left);
                const top = Number(pos.top);
                if (!Number.isFinite(left) || !Number.isFinite(top)) return null;
                return { left, top };
            })();

            const stepDelayMs = clampInt(raw.stepDelayMs, { min: 0, max: STEP_DELAY_MAX_MS, fallback: clampInt(base.stepDelayMs, { min: 0, max: STEP_DELAY_MAX_MS, fallback: 1000 }) });
            const loopDelayMs = clampInt(raw.loopDelayMs, { min: 0, max: LOOP_DELAY_MAX_MS, fallback: clampInt(base.loopDelayMs, { min: 0, max: LOOP_DELAY_MAX_MS, fallback: 20000 }) });

            return {
                toolHotkeys,
                toolHotkey: toolHotkeys[0] || "",
                newChatHotkey: typeof raw.newChatHotkey === "string" ? raw.newChatHotkey : base.newChatHotkey,
                loopCount: clampInt(raw.loopCount, { min: 1, max: 999, fallback: clampInt(base.loopCount, { min: 1, max: 999, fallback: 1 }) }),
                stepDelayMs,
                stepDelayUnit: normalizeDelayUnit(raw.stepDelayUnit)
                    || normalizeDelayUnit(base.stepDelayUnit)
                    || inferDelayUnitFromMs(stepDelayMs),
                loopDelayMs,
                loopDelayUnit: normalizeDelayUnit(raw.loopDelayUnit)
                    || normalizeDelayUnit(base.loopDelayUnit)
                    || inferDelayUnitFromMs(loopDelayMs),
                clearBeforeRun: raw.clearBeforeRun !== false,
                panelPos
            };
        }

        function saveConfig(storageKey, cfg, defaults) {
            const safe = cfg && typeof cfg === "object" ? cfg : {};
            const base = defaults && typeof defaults === "object" ? defaults : DEFAULT_CONFIG;
            const stored = safeStoreGet(storageKey, null);
            const prev = stored && typeof stored === "object" ? stored : {};

            const readToolHotkeys = (value) => {
                if (!value || typeof value !== "object") return null;
                if (Object.prototype.hasOwnProperty.call(value, "toolHotkeys")) return normalizeToolHotkeys(value.toolHotkeys);
                if (Object.prototype.hasOwnProperty.call(value, "toolHotkey")) return normalizeToolHotkeys(value.toolHotkey);
                return null;
            };

            const toolHotkeys = readToolHotkeys(safe) ?? readToolHotkeys(prev) ?? normalizeToolHotkeys(base.toolHotkeys);
            const toolHotkey = toolHotkeys[0] || "";
            const newChatHotkey = (typeof safe.newChatHotkey === "string")
                ? safe.newChatHotkey
                : (typeof prev.newChatHotkey === "string" ? prev.newChatHotkey : base.newChatHotkey);

            const panelPos = (() => {
                const src = (safe.panelPos && typeof safe.panelPos === "object" && !Array.isArray(safe.panelPos))
                    ? safe.panelPos
                    : prev.panelPos;
                if (!src || typeof src !== "object" || Array.isArray(src)) return null;
                const left = Number(src.left);
                const top = Number(src.top);
                if (!Number.isFinite(left) || !Number.isFinite(top)) return null;
                return { left, top };
            })();

            const stepDelayMs = clampInt(safe.stepDelayMs, { min: 0, max: STEP_DELAY_MAX_MS, fallback: clampInt(base.stepDelayMs, { min: 0, max: STEP_DELAY_MAX_MS, fallback: 1000 }) });
            const loopDelayMs = clampInt(safe.loopDelayMs, { min: 0, max: LOOP_DELAY_MAX_MS, fallback: clampInt(base.loopDelayMs, { min: 0, max: LOOP_DELAY_MAX_MS, fallback: 20000 }) });

            const payload = {
                toolHotkeys,
                toolHotkey,
                newChatHotkey,
                loopCount: clampInt(safe.loopCount, { min: 1, max: 999, fallback: clampInt(base.loopCount, { min: 1, max: 999, fallback: 1 }) }),
                stepDelayMs,
                stepDelayUnit: normalizeDelayUnit(safe.stepDelayUnit)
                    || normalizeDelayUnit(prev.stepDelayUnit)
                    || normalizeDelayUnit(base.stepDelayUnit)
                    || inferDelayUnitFromMs(stepDelayMs),
                loopDelayMs,
                loopDelayUnit: normalizeDelayUnit(safe.loopDelayUnit)
                    || normalizeDelayUnit(prev.loopDelayUnit)
                    || normalizeDelayUnit(base.loopDelayUnit)
                    || inferDelayUnitFromMs(loopDelayMs),
                clearBeforeRun: safe.clearBeforeRun !== false
            };
            if (panelPos) payload.panelPos = panelPos;
            safeStoreSet(storageKey, payload);
        }

        async function executeEngineShortcutByHotkey(engine, hotkey) {
            const api = engine || null;
            const core = api?.core || null;
            const normalize = core?.hotkeys?.normalize || core?.normalizeHotkey || null;
            const normalizeOne = (value) => {
                const raw = normalizeHotkeyString(value);
                return typeof normalize === "function" ? normalize(raw) : normalizeHotkeyFallback(raw);
            };
            const norm = normalizeOne(hotkey);
            if (!norm) return false;

            let shortcut = core?.getShortcutByHotkeyNorm?.(norm) || null;
            if (!shortcut && typeof api?.getShortcuts === "function") {
                const list = api.getShortcuts();
                if (Array.isArray(list)) {
                    shortcut = list.find(item => item && normalizeOne(item.hotkey) === norm) || null;
                }
            }
            if (!shortcut) return false;

            try {
                const res = core?.executeShortcutAction?.(shortcut, null);
                if (res && typeof res.then === "function") {
                    try {
                        const awaited = await res;
                        if (awaited === false) return false;
                    } catch {
                        return false;
                    }
                } else if (res === false) {
                    return false;
                }
            } catch {
                return false;
            }
            return true;
        }

        async function sleepWithCancel(totalMs, { shouldCancel = null, chunkMs = 160, runtime = null } = {}) {
            const cancelFn = typeof shouldCancel === "function" ? shouldCancel : null;
            const runtimeApi = runtime && typeof runtime === "object" ? runtime : null;
            const now = typeof runtimeApi?.now === "function"
                ? () => runtimeApi.now()
                : () => Date.now();
            const waitIfPaused = typeof runtimeApi?.waitIfPaused === "function"
                ? runtimeApi.waitIfPaused.bind(runtimeApi)
                : null;
            let remain = Math.max(0, Number(totalMs) || 0);
            const chunk = Math.max(20, Number(chunkMs) || 160);

            while (remain > 0) {
                if (cancelFn && cancelFn()) return false;
                if (waitIfPaused) {
                    const pauseOk = await waitIfPaused();
                    if (pauseOk === false) return false;
                }
                const waitMs = Math.min(remain, chunk);
                const startedAt = now();
                await sleep(waitMs);
                const elapsed = Math.max(0, now() - startedAt);
                remain -= elapsed;
            }

            if (waitIfPaused) {
                const pauseOk = await waitIfPaused();
                if (pauseOk === false) return false;
            }
            return !(cancelFn && cancelFn());
        }

        async function waitForObservedState({
            resolveRoots = null,
            computeState = null,
            isSatisfied = null,
            timeoutMs = 4000,
            settleMs = 0,
            pollFallbackMs = 1000,
            attributeFilter = null,
            shouldCancel = null,
            runtime = null
        } = {}) {
            if (typeof computeState !== "function") {
                return { ok: false, cancelled: false, state: null };
            }

            const cancelFn = typeof shouldCancel === "function" ? shouldCancel : null;
            const runtimeApi = runtime && typeof runtime === "object" ? runtime : null;
            const now = typeof runtimeApi?.now === "function"
                ? () => runtimeApi.now()
                : () => Date.now();
            const settle = Math.max(0, Number(settleMs) || 0);
            const pollMs = Math.max(80, Number(pollFallbackMs) || 1000);
            const deadline = now() + Math.max(0, Number(timeoutMs) || 0);
            const evaluate = typeof isSatisfied === "function" ? isSatisfied : (state) => !!state;
            const MutationObserverCtor = globalThis.MutationObserver;

            let observer = null;
            let stableSince = 0;
            let latestState = null;
            let pendingMutation = false;
            let wakeResolver = null;

            function flushWake(reason = "mutation") {
                pendingMutation = true;
                if (typeof wakeResolver === "function") {
                    const resolve = wakeResolver;
                    wakeResolver = null;
                    try { resolve(reason); } catch {}
                }
            }

            function normalizeRoots(rawRoots) {
                const list = Array.isArray(rawRoots) ? rawRoots : [rawRoots];
                const out = [];
                const seen = new Set();

                for (const raw of list) {
                    let root = raw || null;
                    if (!root && raw !== 0) continue;
                    if (root === globalThis || root === globalThis.window) {
                        root = globalThis.document?.documentElement || globalThis.document || null;
                    }
                    if (!root || seen.has(root)) continue;
                    const nodeType = Number(root?.nodeType) || 0;
                    if (nodeType === 1 || nodeType === 9 || nodeType === 11) {
                        seen.add(root);
                        out.push(root);
                    }
                }
                return out;
            }

            function refreshObserver() {
                if (!MutationObserverCtor) return;
                if (observer) {
                    try { observer.disconnect(); } catch {}
                    observer = null;
                }

                const roots = normalizeRoots(typeof resolveRoots === "function" ? resolveRoots() : []);
                if (roots.length === 0) return;

                observer = new MutationObserverCtor(() => {
                    flushWake("mutation");
                });

                const observeOptions = {
                    subtree: true,
                    childList: true,
                    characterData: true,
                    attributes: true
                };
                if (Array.isArray(attributeFilter) && attributeFilter.length > 0) {
                    observeOptions.attributeFilter = attributeFilter;
                }

                for (const root of roots) {
                    try {
                        observer.observe(root, observeOptions);
                    } catch { }
                }
            }

            async function waitForNextSignal(waitMs) {
                if (pendingMutation) {
                    pendingMutation = false;
                    return "mutation";
                }

                let settled = false;
                const signalPromise = new Promise(resolve => {
                    wakeResolver = (reason = "mutation") => {
                        if (settled) return;
                        settled = true;
                        wakeResolver = null;
                        resolve(reason);
                    };
                });
                const sleepPromise = (async () => {
                    const ok = await sleepWithCancel(waitMs, {
                        shouldCancel: cancelFn,
                        runtime: runtimeApi,
                        chunkMs: Math.min(160, Math.max(20, waitMs))
                    });
                    if (settled) return "ignored";
                    settled = true;
                    wakeResolver = null;
                    return ok ? "timeout" : "cancelled";
                })();

                return await Promise.race([signalPromise, sleepPromise]);
            }

            try {
                while (true) {
                    if (cancelFn && cancelFn()) {
                        return { ok: false, cancelled: true, state: latestState };
                    }

                    refreshObserver();

                    try {
                        latestState = computeState();
                    } catch {
                        latestState = null;
                    }

                    let satisfied = false;
                    try {
                        satisfied = !!evaluate(latestState);
                    } catch {
                        satisfied = false;
                    }

                    const nowMs = now();
                    if (satisfied) {
                        if (!stableSince) stableSince = nowMs;
                        if (nowMs - stableSince >= settle) {
                            return { ok: true, cancelled: false, state: latestState };
                        }
                    } else {
                        stableSince = 0;
                    }

                    const remainingMs = Math.max(0, deadline - nowMs);
                    if (remainingMs <= 0) {
                        return { ok: false, cancelled: false, state: latestState };
                    }

                    let nextWaitMs = Math.min(remainingMs, pollMs);
                    if (satisfied && settle > 0 && stableSince > 0) {
                        nextWaitMs = Math.min(nextWaitMs, Math.max(20, settle - (nowMs - stableSince)));
                    }

                    const signal = await waitForNextSignal(nextWaitMs);
                    if (signal === "cancelled") {
                        return { ok: false, cancelled: true, state: latestState };
                    }
                }
            } finally {
                if (observer) {
                    try { observer.disconnect(); } catch {}
                    observer = null;
                }
                wakeResolver = null;
            }
        }

export {
    STEP_DELAY_MAX_MS,
    LOOP_DELAY_MAX_MS,
    DELAY_UNIT_FACTORS,
    DELAY_UNIT_LABELS,
    QUICK_INPUT_SVG_NS,
    DEFAULT_LABELS,
    DEFAULT_LABEL_MESSAGES,
    DEFAULT_CONFIG,
    normalizeImageRecovery,
    normalizeDelayUnit,
    inferDelayUnitFromMs,
    getDelayUnitFactor,
    formatDelayNumber,
    convertDelayMsToDisplayValue,
    convertDelayInputToMs,
    clampDelayMs,
    formatDelayInputValue,
    formatDelayWithUnit,
    loadConfig,
    saveConfig,
    executeEngineShortcutByHotkey,
    sleepWithCancel,
    waitForObservedState
};
