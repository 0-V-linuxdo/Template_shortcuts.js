import { getDomConstructor, getGlobalScope, getUnsafeWindow } from "../../shared/platform/browser.js";

/* -------------------------------------------------------------------------- *
 * Core Utils · Event helpers
 * -------------------------------------------------------------------------- */

function resolveEventView(element) {
            try {
                if (element?.ownerDocument?.defaultView) return element.ownerDocument.defaultView;
            } catch (e) {}
            try {
                const unsafeWin = getUnsafeWindow();
                if (unsafeWin) return unsafeWin;
            } catch (e) {}
            return getGlobalScope();
        }

        function dispatchSyntheticEvent(element, type, Ctor, optionsBuilder) {
            if (!element || typeof Ctor !== "function") return false;
            try {
                const opts = typeof optionsBuilder === "function" ? optionsBuilder() : optionsBuilder;
                const event = new Ctor(type, opts);
                element.dispatchEvent(event);
                return true;
            } catch {
                return false;
            }
        }

        function createEventOptions(element) {
            const view = resolveEventView(element);
            const baseOptions = () => ({ bubbles: true, cancelable: true, composed: true, view: view || null });
            const pointerOptions = () => ({ ...baseOptions(), pointerId: 1, pointerType: "mouse", isPrimary: true });
            return { baseOptions, pointerOptions };
        }

        function dispatchEventPlans(element, plans) {
            let dispatched = false;
            for (const plan of plans) {
                const ok = dispatchSyntheticEvent(element, plan.type, plan.ctor, plan.opts);
                dispatched = dispatched || ok;
            }
            return dispatched;
        }

        function simulateClick(element, { nativeFallback = true } = {}) {
            if (!element) return false;
            const { baseOptions, pointerOptions } = createEventOptions(element);
            const PointerEventCtor = getDomConstructor("PointerEvent");
            const MouseEventCtor = getDomConstructor("MouseEvent");
            const eventPlans = [
                typeof PointerEventCtor === "function" && { ctor: PointerEventCtor, type: "pointerdown", opts: pointerOptions },
                typeof MouseEventCtor === "function" && { ctor: MouseEventCtor, type: "mousedown", opts: baseOptions },
                typeof PointerEventCtor === "function" && { ctor: PointerEventCtor, type: "pointerup", opts: pointerOptions },
                typeof MouseEventCtor === "function" && { ctor: MouseEventCtor, type: "mouseup", opts: baseOptions },
                typeof MouseEventCtor === "function" && { ctor: MouseEventCtor, type: "click", opts: baseOptions }
            ].filter(Boolean);

            let dispatched = dispatchEventPlans(element, eventPlans);
            if (!dispatched && nativeFallback) {
                try {
                    element.click();
                    dispatched = true;
                } catch {}
            }
            return dispatched;
        }

        function simulateHover(element) {
            if (!element) return false;
            const { baseOptions, pointerOptions } = createEventOptions(element);
            const PointerEventCtor = getDomConstructor("PointerEvent");
            const MouseEventCtor = getDomConstructor("MouseEvent");
            const eventPlans = [
                typeof PointerEventCtor === "function" && { ctor: PointerEventCtor, type: "pointerover", opts: pointerOptions },
                typeof PointerEventCtor === "function" && { ctor: PointerEventCtor, type: "pointerenter", opts: pointerOptions },
                typeof MouseEventCtor === "function" && { ctor: MouseEventCtor, type: "mouseover", opts: baseOptions },
                typeof MouseEventCtor === "function" && { ctor: MouseEventCtor, type: "mouseenter", opts: baseOptions },
                typeof PointerEventCtor === "function" && { ctor: PointerEventCtor, type: "pointermove", opts: pointerOptions },
                typeof MouseEventCtor === "function" && { ctor: MouseEventCtor, type: "mousemove", opts: baseOptions }
            ].filter(Boolean);

            return dispatchEventPlans(element, eventPlans);
        }

export {
    resolveEventView,
    simulateClick,
    simulateHover
};
