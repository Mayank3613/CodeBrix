import React from "react";
import ReactDOM from "react-dom/client";
import './App.css'
import App from "./App";
import { bootstrapDefaultBlocks, discoverAndLoadLibraries } from "./registry";

// Initialize default block definitions synchronously before mounting
bootstrapDefaultBlocks();
// Discover and load extensible libraries in background
discoverAndLoadLibraries().catch((err) => {
  console.warn("Library discovery notice:", err);
});

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
