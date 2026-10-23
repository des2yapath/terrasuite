import "@testing-library/jest-dom";

// jsdom lacks matchMedia (used by useIsMobile and Recharts/day-picker internals)
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

// jsdom lacks IntersectionObserver (radix/day-picker popovers)
class MockIntersectionObserver {
  observe = () => {};
  unobserve = () => {};
  disconnect = () => {};
  takeRecords = () => [];
}
Object.defineProperty(window, "IntersectionObserver", {
  writable: true,
  value: MockIntersectionObserver,
});
Object.defineProperty(global, "IntersectionObserver", {
  writable: true,
  value: MockIntersectionObserver,
});

// jsdom lacks ResizeObserver (Recharts ResponsiveContainer)
class MockResizeObserver {
  observe = () => {};
  unobserve = () => {};
  disconnect = () => {};
}
Object.defineProperty(window, "ResizeObserver", {
  writable: true,
  value: MockResizeObserver,
});
Object.defineProperty(global, "ResizeObserver", {
  writable: true,
  value: MockResizeObserver,
});

// jsdom lacks scrollTo
Object.defineProperty(window, "scrollTo", {
  writable: true,
  value: () => {},
});
