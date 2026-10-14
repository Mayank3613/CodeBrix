import type { ImageOutputMessage, OutputMessage } from "@codebrix/types";

const PLOT_KEYWORDS = [
  "plot",
  "chart",
  "histogram",
  "scatter",
  "distribution",
  "heatmap",
  "matrix",
  "importance",
  "coefficient",
  "breakdown",
  "curve",
  "roc",
  "precision",
  "recall",
  "performance",
  "prior",
  "vector",
  "residual",
  "diagnostic",
  "accuracy",
];

/**
 * Returns true if an output message represents an analytical plot, chart,
 * or statistical visualization (Confusion Matrix, Scatter, Histogram,
 * Feature Importance, Accuracy Breakdown, Plotly spec, etc.).
 */
export function isPlotOutput(m: OutputMessage): boolean {
  if (m.type === "metrics") {
    // Metrics containing matrix or confusion_matrix represent plot/matrix data
    return Boolean(
      (m.metrics && Array.isArray(m.metrics["matrix"])) ||
      (m.metrics && Array.isArray(m.metrics["confusion_matrix"]))
    );
  }

  if (m.type !== "image") {
    return false;
  }

  // Explicit format checks
  if (
    m.format === "plotly" ||
    m.format === "confusion_matrix" ||
    m.format === "feature_importance"
  ) {
    return true;
  }

  // Explicit metadata override
  if (m.metadata?.kind === "plot" || m.metadata?.isPlot === true) {
    return true;
  }
  if (m.metadata?.kind === "image" || m.metadata?.isPlot === false) {
    return false;
  }

  // Check blockId if available
  const blockId = (m.blockId || "").toLowerCase();
  if (
    blockId.startsWith("viz.") ||
    blockId.includes("plot") ||
    blockId.includes("chart") ||
    blockId.includes("scatter") ||
    blockId.includes("histogram") ||
    blockId.includes("feature_importance") ||
    blockId.includes("confusion_matrix")
  ) {
    return true;
  }

  // Check title keywords
  const title = (m.title || "").toLowerCase();
  if (PLOT_KEYWORDS.some((kw) => title.includes(kw))) {
    return true;
  }

  // Check if data is a Plotly JSON specification
  if (typeof m.data === "string" && m.data.startsWith("{")) {
    try {
      const parsed = JSON.parse(m.data);
      if (
        (parsed && parsed.data && Array.isArray(parsed.data)) ||
        (parsed && parsed.layout)
      ) {
        return true;
      }
    } catch {
      // not json
    }
  }

  return false;
}

/**
 * Returns true if an output message represents a standalone image / picture / raster asset
 * (photos, computer vision frames, digit samples, raw graphics) that is NOT an analytical plot.
 */
export function isImageOutput(m: OutputMessage): m is ImageOutputMessage {
  if (m.type !== "image") {
    return false;
  }

  // If it's classified as a plot, it does not belong in the Images tab
  if (isPlotOutput(m)) {
    return false;
  }

  // Must be a supported image format
  return m.format === "png" || m.format === "svg" || m.format === "base64";
}

/**
 * Calculates the item count for the Plots tab.
 * Counts 1 for matrix heatmap (if present) plus any other non-matrix plot images.
 */
export function getPlotsTabCount(messages: OutputMessage[]): number {
  const hasMatrix = messages.some(
    (o) =>
      (o.type === "metrics" &&
        Boolean(
          Array.isArray(o.metrics["matrix"]) ||
          Array.isArray(o.metrics["confusion_matrix"])
        )) ||
      (o.type === "image" && o.format === "confusion_matrix")
  );

  const otherPlotImages = messages.filter(
    (o): o is ImageOutputMessage =>
      isPlotOutput(o) && o.type === "image" && o.format !== "confusion_matrix"
  ).length;

  return (hasMatrix ? 1 : 0) + otherPlotImages;
}

/**
 * Calculates the item count for the Images tab.
 * Strictly counts genuine image outputs (not plots).
 */
export function getImagesTabCount(messages: OutputMessage[]): number {
  return messages.filter(isImageOutput).length;
}
