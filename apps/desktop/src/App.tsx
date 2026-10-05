import { useEffect, useCallback } from "react";
import Toolbar from "./components/layout/Toolbar";
import Palette from "./palette/Palette";
import Canvas from "./canvas/Canvas";
import PropertiesPanel from "./panels/properties/PropertiesPanel";
import ValidationPanel from "./panels/validation/ValidationPanel";
import OutputPanel from "./panels/output/OutputPanel";
import ResizeHandle from "./components/layout/ResizeHandle";
import { bootstrapDefaultBlocks } from "./registry";
import { useUiStore } from "./stores";

export default function App() {
  const isPaletteOpen = useUiStore((s) => s.isPaletteOpen);
  const isPropertiesOpen = useUiStore((s) => s.isPropertiesOpen);
  const isOutputOpen = useUiStore((s) => s.isOutputOpen);

  const paletteWidth = useUiStore((s) => s.paletteWidth);
  const setPaletteWidth = useUiStore((s) => s.setPaletteWidth);
  const propertiesWidth = useUiStore((s) => s.propertiesWidth);
  const setPropertiesWidth = useUiStore((s) => s.setPropertiesWidth);
  const outputPanelHeight = useUiStore((s) => s.outputPanelHeight);
  const setOutputPanelHeight = useUiStore((s) => s.setOutputPanelHeight);

  useEffect(() => {
    bootstrapDefaultBlocks();
  }, []);

  // Palette resize: dragging right handle changes palette width
  const handlePaletteResize = useCallback(
    (delta: number) => {
      setPaletteWidth(paletteWidth + delta);
    },
    [paletteWidth, setPaletteWidth]
  );

  // Properties resize: dragging left handle changes properties width
  const handlePropertiesResize = useCallback(
    (delta: number) => {
      setPropertiesWidth(propertiesWidth - delta);
    },
    [propertiesWidth, setPropertiesWidth]
  );

  // Output resize: dragging top handle upward increases terminal height
  const handleOutputResize = useCallback(
    (delta: number) => {
      setOutputPanelHeight(outputPanelHeight - delta);
    },
    [outputPanelHeight, setOutputPanelHeight]
  );

  // Determine grid column & row sizes
  const colPalette = isPaletteOpen ? `${paletteWidth}px` : "0px";
  const colProperties = isPropertiesOpen ? `${propertiesWidth}px` : "0px";
  const rowOutput = isOutputOpen ? `${outputPanelHeight}px` : "0px";

  // Build CSS custom properties for the grid
  const shellStyle: React.CSSProperties = {
    ["--palette-width" as string]: colPalette,
    ["--properties-width" as string]: colProperties,
    ["--output-height" as string]: rowOutput,
  };

  // Shell class modifiers
  let shellClass = "cb-shell";
  if (!isPaletteOpen && !isPropertiesOpen) shellClass += " cb-shell--both-closed";
  else if (!isPaletteOpen) shellClass += " cb-shell--palette-closed";
  else if (!isPropertiesOpen) shellClass += " cb-shell--properties-closed";
  if (!isOutputOpen) shellClass += " cb-shell--output-closed";

  return (
    <main className={shellClass} style={shellStyle}>
      {/* ─── Topbar: Unified IDE Toolbar & Validation Status ─── */}
      <div className="cb-topbar flex flex-col gap-1.5 shrink-0 overflow-visible z-40">
        <Toolbar />
        <ValidationPanel />
      </div>

      {/* ─── Left Bento Cell: Block Palette ─── */}
      {isPaletteOpen && (
        <section className="cb-palette cb-bento-frame overflow-hidden relative z-20">
          <Palette />
          <ResizeHandle
            direction="horizontal"
            side="right"
            onResize={handlePaletteResize}
          />
        </section>
      )}

      {/* ─── Center-Top Bento Cell: React Flow Canvas ─── */}
      <section className="cb-canvas cb-bento-frame overflow-hidden relative z-10" style={{ minWidth: 0, minHeight: 0 }}>
        <Canvas />
      </section>

      {/* ─── Right Bento Cell: Properties Panel ─── */}
      {isPropertiesOpen && (
        <section className="cb-properties cb-bento-frame overflow-hidden relative z-20">
          <ResizeHandle
            direction="horizontal"
            side="left"
            onResize={handlePropertiesResize}
          />
          <PropertiesPanel />
        </section>
      )}

      {/* ─── Center-Bottom Bento Cell: Terminal / Output Notebook ─── */}
      {isOutputOpen && (
        <section className="cb-output cb-bento-frame overflow-hidden relative z-20">
          <ResizeHandle
            direction="vertical"
            side="top"
            onResize={handleOutputResize}
          />
          <OutputPanel />
        </section>
      )}
    </main>
  );
}
