# CodeBrix Design System Specification

## Overview

CodeBrix is an enterprise-grade visual data science and pipeline desktop environment. The design system emphasizes high contrast, crisp typography, strict spatial rhythm, and tactile feedback inspired by modern developer IDEs and creative tools.

---

## 1. Design Tokens & Dimensions

All dimensions are defined in `apps/desktop/src/styles/tokens.css` as CSS custom properties.

### Spatial Sizing
| Token | Value | Purpose |
| :--- | :--- | :--- |
| `--cb-header-height` | `44px` | Merged macOS title bar and header navigation |
| `--cb-rail-width` | `56px` | Icon-only navigation left rail |
| `--cb-statusbar-height` | `24px` | Persistent bottom status bar |
| `--cb-node-width` | `280px` | Canvas block node standard width |
| `--cb-node-height` | `160px` | Canvas block node standard height |
| `--cb-control-height` | `28px` | Standard button and control height |
| `--cb-control-height-sm` | `24px` | Compact button and badge height |
| `--cb-control-height-lg` | `32px` | Primary action and modal input height |

### Corner Radii
| Token | Value | Purpose |
| :--- | :--- | :--- |
| `--cb-radius-sm` | `4px` | Badges, tooltips, port chips |
| `--cb-radius-control` | `6px` | Buttons, inputs, selects, dropdown items |
| `--cb-radius-card` | `8px` | Canvas nodes, modals, dropdown menus |
| `--cb-radius-full` | `9999px` | Circular badges, indicator dots, pill chips |

### Elevation & Layers
| Token | Value | Hex Equivalent | Description |
| :--- | :--- | :--- | :--- |
| `--cb-elevation-canvas` | `#080b12` | Darkest | Infinite node graph canvas background |
| `--cb-elevation-panel` | `#0d121f` | Surface 1 | Left rail, palette, output notebook, status bar |
| `--cb-elevation-node` | `#131b2e` | Surface 2 | Flow graph block cards |
| `--cb-elevation-popover` | `#18223a` | Surface 3 | Dropdown menus, modals, dialogs, command palette |
| `--cb-elevation-tooltip` | `#1e293b` | Surface 4 | Floating tooltips and popovers |

---

## 2. Port Data Type Color System

Ports and connections reflect strict data typing:

| Data Type | CSS Token | Color | Hex | Preview |
| :--- | :--- | :--- | :--- | :--- |
| **DataFrame / Series** | `--cb-port-dataframe` | Cyan | `#06b6d4` | `■` |
| **NumPy Array / Tensor** | `--cb-port-array` | Teal | `#14b8a6` | `■` |
| **Trained ML Model** | `--cb-port-model` | Purple | `#a855f7` | `■` |
| **Score / Number / Scalar**| `--cb-port-scalar` | Emerald | `#10b981` | `■` |
| **Figure / Visualization**| `--cb-port-plot` | Pink | `#ec4899` | `■` |
| **File / Filepath** | `--cb-port-file` | Sky | `#38bdf8` | `■` |
| **Dict / Key-Value Map** | `--cb-port-dict` | Violet | `#8b5cf6` | `■` |
| **Boolean** | `--cb-port-bool` | Rose | `#f43f5e` | `■` |
| **Any / String / Other** | `--cb-port-any` | Slate | `#94a3b8` | `■` |

Port handles display full tooltips on hover in the format: `"{Type} • {shape}"` (e.g. `"DataFrame • (150, 5)"`).

---

## 3. Block Category System

| Category | Token | Primary Tint | Description |
| :--- | :--- | :--- | :--- |
| **Data Ingestion & Sinks** | `--cb-cat-data` | Cyan (`#06b6d4`) | CSV, Parquet, SQL, API, Export |
| **Data Cleaning & Transform**| `--cb-cat-transform`| Amber (`#f59e0b`) | Impute, Filter, One-Hot, Normalize |
| **Model Training & Fitting** | `--cb-cat-model` | Indigo (`#6366f1`) | Random Forest, Linear, XGBoost, KMeans |
| **Evaluation & Metrics** | `--cb-cat-evaluation`| Emerald (`#10b981`) | Accuracy, F1, Loss, Precision, Recall |
| **Visualization & Reporting**| `--cb-cat-visualize` | Pink (`#ec4899`) | Confusion Matrix, Scatter, Histogram |
| **Custom & Scripting** | `--cb-cat-custom` | Violet (`#8b5cf6`) | Python script, Custom user blocks |

Block nodes on canvas feature category-tinted icon chips and title tooltips.

---

## 4. Layout & Grid Rules

### Window Shell Hierarchy
```
┌────────────────────────────────────────────────────────────────────────────────┐
│  Merged Header Bar (44px, 3-column grid)                                      │
├────┬───────────────────────────────────────────────┬───────────────────────────┤
│    │ Left Palette (280-360px resizable)            │ Properties Inspector      │
│ L  ├───────────────────────────────────────────────┤ (280-380px resizable)     │
│ R  │ Canvas Flow Workspace                         │                           │
│ A  │ (React Flow + Dagre Left-to-Right layout)     │                           │
│ I  ├───────────────────────────────────────────────┴───────────────────────────┤
│ L  │ Output Notebook Panel (Resizable drawer, min 160px, default 35vh)         │
│(56)│ Tabs: Console | Tables | Plots | Metrics | Images (hidden if 0 images)    │
├────┴───────────────────────────────────────────────────────────────────────────┤
│  Status Bar (24px, 3-zone grid)                                                │
└────────────────────────────────────────────────────────────────────────────────┘
```

### Auto-Layout Rules
- Hierarchical DAG layout powered by `@dagrejs/dagre`.
- Rank direction: `LR` (Left-to-Right).
- Node Separation (`nodesep`): `56px`.
- Rank Separation (`ranksep`): `130px`.
- Edges: Smoothstep spline with `offset: 24`, `borderRadius: 12`.

---

## 5. Component Standards

### Modal Dialogs
- **Portal**: All modals must render into `document.body` via `createPortal`.
- **Overlay**: Full-window scrim `fixed inset-0 z-[100] bg-black/60 backdrop-blur-[4px]`.
- **Keyboard**: Must close on `Esc` key and trap keyboard focus.
- **Mutual Exclusion**: Modals take precedence over drawers; LeftRail icons reflect inactive state for obscured panels.

### Standard Controls
- Height: `28px` (default controls), `32px` (inputs/selects in modals).
- Font size: `12px` / `13px` with `500` (medium) weight.
- Spacing: `8px` gap between control elements; `16px` icon sizing.
- Accent: Emerald (`#10b981`) for affirmative primary actions.

### Output Notebook
- Duration chip formatted as `1.2s` / `340ms` with zero occurrences of `NaN`.
- Internal block IDs (`blk-*`) are transformed into clickable `<BlockChip>` buttons that focus nodes on the canvas.
- Raw protocol JSON events (`{"event":"done",...}`) are hidden by default under a Debug toggle.
- Tabular outputs support column sorting, keyword search, and CSV export.
- Confusion matrix displays real class labels (`setosa`, `versicolor`, `virginica`) with adjacent axis orientation and accuracy KPI hero cards.
