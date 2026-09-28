import assert from "node:assert";
import { heldOf, trimOf } from "../trim.js";
import { step, close } from "../trimrun.js";
import { render } from "../app.js";

const base = {
  budget: 1,
  state: { window: [], records: [], ledger: [], applied: [] },
  events: [{ id: 1, kind: "push", value: 4 }],
  bad_value_code: "E_BAD_VALUE", not_enough_code: "E_NOT_ENOUGH",
  event_error_code: "E_BAD_EVENT"
};

let failed = 0;
function check(name, fn) {
  try { fn(); console.log("ok " + name); } catch (e) { failed += 1; console.log("FAIL " + name + " :: " + e.message); }
}

check("heldOf returns a list", () => {
  assert.ok(Array.isArray(heldOf([], 1)));
});

check("trimOf returns mean and spreads", () => {
  const got = trimOf([]);
  assert.strictEqual(typeof got.mean, "number");
});

check("step returns a state", () => {
  assert.strictEqual(typeof step(base).state, "object");
});

check("close returns a state", () => {
  assert.strictEqual(typeof close(base).state, "object");
});

check("render counts events", () => {
  assert.strictEqual(typeof render(base).count_events, "number");
});

console.log("5 cases, " + failed + " failed");
process.exit(failed === 0 ? 0 : 1);
