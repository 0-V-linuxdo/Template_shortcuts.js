/* -------------------------------------------------------------------------- *
 * Core Utils · One-step executor
 * -------------------------------------------------------------------------- */

import { sleep } from "../../shared/base.js";
import { DEFAULT_TIMING } from "./dom.js";

function createOneStepExecutor({ execAction, isOpenChecker = {}, timing = {} } = {}) {
            const openCheckerMap = (isOpenChecker && typeof isOpenChecker === "object") ? isOpenChecker : {};
            const defaultStepDelay = timing.stepDelayMs ?? timing.stepDelay ?? DEFAULT_TIMING.stepDelayMs;
            const defaultOpenDelay = timing.openDelayMs ?? timing.menuOpenDelay ?? DEFAULT_TIMING.openDelayMs;

            async function safeExecStep(step) {
                if (!step) return false;
                try {
                    if (typeof step === "function") return !!(await step());
                    if (typeof execAction !== "function") return false;
                    return !!(await execAction(step));
                } catch {
                    return false;
                }
            }

            function resolveOpenCheck(rule) {
                if (typeof rule?.openCheck === "function") return rule.openCheck;
                if (rule?.openCheckKey && typeof openCheckerMap[rule.openCheckKey] === "function") {
                    return openCheckerMap[rule.openCheckKey];
                }
                return () => false;
            }

            function resolvePrimaryStep(rule) {
                if (!rule) return null;
                return (
                    rule.primaryStep ||
                    rule.primaryActionKey ||
                    (Array.isArray(rule.stepsIfOpen) && rule.stepsIfOpen[0]) ||
                    (Array.isArray(rule.stepsIfClosed) && rule.stepsIfClosed[rule.stepsIfClosed.length - 1]) ||
                    null
                );
            }

            async function runStepSequence(steps, { stepDelay = defaultStepDelay, firstDelay = 0 } = {}) {
                if (!Array.isArray(steps) || steps.length === 0) return false;
                let lastResult = false;
                for (let i = 0; i < steps.length; i++) {
                    lastResult = await safeExecStep(steps[i]);
                    if (i === steps.length - 1) break;
                    if (i === 0 && firstDelay > 0) {
                        await sleep(firstDelay);
                    } else {
                        await sleep(stepDelay);
                    }
                }
                return lastResult;
            }

            return async function execOneStepRule(rule) {
                if (!rule) return false;

                const openCheckFn = resolveOpenCheck(rule);
                const stepDelay = rule.stepDelayMs ?? rule.stepDelay ?? defaultStepDelay;
                const openDelay = rule.openDelayMs ?? rule.openDelay ?? defaultOpenDelay;
                const fastPathEnabled = rule.fastPath !== false;

                const primaryStep = resolvePrimaryStep(rule);
                if (fastPathEnabled && primaryStep && await safeExecStep(primaryStep)) {
                    return true;
                }

                const isOpen = typeof openCheckFn === "function" ? !!openCheckFn() : false;
                const steps = isOpen ? (rule.stepsIfOpen || []) : (rule.stepsIfClosed || []);
                const firstDelay = isOpen ? 0 : openDelay;

                return !!(await runStepSequence(steps, { stepDelay, firstDelay }));
            };
        }

export { createOneStepExecutor };
