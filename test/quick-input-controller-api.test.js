import test from "node:test";
import assert from "node:assert/strict";

import {
    createController,
    waitForRunStartPauseGuard
} from "../src/modules/quick-input/controller.js";

test("QuickInput controller exposes a safe pause API", () => {
    const controller = createController({ engine: {} });

    assert.equal(typeof controller.pause, "function");
    assert.doesNotThrow(() => controller.pause());
});

test("run-start pause guard blocks later actions until manual resume", async () => {
    const events = [];
    let resume = null;
    const resumed = new Promise(resolve => {
        resume = resolve;
    });

    const guardedRun = (async () => {
        const canContinue = await waitForRunStartPauseGuard({
            shouldPause: () => {
                events.push("detected");
                return true;
            },
            pause: () => events.push("paused"),
            waitWhilePaused: async () => {
                events.push("waiting");
                return resumed;
            }
        });
        if (canContinue) events.push("site-action");
    })();

    await Promise.resolve();
    assert.deepEqual(events, ["detected", "paused", "waiting"]);

    resume(true);
    await guardedRun;
    assert.deepEqual(events, ["detected", "paused", "waiting", "site-action"]);
});

test("run-start pause guard exits without a site action when stopped", async () => {
    const events = [];
    const canContinue = await waitForRunStartPauseGuard({
        shouldPause: () => true,
        pause: () => events.push("paused"),
        waitWhilePaused: async () => false
    });

    assert.equal(canContinue, false);
    assert.deepEqual(events, ["paused"]);
});
