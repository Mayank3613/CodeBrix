import React from "react";
import ReactDOM from "react-dom/client";
import './App.css'
import App from "./App";
import { bootstrapDefaultBlocks } from "./registry";

// Initialize block definitions before mounting
bootstrapDefaultBlocks();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
