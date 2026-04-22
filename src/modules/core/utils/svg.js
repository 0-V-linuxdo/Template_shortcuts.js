/* -------------------------------------------------------------------------- *
 * Core Utils · SVG builders
 * -------------------------------------------------------------------------- */

/* ------------------------------ SVG --------------------------------- */

        const SVG_NAMESPACE = "http://www.w3.org/2000/svg"
        const SVG_DEFAULT_ICON_FILL_COLOR = "#000000"
        const SVG_DEFAULT_THEME_LIGHT_FILL_COLOR = "#111827"
        const SVG_DEFAULT_THEME_DARK_FILL_COLOR = "#F8FAFC"
        const SVG_THEME_FILL_CLASS_NAME = "st-theme-fill"
        const SVG_SAFE_COLOR_TOKEN_RE = /^(?:#[0-9a-fA-F]{3,8}|(?:rgb|hsl)a?\(\s*[-\d.%\s,]+\s*\)|[a-zA-Z]+)$/
        const SVG_ATTR_NAME_RE = /^[A-Za-z_][\w:.-]*$/
        const SVG_BLOCKED_ATTR_NAMES = new Set(["href", "xlink:href", "src", "style"])
        const SVG_ROOT_LOCKED_ATTR_NAMES = new Set(["xmlns", "width", "height", "viewbox"])
        const SVG_TAG_NAME_MAP = Object.freeze({
            path: "path",
            circle: "circle",
            rect: "rect",
            ellipse: "ellipse",
            line: "line",
            polyline: "polyline",
            polygon: "polygon",
            g: "g",
            defs: "defs",
            clippath: "clipPath",
            mask: "mask",
            lineargradient: "linearGradient",
            radialgradient: "radialGradient",
            stop: "stop"
        })
        const SVG_CONTAINER_TAG_KEYS = new Set(["g", "defs", "clippath", "mask", "lineargradient", "radialgradient"])
        const SVG_GLOBAL_ALLOWED_ATTR_NAMES = new Set([
            "id", "class", "transform", "opacity", "display",
            "fill", "fill-opacity", "fill-rule",
            "stroke", "stroke-opacity", "stroke-width", "stroke-linecap", "stroke-linejoin", "stroke-miterlimit",
            "stroke-dasharray", "stroke-dashoffset",
            "clip-path", "clip-rule",
            "mask",
            "vector-effect", "shape-rendering", "paint-order"
        ])
        const SVG_ALLOWED_ATTR_NAMES_BY_TAG = Object.freeze({
            svg: new Set([
                ...SVG_GLOBAL_ALLOWED_ATTR_NAMES,
                "xmlns", "viewbox", "width", "height", "preserveaspectratio",
                "role", "focusable", "aria-hidden", "aria-label"
            ]),
            path: new Set([...SVG_GLOBAL_ALLOWED_ATTR_NAMES, "d", "pathlength"]),
            circle: new Set([...SVG_GLOBAL_ALLOWED_ATTR_NAMES, "cx", "cy", "r", "pathlength"]),
            rect: new Set([...SVG_GLOBAL_ALLOWED_ATTR_NAMES, "x", "y", "width", "height", "rx", "ry", "pathlength"]),
            ellipse: new Set([...SVG_GLOBAL_ALLOWED_ATTR_NAMES, "cx", "cy", "rx", "ry", "pathlength"]),
            line: new Set([...SVG_GLOBAL_ALLOWED_ATTR_NAMES, "x1", "y1", "x2", "y2", "pathlength"]),
            polyline: new Set([...SVG_GLOBAL_ALLOWED_ATTR_NAMES, "points", "pathlength"]),
            polygon: new Set([...SVG_GLOBAL_ALLOWED_ATTR_NAMES, "points", "pathlength"]),
            g: new Set([...SVG_GLOBAL_ALLOWED_ATTR_NAMES]),
            defs: new Set(["id"]),
            clippath: new Set([...SVG_GLOBAL_ALLOWED_ATTR_NAMES, "clippathunits"]),
            mask: new Set([
                ...SVG_GLOBAL_ALLOWED_ATTR_NAMES,
                "maskunits", "maskcontentunits", "x", "y", "width", "height"
            ]),
            lineargradient: new Set([
                ...SVG_GLOBAL_ALLOWED_ATTR_NAMES,
                "x1", "y1", "x2", "y2",
                "gradientunits", "gradienttransform", "spreadmethod"
            ]),
            radialgradient: new Set([
                ...SVG_GLOBAL_ALLOWED_ATTR_NAMES,
                "cx", "cy", "r", "fx", "fy", "fr",
                "gradientunits", "gradienttransform", "spreadmethod"
            ]),
            stop: new Set([...SVG_GLOBAL_ALLOWED_ATTR_NAMES, "offset", "stop-color", "stop-opacity"])
        })
        const SVG_REQUIRED_ATTR_RULES_BY_TAG = Object.freeze({
            path: Object.freeze({
                relaxed: Object.freeze({ allOf: ["d"] }),
                strict: Object.freeze({ allOf: ["d"] })
            }),
            circle: Object.freeze({
                relaxed: Object.freeze({ allOf: ["r"] }),
                strict: Object.freeze({ allOf: ["cx", "cy", "r"] })
            }),
            rect: Object.freeze({
                relaxed: Object.freeze({ allOf: ["width", "height"] }),
                strict: Object.freeze({ allOf: ["width", "height"] })
            }),
            ellipse: Object.freeze({
                relaxed: Object.freeze({ allOf: ["rx", "ry"] }),
                strict: Object.freeze({ allOf: ["rx", "ry"] })
            }),
            line: Object.freeze({
                relaxed: Object.freeze({ allOf: ["x1", "y1", "x2", "y2"] }),
                strict: Object.freeze({ allOf: ["x1", "y1", "x2", "y2"] })
            }),
            polyline: Object.freeze({
                relaxed: Object.freeze({ allOf: ["points"] }),
                strict: Object.freeze({ allOf: ["points"] })
            }),
            polygon: Object.freeze({
                relaxed: Object.freeze({ allOf: ["points"] }),
                strict: Object.freeze({ allOf: ["points"] })
            }),
            stop: Object.freeze({
                relaxed: Object.freeze({ allOf: ["offset"] }),
                strict: Object.freeze({ allOf: ["offset", "stop-color"] })
            })
        })
        const SVG_VALUE_URL_ATTR_NAMES = new Set(["fill", "stroke", "clip-path", "mask"])
        const SVG_DEFAULT_VALIDATION_OPTIONS = Object.freeze({
            strictRequiredAttrs: false,
            allowExternalUrlRefs: false
        })
        const SVG_ISSUE_CACHE_MAX_SIZE = 500
        const SVG_ISSUE_CACHE = new Set()

        function getSvgTagKey(tagName) {
            return String(tagName || "").trim().toLowerCase()
        }

        function getCanonicalSvgTagName(tagName) {
            const key = getSvgTagKey(tagName)
            return SVG_TAG_NAME_MAP[key] || ""
        }

        function escapeSvgAttrValue(value) {
            return String(value)
                .replace(/&/g, "&amp;")
                .replace(/"/g, "&quot;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/'/g, "&#39;")
        }

        function normalizeSvgCssColorToken(raw, fallback = SVG_DEFAULT_ICON_FILL_COLOR) {
            const value = String(raw || "").trim()
            if (!value) return fallback
            if (!SVG_SAFE_COLOR_TOKEN_RE.test(value)) return fallback
            return value
        }

        function mergeSvgClassNames(baseClassName, appendClassName) {
            const tokens = `${String(baseClassName || "")} ${String(appendClassName || "")}`
                .split(/\s+/)
                .map((part) => String(part || "").trim())
                .filter(Boolean)
            if (tokens.length === 0) return ""
            return Array.from(new Set(tokens)).join(" ")
        }

        function buildSvgThemeFillStyles(lightFillColor, darkFillColor) {
            const light = normalizeSvgCssColorToken(lightFillColor, SVG_DEFAULT_THEME_LIGHT_FILL_COLOR)
            const dark = normalizeSvgCssColorToken(darkFillColor, SVG_DEFAULT_THEME_DARK_FILL_COLOR)
            const selector = `.${SVG_THEME_FILL_CLASS_NAME}`
            return `${selector}{fill:${light};}@media (prefers-color-scheme: dark){${selector}{fill:${dark};}}`
        }

        function isSvgAttrAllowed(name, { tag = "", blockRootLocked = false } = {}) {
            const key = String(name || "").trim().toLowerCase()
            if (!key) return false
            if (/^on/.test(key)) return false
            if (SVG_BLOCKED_ATTR_NAMES.has(key)) return false
            if (blockRootLocked && SVG_ROOT_LOCKED_ATTR_NAMES.has(key)) return false
            const tagKey = getSvgTagKey(tag)
            if (!tagKey) return false
            const allowedAttrNames = SVG_ALLOWED_ATTR_NAMES_BY_TAG[tagKey]
            if (!allowedAttrNames) return false
            return allowedAttrNames.has(key)
        }

        function hasSvgAttrValue(attrs, name) {
            const value = attrs && typeof attrs === "object" ? attrs[name] : ""
            return String(value || "").trim().length > 0
        }

        function normalizeSvgValidationOptions(raw) {
            const options = raw && typeof raw === "object" ? raw : {}
            return {
                strictRequiredAttrs: options.strictRequiredAttrs === true,
                allowExternalUrlRefs: options.allowExternalUrlRefs === true
            }
        }

        function resolveSvgRequiredRule(tagKey, validationOptions = SVG_DEFAULT_VALIDATION_OPTIONS) {
            const rule = SVG_REQUIRED_ATTR_RULES_BY_TAG[tagKey]
            if (!rule || typeof rule !== "object") return null
            const strictRequiredAttrs = validationOptions?.strictRequiredAttrs === true
            const scopedRule = strictRequiredAttrs ? (rule.strict || rule.relaxed || rule) : (rule.relaxed || rule)
            return scopedRule && typeof scopedRule === "object" ? scopedRule : null
        }

        function validateRequiredSvgAttrs(tagKey, attrs, validationOptions = SVG_DEFAULT_VALIDATION_OPTIONS) {
            const rule = resolveSvgRequiredRule(tagKey, validationOptions)
            if (!rule) {
                return { ok: true }
            }
            const allOf = Array.isArray(rule.allOf) ? rule.allOf : []
            const anyOf = Array.isArray(rule.anyOf) ? rule.anyOf : []
            const missingAllOf = allOf.filter((name) => !hasSvgAttrValue(attrs, name))
            if (missingAllOf.length > 0) {
                return { ok: false, mode: "allOf", attrs: missingAllOf }
            }
            if (anyOf.length > 0 && !anyOf.some((name) => hasSvgAttrValue(attrs, name))) {
                return { ok: false, mode: "anyOf", attrs: anyOf.slice() }
            }
            return { ok: true }
        }

        function reportSvgIssue(onIssue, issue) {
            if (typeof onIssue !== "function") return
            if (!issue || typeof issue !== "object") return
            try {
                onIssue(issue)
            } catch {}
        }

        function markSvgIssueKeySeen(key) {
            const issueKey = String(key || "")
            if (!issueKey) return false
            if (SVG_ISSUE_CACHE.has(issueKey)) return false

            SVG_ISSUE_CACHE.add(issueKey)
            if (SVG_ISSUE_CACHE.size > SVG_ISSUE_CACHE_MAX_SIZE) {
                let overflow = SVG_ISSUE_CACHE.size - SVG_ISSUE_CACHE_MAX_SIZE
                for (const oldKey of SVG_ISSUE_CACHE) {
                    SVG_ISSUE_CACHE.delete(oldKey)
                    overflow -= 1
                    if (overflow <= 0) break
                }
            }
            return true
        }

        function warnSvgIssueOnce(issue) {
            if (!issue || typeof issue !== "object") return
            const key = [
                String(issue.code || ""),
                String(issue.path || ""),
                String(issue.tag || ""),
                String(issue.mode || ""),
                Array.isArray(issue.attrs) ? issue.attrs.join(",") : ""
            ].join("|")
            if (!markSvgIssueKeySeen(key)) return
            const message = String(issue.message || issue.code || "Unknown SVG issue")
            console.warn(`[SVG] ${message}`, issue)
        }

        function isSafeSvgLocalUrlReference(rawRef) {
            const value = String(rawRef || "").trim().replace(/^['"]|['"]$/g, "")
            if (!value.startsWith("#")) return false
            return /^#[A-Za-z_][\w:.-]*$/.test(value)
        }

        function isSvgAttrValueSafe(name, value, validationOptions = SVG_DEFAULT_VALIDATION_OPTIONS) {
            const key = String(name || "").trim().toLowerCase()
            const text = String(value ?? "").trim()
            if (!text) return true
            if (/(?:javascript|vbscript)\s*:/i.test(text)) return false
            if (!validationOptions.allowExternalUrlRefs && /\bdata\s*:/i.test(text)) return false

            if (!SVG_VALUE_URL_ATTR_NAMES.has(key) || !/url\s*\(/i.test(text)) return true
            if (validationOptions.allowExternalUrlRefs) return true

            const matches = Array.from(text.matchAll(/url\s*\(([^)]*)\)/ig))
            if (matches.length === 0) return true
            return matches.every((match) => isSafeSvgLocalUrlReference(match[1]))
        }

        function normalizeSvgAttrs(raw, {
            tag = "",
            blockRootLocked = false,
            validationOptions = SVG_DEFAULT_VALIDATION_OPTIONS,
            onIssue = null,
            path = ""
        } = {}) {
            if (!raw) return {}
            if (typeof raw !== "object" || Array.isArray(raw)) return {}
            const attrs = {}
            for (const [nameRaw, valueRaw] of Object.entries(raw)) {
                const name = String(nameRaw || "").trim()
                if (!name || !SVG_ATTR_NAME_RE.test(name)) continue
                if (!isSvgAttrAllowed(name, { tag, blockRootLocked })) continue
                if (valueRaw === null || valueRaw === undefined) continue
                const value = String(valueRaw)
                if (!isSvgAttrValueSafe(name, value, validationOptions)) {
                    reportSvgIssue(onIssue, {
                        code: "unsafeAttrValue",
                        message: `Unsafe SVG attribute value dropped: ${name}.`,
                        path,
                        tag,
                        attr: name
                    })
                    continue
                }
                attrs[name] = value
            }
            return attrs
        }

        function buildSvgAttrsMarkup(attrMap, { tag = "", blockRootLocked = false } = {}) {
            const attrs = attrMap && typeof attrMap === "object" ? attrMap : {}
            return Object.entries(attrs)
                .map(([nameRaw, valueRaw]) => {
                    const name = String(nameRaw || "").trim()
                    if (!name || !SVG_ATTR_NAME_RE.test(name)) return ""
                    if (!isSvgAttrAllowed(name, { tag, blockRootLocked })) return ""
                    if (valueRaw === null || valueRaw === undefined) return ""
                    const value = escapeSvgAttrValue(valueRaw)
                    return `${name}="${value}"`
                })
                .filter(Boolean)
                .join(" ")
        }

        function buildSvgElementMarkup(item, depth = 0, {
            onIssue = warnSvgIssueOnce,
            path = "root",
            validationOptions = SVG_DEFAULT_VALIDATION_OPTIONS
        } = {}) {
            if (!item || typeof item !== "object") {
                reportSvgIssue(onIssue, {
                    code: "invalidElement",
                    message: "Element must be an object.",
                    path
                })
                return ""
            }
            if (depth > 12) {
                reportSvgIssue(onIssue, {
                    code: "maxDepthExceeded",
                    message: "SVG element nesting exceeds max depth (12).",
                    path
                })
                return ""
            }

            const tagKey = getSvgTagKey(item.tag)
            const tagName = getCanonicalSvgTagName(tagKey)
            if (!tagName) {
                reportSvgIssue(onIssue, {
                    code: "unsupportedTag",
                    message: `Unsupported SVG tag: ${String(item.tag || "") || "(empty)"}`,
                    path,
                    tag: String(item.tag || "")
                })
                return ""
            }

            const attrs = normalizeSvgAttrs(item.attrs, {
                tag: tagKey,
                validationOptions,
                onIssue,
                path: `${path}.attrs`
            })
            const requiredCheck = validateRequiredSvgAttrs(tagKey, attrs, validationOptions)
            if (!requiredCheck.ok) {
                reportSvgIssue(onIssue, {
                    code: "missingRequiredAttrs",
                    message: `Missing required attributes for <${tagName}>.`,
                    path,
                    tag: tagName,
                    mode: requiredCheck.mode,
                    attrs: requiredCheck.attrs
                })
                return ""
            }
            if (tagKey === "path") {
                attrs.d = String(attrs.d || "").trim()
            }

            const childItems = Array.isArray(item.children) ? item.children : []
            const childrenMarkup = childItems
                .map((child, index) => buildSvgElementMarkup(child, depth + 1, {
                    onIssue,
                    path: `${path}.${index}`,
                    validationOptions
                }))
                .join("")

            const attrsMarkup = buildSvgAttrsMarkup(attrs, { tag: tagKey })
            if (childrenMarkup) {
                if (!SVG_CONTAINER_TAG_KEYS.has(tagKey)) {
                    reportSvgIssue(onIssue, {
                        code: "childrenNotAllowed",
                        message: `Tag <${tagName}> does not allow children in this builder.`,
                        path,
                        tag: tagName
                    })
                    return ""
                }
                return attrsMarkup
                    ? `<${tagName} ${attrsMarkup}>${childrenMarkup}</${tagName}>`
                    : `<${tagName}>${childrenMarkup}</${tagName}>`
            }
            if (SVG_CONTAINER_TAG_KEYS.has(tagKey)) {
                reportSvgIssue(onIssue, {
                    code: "emptyContainer",
                    message: `Container tag <${tagName}> has no valid children.`,
                    path,
                    tag: tagName
                })
                return ""
            }
            if (!attrsMarkup) {
                reportSvgIssue(onIssue, {
                    code: "emptyAttrs",
                    message: `No valid attributes remained for <${tagName}>.`,
                    path,
                    tag: tagName
                })
                return ""
            }
            return `<${tagName} ${attrsMarkup}/>`
        }

        function buildSvgElementsIconDataUrl(elements, {
            viewBox = "0 0 24 24",
            width = 24,
            height = 24,
            rootAttrs = {},
            onIssue = warnSvgIssueOnce,
            validation = SVG_DEFAULT_VALIDATION_OPTIONS
        } = {}) {
            const validationOptions = normalizeSvgValidationOptions(validation)
            const elementList = Array.isArray(elements) ? elements : []
            const bodyMarkup = elementList
                .map((item, index) => buildSvgElementMarkup(item, 0, {
                    onIssue,
                    path: `root.${index}`,
                    validationOptions
                }))
                .join("")

            if (!bodyMarkup) {
                reportSvgIssue(onIssue, {
                    code: "emptyBody",
                    message: "SVG body is empty after validation.",
                    path: "root"
                })
                return ""
            }
            const safeRootAttrs = normalizeSvgAttrs(rootAttrs, {
                tag: "svg",
                blockRootLocked: true,
                validationOptions,
                onIssue,
                path: "root.attrs"
            })
            const svgAttrs = {
                ...safeRootAttrs,
                xmlns: SVG_NAMESPACE,
                width,
                height,
                viewBox
            }
            const svgAttrsMarkup = buildSvgAttrsMarkup(svgAttrs, { tag: "svg" })
            if (!svgAttrsMarkup) {
                reportSvgIssue(onIssue, {
                    code: "emptyRootAttrs",
                    message: "SVG root attributes are empty after validation.",
                    path: "root",
                    tag: "svg"
                })
                return ""
            }
            const svg = `<svg ${svgAttrsMarkup}>${bodyMarkup}</svg>`
            return `data:image/svg+xml,${encodeURIComponent(svg)}`
        }

        function buildPathsIconDataUrl(paths, {
            viewBox = "0 0 24 24",
            width = 24,
            height = 24,
            rootAttrs = {},
            fillColor = SVG_DEFAULT_ICON_FILL_COLOR,
            fillPriority = "theme",
            onIssue = warnSvgIssueOnce,
            validation = SVG_DEFAULT_VALIDATION_OPTIONS
        } = {}) {
            const validationOptions = normalizeSvgValidationOptions(validation)
            const pathList = Array.isArray(paths) ? paths : []
            const prefersPathFill = String(fillPriority || "").trim().toLowerCase() === "path"
            const elements = pathList
                .map((path, index) => {
                    if (!path || typeof path !== "object") {
                        reportSvgIssue(onIssue, {
                            code: "invalidPathInput",
                            message: "Path entry must be an object.",
                            path: `paths.${index}`,
                            tag: "path"
                        })
                        return null
                    }
                    const d = String(path.d || "").trim()
                    if (!d) {
                        reportSvgIssue(onIssue, {
                            code: "missingPathD",
                            message: "Path entry is missing non-empty \"d\".",
                            path: `paths.${index}`,
                            tag: "path",
                            attrs: ["d"]
                        })
                        return null
                    }
                    const pathAttrs = normalizeSvgAttrs(path.attrs, {
                        tag: "path",
                        validationOptions,
                        onIssue,
                        path: `paths.${index}.attrs`
                    })
                    const attrs = prefersPathFill
                        ? { ...(fillColor ? { fill: fillColor } : {}), ...pathAttrs, d }
                        : { ...pathAttrs, ...(fillColor ? { fill: fillColor } : {}), d }
                    return { tag: "path", attrs }
                })
                .filter(Boolean)

            return buildSvgElementsIconDataUrl(elements, {
                viewBox,
                width,
                height,
                rootAttrs,
                onIssue,
                validation: validationOptions
            })
        }

        function buildPathIconDataUrl(pathD, options = {}) {
            return buildPathsIconDataUrl([{ d: pathD }], options)
        }

        function buildThemeAdaptivePathsIconDataUrl(paths, {
            viewBox = "0 0 24 24",
            width = 24,
            height = 24,
            rootAttrs = {},
            fillPriority = "theme",
            lightFillColor = SVG_DEFAULT_THEME_LIGHT_FILL_COLOR,
            darkFillColor = SVG_DEFAULT_THEME_DARK_FILL_COLOR,
            onIssue = warnSvgIssueOnce,
            validation = SVG_DEFAULT_VALIDATION_OPTIONS
        } = {}) {
            const validationOptions = normalizeSvgValidationOptions(validation)
            const safeLightFillColor = normalizeSvgCssColorToken(lightFillColor, SVG_DEFAULT_THEME_LIGHT_FILL_COLOR)
            const safeDarkFillColor = normalizeSvgCssColorToken(darkFillColor, SVG_DEFAULT_THEME_DARK_FILL_COLOR)
            if (safeLightFillColor !== String(lightFillColor || "").trim()) {
                reportSvgIssue(onIssue, {
                    code: "invalidThemeLightFill",
                    message: "Invalid light theme fill color; fallback applied.",
                    path: "theme.lightFillColor"
                })
            }
            if (safeDarkFillColor !== String(darkFillColor || "").trim()) {
                reportSvgIssue(onIssue, {
                    code: "invalidThemeDarkFill",
                    message: "Invalid dark theme fill color; fallback applied.",
                    path: "theme.darkFillColor"
                })
            }

            const pathList = Array.isArray(paths) ? paths : []
            const prefersPathFill = String(fillPriority || "").trim().toLowerCase() === "path"
            const elements = pathList
                .map((path, index) => {
                    if (!path || typeof path !== "object") {
                        reportSvgIssue(onIssue, {
                            code: "invalidPathInput",
                            message: "Path entry must be an object.",
                            path: `paths.${index}`,
                            tag: "path"
                        })
                        return null
                    }
                    const d = String(path.d || "").trim()
                    if (!d) {
                        reportSvgIssue(onIssue, {
                            code: "missingPathD",
                            message: "Path entry is missing non-empty \"d\".",
                            path: `paths.${index}`,
                            tag: "path",
                            attrs: ["d"]
                        })
                        return null
                    }

                    const pathAttrs = normalizeSvgAttrs(path.attrs, {
                        tag: "path",
                        validationOptions,
                        onIssue,
                        path: `paths.${index}.attrs`
                    })
                    const keepPathFill = prefersPathFill && hasSvgAttrValue(pathAttrs, "fill")
                    const attrs = { ...pathAttrs, d }
                    if (!keepPathFill) {
                        delete attrs.fill
                        attrs.class = mergeSvgClassNames(attrs.class, SVG_THEME_FILL_CLASS_NAME)
                    }
                    return { tag: "path", attrs }
                })
                .filter(Boolean)

            const bodyMarkup = elements
                .map((item, index) => buildSvgElementMarkup(item, 0, {
                    onIssue,
                    path: `root.${index}`,
                    validationOptions
                }))
                .join("")

            if (!bodyMarkup) {
                reportSvgIssue(onIssue, {
                    code: "emptyBody",
                    message: "SVG body is empty after validation.",
                    path: "root"
                })
                return ""
            }

            const safeRootAttrs = normalizeSvgAttrs(rootAttrs, {
                tag: "svg",
                blockRootLocked: true,
                validationOptions,
                onIssue,
                path: "root.attrs"
            })
            const svgAttrs = {
                ...safeRootAttrs,
                xmlns: SVG_NAMESPACE,
                width,
                height,
                viewBox
            }
            const svgAttrsMarkup = buildSvgAttrsMarkup(svgAttrs, { tag: "svg" })
            if (!svgAttrsMarkup) {
                reportSvgIssue(onIssue, {
                    code: "emptyRootAttrs",
                    message: "SVG root attributes are empty after validation.",
                    path: "root",
                    tag: "svg"
                })
                return ""
            }

            const fillStyles = buildSvgThemeFillStyles(safeLightFillColor, safeDarkFillColor)
            const svg = `<svg ${svgAttrsMarkup}><style>${fillStyles}</style>${bodyMarkup}</svg>`
            return `data:image/svg+xml,${encodeURIComponent(svg)}`
        }

        function buildThemeAdaptivePathIconDataUrl(pathD, options = {}) {
            return buildThemeAdaptivePathsIconDataUrl([{ d: pathD }], options)
        }

export {
    normalizeSvgCssColorToken,
    buildSvgElementsIconDataUrl,
    buildPathsIconDataUrl,
    buildPathIconDataUrl,
    buildThemeAdaptivePathsIconDataUrl,
    buildThemeAdaptivePathIconDataUrl
};
