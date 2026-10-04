import { useEffect } from "react";
import Header from "./components/layout/Header";
import Toolbar from "./components/layout/Toolbar";
import Palette from "./palette/Palette";
import Canvas from "./canvas/Canvas";
import PropertiesPanel from "./panels/properties/PropertiesPanel";
import ValidationPanel from "./panels/validation/ValidationPanel";
import OutputPanel from "./panels/output/OutputPanel";
import { bootstrapDefaultBlocks } from "./registry";

export default function App() {
  useEffect(() => {
    bootstrapDefaultBlocks();
  }, []);

  return (
    <main className="h-screen w-screen flex flex-col bg-slate-950 text-slate-100 overflow-hidden select-none">
      <Header />
      <Toolbar />
      <ValidationPanel />

      <div className="flex flex-1 overflow-hidden relative">
        <Palette />
        <Canvas />
        <PropertiesPanel />
      </div>

      <OutputPanel />
    </main>
  );
}
