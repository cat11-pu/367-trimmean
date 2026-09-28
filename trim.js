// trim.js：窗口推进与去极值
export function heldOf(window, value) {
  const next = window.slice();
  next.push(value);
  if (next.length > 5) {
    next.shift();
  }
  return next;
}

export function trimOf(values) {
  const sorted = values.slice().sort(function (a, b) { return a - b; });
  if (sorted.length === 0) {
    return { mean: 0, low: null, high: null };
  }
  const low = sorted[0];
  const high = sorted[sorted.length - 1];
  const rest = sorted.slice(1, sorted.length - 1);
  if (rest.length === 0) {
    return { mean: 0, low: low, high: high };
  }
  const sum = rest.reduce(function (acc, item) { return acc + item; }, 0);
  return { mean: Math.floor(sum / rest.length), low: low, high: high };
}
