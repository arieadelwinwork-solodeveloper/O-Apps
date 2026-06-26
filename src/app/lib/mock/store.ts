import { createSeedData, type MockSeed } from "./seed";

let store: MockSeed = createSeedData();

export function getStore(): MockSeed {
  return store;
}

export function resetStore(): void {
  store = createSeedData();
}

export function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}
