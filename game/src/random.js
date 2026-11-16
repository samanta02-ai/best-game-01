// A small seeded RNG (mulberry32) so a screenshot seed always stages the same
// field, and live games still vary from run to run.
export function createRandom(seed) {
  let state = seed >>> 0;
  function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  return {
    next,
    /** Integer in [0, n). */
    int(n) {
      return Math.floor(next() * n);
    },
    /** Float in [a, b). */
    range(a, b) {
      return a + next() * (b - a);
    },
    /** One element of a non-empty array. */
    pick(items) {
      return items[Math.floor(next() * items.length)];
    },
  };
}
