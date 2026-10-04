import { registerRenderer } from "../registry";
import ConsoleRenderer from "./ConsoleRenderer";
import TableRenderer from "./TableRenderer";
import MetricsRenderer from "./MetricsRenderer";
import ImageRenderer from "./ImageRenderer";
import PlotlyRenderer from "./PlotlyRenderer";

export {
  ConsoleRenderer,
  TableRenderer,
  MetricsRenderer,
  ImageRenderer,
  PlotlyRenderer,
};

/**
 * Register all standard output renderers into the outputRendererRegistry.
 */
export function registerDefaultRenderers(): void {
  registerRenderer("console", ConsoleRenderer);
  registerRenderer("table", TableRenderer);
  registerRenderer("metrics", MetricsRenderer);
  registerRenderer("image", ImageRenderer);
  registerRenderer("plotly", PlotlyRenderer);
  registerRenderer("error", ConsoleRenderer);
}

// Auto-register on module load
registerDefaultRenderers();
