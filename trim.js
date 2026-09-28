// trim.js：窗口推进与去极值（基线：一律原样返回）
export function heldOf(window, value) {
  return window;
}

export function trimOf(values) {
  return { mean: 0, low: 0, high: 0 };
}
