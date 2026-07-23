/// <reference types="vite/client" />

// Raw-imported bundled scenario XML (import '...xml?raw').
declare module '*.xml?raw' {
  const content: string;
  export default content;
}
