// trimrun.js：按处理预算处理并留账
import { heldOf, trimOf } from "./trim.js";

const WINDOW_LIMIT = 5;

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function codesOf(spec) {
  const src = spec || {};
  return {
    badEvent: src.event_error_code || "E_BAD_EVENT",
    badValue: src.bad_value_code || "E_BAD_VALUE",
    notEnough: src.not_enough_code || "E_NOT_ENOUGH"
  };
}

function validateEvent(event, codes) {
  if (!event || typeof event !== "object" || Array.isArray(event)) {
    fail(codes.badEvent, "event must be an object");
  }
  if (event.kind !== "push" && event.kind !== "trim") {
    fail(codes.badEvent, "unknown event kind");
  }
  if (event.kind === "push" && !Number.isInteger(event.value)) {
    fail(codes.badValue, "push value must be an integer");
  }
}

function cloneState(source) {
  const src = source || {};
  return {
    window: (src.window || []).slice(),
    records: (src.records || []).map(function (row) { return row.slice(); }),
    ledger: (src.ledger || []).slice(),
    applied: (src.applied || []).slice()
  };
}

function kindOf(item) { return Array.isArray(item) ? item[0] : item.kind; }
function valueOf(item) { return Array.isArray(item) ? item[1] : item.value; }
function idOf(item) { return item && item.id !== undefined ? item.id : undefined; }

// 账面条目定型为 [类型, 数值, 占位]，事件 id 挂在不可枚举属性上，
// 既保证 JSON 形态稳定，又能让收尾/重放按 id 去重。
function ledgerEntryOf(event) {
  const entry = [event.kind, event.kind === "push" ? event.value : null, null];
  if (event.id !== undefined) {
    Object.defineProperty(entry, "id", { value: event.id, enumerable: false });
  }
  return entry;
}

function applyItem(state, item, codes) {
  const kind = kindOf(item);
  if (kind === "push") {
    state.window = heldOf(state.window, valueOf(item));
    return;
  }
  if (kind === "trim") {
    if (state.window.length < WINDOW_LIMIT) {
      fail(codes.notEnough, "window holds fewer than five values");
    }
    const result = trimOf(state.window);
    state.records.push([result.mean, result.low, result.high]);
    return;
  }
  fail(codes.badEvent, "unknown event kind");
}

export function step(spec) {
  const src = spec || {};
  const codes = codesOf(src);
  const events = src.events || [];
  const budget = typeof src.budget === "number" ? src.budget : 0;
  const state = cloneState(src.state);

  events.forEach(function (event) { validateEvent(event, codes); });

  const seen = new Set(state.applied);
  state.ledger.forEach(function (entry) {
    const id = idOf(entry);
    if (id !== undefined) seen.add(id);
  });

  const queue = state.ledger.slice();
  events.forEach(function (event) {
    const id = idOf(event);
    if (id !== undefined && seen.has(id)) return;
    if (id !== undefined) seen.add(id);
    queue.push(event);
  });

  let remaining = budget;
  let served = 0;
  const ledger = [];
  queue.forEach(function (item) {
    if (remaining > 0) {
      remaining -= 1;
      applyItem(state, item, codes);
      served += 1;
      const id = idOf(item);
      if (id !== undefined) state.applied.push(id);
    } else {
      ledger.push(Array.isArray(item) ? item : ledgerEntryOf(item));
    }
  });
  state.ledger = ledger;

  return {
    state: state,
    served: served,
    ledger_before: ledger.length,
    ledger: ledger,
    judged: served,
    judged_bound: typeof src.budget === "number" ? src.budget : served
  };
}

export function close(spec) {
  const src = spec || {};
  const codes = codesOf(src);
  const state = cloneState(src.state);
  const queue = state.ledger;
  state.ledger = [];
  let catchup = 0;
  queue.forEach(function (item) {
    applyItem(state, item, codes);
    catchup += 1;
    const id = idOf(item);
    if (id !== undefined) state.applied.push(id);
  });
  return { state: state, catchup: catchup };
}
