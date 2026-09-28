// trim.js：窗口推进与去极值
const WINDOW_LIMIT = 5;

export function heldOf(window, value) {
  const next = (window || []).slice();
  next.push(value);
  while (next.length > WINDOW_LIMIT) next.shift();
  return next;
}

export function trimOf(values) {
  const sorted = (values || []).slice().sort(function (a, b) { return a - b; });
  const low = sorted.length ? sorted[0] : 0;
  const high = sorted.length ? sorted[sorted.length - 1] : 0;
  const middle = sorted.slice(1, -1);
  const sum = middle.reduce(function (acc, item) { return acc + item; }, 0);
  const mean = middle.length ? Math.floor(sum / middle.length) : 0;
  return { mean: mean, low: low, high: high };
}
