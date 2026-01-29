export {};

declare global {
  interface Window {
    addQueryToTab?: (query: string) => void;
  }
}
