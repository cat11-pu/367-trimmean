// trimrun.js：按处理预算处理并留账，收尾不限预算把账做完
import { heldOf, trimOf } from "./trim.js";

const WINDOW_SIZE = 5;

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function codeOf(spec, key, fallback) {
  return spec && Object.prototype.hasOwnProperty.call(spec, key) && spec[key] ? spec[key] : fallback;
}

function validateEvent(event, spec) {
  if (event === null || typeof event !== "object" || Array.isArray(event)) {
    fail(codeOf(spec, "event_error_code", "E_BAD_EVENT"), "事件结构不合法");
  }
  if (event.kind !== "push" && event.kind !== "trim") {
    fail(codeOf(spec, "event_error_code", "E_BAD_EVENT"), "事件类型不合法");
  }
  if (event.kind === "push" && !Number.isInteger(event.value)) {
    fail(codeOf(spec, "bad_value_code", "E_BAD_VALUE"), "进值必须是整数");
  }
}

function toTriple(event) {
  const id = Number.isInteger(event.id) ? event.id : null;
  return event.kind === "push" ? ["push", event.value, id] : ["trim", null, id];
}

function publicTriple(triple) {
  return [triple[0], triple[1], null];
}

function cloneState(src) {
  return {
    window: Array.isArray(src.window) ? src.window.slice() : [],
    records: Array.isArray(src.records) ? src.records.map(function (row) {
      return [row[0], row[1], row[2]];
    }) : [],
    ledger: Array.isArray(src.ledger) ? src.ledger.map(function (row) {
      return [row[0], row[1], row[2]];
    }) : [],
    applied: Array.isArray(src.applied) ? src.applied.slice() : []
  };
}

function applyItem(ctx, kind, value, spec) {
  if (kind === "push") {
    ctx.window = heldOf(ctx.window, value);
    return;
  }
  if (ctx.window.length < WINDOW_SIZE) {
    fail(codeOf(spec, "not_enough_code", "E_NOT_ENOUGH"), "窗口不满五个，不能取值");
  }
  const result = trimOf(ctx.window);
  ctx.records.push([result.mean, result.low, result.high]);
}

function markApplied(applied, triple) {
  applied.push(Number.isInteger(triple[2]) ? triple[2] : triple);
}

export function step(spec) {
  const input = spec || {};
  const events = Array.isArray(input.events) ? input.events : [];
  events.forEach(function (event) {
    validateEvent(event, input);
  });

  const state = cloneState(input.state || {});
  let budget = Number.isInteger(input.budget) ? input.budget : 0;
  if (budget < 0) {
    budget = 0;
  }
  const queuedBound = events.length + state.ledger.length;
  let served = 0;

  while (budget > 0 && state.ledger.length > 0) {
    const triple = state.ledger.shift();
    applyItem(state, triple[0], triple[1], input);
    markApplied(state.applied, triple);
    budget -= 1;
    served += 1;
  }

  events.forEach(function (event) {
    if (Number.isInteger(event.id) && state.applied.indexOf(event.id) !== -1) {
      return;
    }
    if (budget > 0) {
      applyItem(state, event.kind, event.value, input);
      state.applied.push(Number.isInteger(event.id) ? event.id : toTriple(event));
      budget -= 1;
      served += 1;
    } else {
      state.ledger.push(toTriple(event));
    }
  });

  return {
    state: state,
    served: served,
    ledger_before: state.ledger.length,
    ledger: state.ledger.map(publicTriple),
    judged: served,
    judged_bound: queuedBound
  };
}

export function close(spec) {
  const input = spec || {};
  const state = cloneState(input.state || {});
  let catchup = 0;

  while (state.ledger.length > 0) {
    const triple = state.ledger.shift();
    applyItem(state, triple[0], triple[1], input);
    markApplied(state.applied, triple);
    catchup += 1;
  }

  return { state: state, catchup: catchup };
}
