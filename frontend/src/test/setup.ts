import "@testing-library/jest-dom/vitest";

Object.defineProperty(window.Element.prototype, "scrollIntoView", {
  configurable: true,
  value: () => undefined
});
