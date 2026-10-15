import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import type {
  BlockDefinition,
  PortDefinition,
  PortType,
  BlockConfigField,
  BlockCategory,
} from "@codebrix/types";
import { useCustomBlockStore } from "../stores/customBlockStore";
import { blockRegistry } from "../registry";
import Select, { type SelectOption } from "../components/common/Select";
import {
  Boxes,
  X,
  Plus,
  Trash2,
  Code2,
  Layers,
  Sliders,
  Check,
  AlertCircle,
  FileUp,
} from "lucide-react";

interface CustomBlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  editBlockId?: string | null;
  initialTemplate?: "transform" | "model" | "metric" | null;
  onBlockSaved?: (block: BlockDefinition) => void;
}

const PORT_TYPE_OPTIONS: SelectOption[] = [
  { value: "dataframe", label: "DataFrame (tabular)" },
  { value: "series", label: "Series (1D column)" },
  { value: "model", label: "Model (estimator)" },
  { value: "number", label: "Number (float/int)" },
  { value: "string", label: "String (text)" },
  { value: "scalar", label: "Scalar (value)" },
  { value: "boolean", label: "Boolean (true/false)" },
  { value: "array", label: "Array (list/vector)" },
  { value: "file", label: "File (path)" },
  { value: "figure", label: "Figure (plot)" },
  { value: "dict", label: "Dict (mapping)" },
  { value: "any", label: "Any (flexible)" },
];

const CATEGORY_OPTIONS: SelectOption[] = [
  { value: "custom", label: "Custom (User-Defined)" },
  { value: "data", label: "Data Ingestion & Sinks" },
  { value: "preprocessing", label: "Data Preprocessing" },
  { value: "ml", label: "Machine Learning" },
  { value: "evaluation", label: "Evaluation & Metrics" },
  { value: "visualization", label: "Visualizations & Plots" },
  { value: "core", label: "Core & Utility" },
];

const PARAM_TYPE_OPTIONS: SelectOption[] = [
  { value: "string", label: "string" },
  { value: "number", label: "number" },
  { value: "boolean", label: "boolean" },
  { value: "select", label: "select" },
  { value: "slider", label: "slider" },
  { value: "file", label: "file" },
];

const CODE_TEMPLATES = {
  transform: `# ── Custom Data Transform ──
# Inputs: inputs["dataset_in"] (pandas.DataFrame)
# Config: config["method"]
df = inputs.get("dataset_in", pd.DataFrame()).copy()

print(f"Processing DataFrame with {len(df)} rows...")
outputs["dataset_out"] = df
`,
  model: `# ── Custom ML Model ──
# Inputs: inputs["train_data_in"] (pandas.DataFrame)
df_train = inputs.get("train_data_in", pd.DataFrame()).copy()
X = df_train.iloc[:, :-1]
y = df_train.iloc[:, -1]

from sklearn.ensemble import ExtraTreesClassifier
model = ExtraTreesClassifier(n_estimators=100, random_state=42)
model.fit(X, y)

outputs["model_out"] = model
print(f"Model trained on {len(X)} samples successfully.")
`,
  metric: `# ── Custom Metric Evaluator ──
y_pred = inputs.get("predictions_in")
y_true = inputs.get("ground_truth_in")

from sklearn.metrics import f1_score
score = float(f1_score(y_true, y_pred, average="weighted"))
outputs["score_out"] = score
print(f"Evaluated custom metric: {score:.4f}")
`,
  generic: `# ── Custom Script Execution ──
# Inputs: inputs["data_in"]
# Outputs: outputs["data_out"]
val = inputs.get("data_in")
outputs["data_out"] = val
`,
};

export default function CustomBlockModal({
  isOpen,
  onClose,
  editBlockId,
  initialTemplate,
  onBlockSaved,
}: CustomBlockModalProps) {
  const [activeTab, setActiveTab] = useState<"general" | "ports" | "params" | "code">("general");

  // Form State
  const [name, setName] = useState("");
  const [id, setId] = useState("");
  const [category, setCategory] = useState<BlockCategory>("custom");
  const [version, setVersion] = useState("0.1.0");
  const [description, setDescription] = useState("");
  const [author, setAuthor] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

  const [inputs, setInputs] = useState<PortDefinition[]>([
    { id: "dataset_in", name: "Input Data", type: "dataframe", direction: "input", required: true },
  ]);
  const [outputs, setOutputs] = useState<PortDefinition[]>([
    { id: "dataset_out", name: "Output Data", type: "dataframe", direction: "output" },
  ]);

  const [params, setParams] = useState<
    Array<{ key: string; label: string; type: BlockConfigField["type"]; defaultValue: string; options?: string }>
  >([
    { key: "method", label: "Method / Mode", type: "string", defaultValue: "default" },
  ]);

  const [pythonCode, setPythonCode] = useState(CODE_TEMPLATES.transform);
  const [isImportJsonOpen, setIsImportJsonOpen] = useState(false);
  const [importJsonText, setImportJsonText] = useState("");
  const [idManuallyEdited, setIdManuallyEdited] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);
  const firstFocusableRef = useRef<HTMLInputElement>(null);

  const addCustomBlock = useCustomBlockStore((s) => s.addCustomBlock);
  const updateCustomBlock = useCustomBlockStore((s) => s.updateCustomBlock);
  const getCustomBlock = useCustomBlockStore((s) => s.getCustomBlock);
  const getPythonCode = useCustomBlockStore((s) => s.getPythonCode);

  // Initialize or reset form state on open
  useEffect(() => {
    if (!isOpen) return;

    if (editBlockId) {
      setIdManuallyEdited(true);
      const existing = getCustomBlock(editBlockId);
      if (existing) {
        setName(existing.name);
        setId(existing.id);
        setCategory(existing.category || "custom");
        setVersion(existing.version || "0.1.0");
        setDescription(existing.description || "");
        setAuthor(existing.author || "");
        setTags(existing.tags || []);
        setInputs([...existing.inputs]);
        setOutputs([...existing.outputs]);

        if (existing.configSchema) {
          const loadedParams = Object.entries(existing.configSchema).map(([k, f]) => ({
            key: k,
            label: f.label || k,
            type: f.type,
            defaultValue: String(f.defaultValue ?? ""),
            options: f.options ? f.options.map((o) => o.value).join(", ") : undefined,
          }));
          setParams(loadedParams);
        }

        const code = getPythonCode(editBlockId);
        if (code) {
          setPythonCode(code);
        }
      }
    } else {
      setIdManuallyEdited(false);
      if (initialTemplate === "model") {
        setName("Custom ML Classifier");
        setId("custom.my_classifier");
        setCategory("ml");
        setVersion("0.1.0");
        setDescription("Custom supervised classification model using ExtraTreesClassifier.");
        setAuthor("");
        setTags(["ml", "classifier", "supervised"]);
        setInputs([
          { id: "train_data_in", name: "Train Data", type: "dataframe", direction: "input", required: true },
        ]);
        setOutputs([
          { id: "model_out", name: "Trained Model", type: "model", direction: "output" },
        ]);
        setParams([
          { key: "n_estimators", label: "Estimators", type: "number", defaultValue: "100" },
        ]);
        setPythonCode(CODE_TEMPLATES.model);
      } else if (initialTemplate === "metric") {
        setName("Custom Metric Evaluator");
        setId("custom.my_metric");
        setCategory("evaluation");
        setVersion("0.1.0");
        setDescription("Custom evaluation metric computing weighted F1-Score or custom loss.");
        setAuthor("");
        setTags(["eval", "metric", "score"]);
        setInputs([
          { id: "predictions_in", name: "Predictions", type: "series", direction: "input", required: true },
          { id: "ground_truth_in", name: "Ground Truth", type: "series", direction: "input", required: true },
        ]);
        setOutputs([
          { id: "score_out", name: "Score", type: "number", direction: "output" },
        ]);
        setParams([]);
        setPythonCode(CODE_TEMPLATES.metric);
      } else {
        setName(initialTemplate === "transform" ? "Custom Data Transform" : "");
        setId(initialTemplate === "transform" ? "custom.data_transform" : "");
        setCategory(initialTemplate === "transform" ? "preprocessing" : "custom");
        setVersion("0.1.0");
        setDescription(initialTemplate === "transform" ? "Transforms input DataFrame and outputs processed dataset." : "");
        setAuthor("");
        setTags([]);
        setInputs([
          { id: "dataset_in", name: "Input Data", type: "dataframe", direction: "input", required: true },
        ]);
        setOutputs([
          { id: "dataset_out", name: "Output Data", type: "dataframe", direction: "output" },
        ]);
        setParams([
          { key: "method", label: "Method / Mode", type: "string", defaultValue: "default" },
        ]);
        setPythonCode(CODE_TEMPLATES.transform);
      }
    }
    setActiveTab("general");
    setIsImportJsonOpen(false);
  }, [isOpen, editBlockId, initialTemplate, getCustomBlock, getPythonCode]);

  // Focus trap & Escape key listener
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        return;
      }

      if (e.key === "Tab" && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    const timer = setTimeout(() => {
      firstFocusableRef.current?.focus();
    }, 50);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      clearTimeout(timer);
    };
  }, [isOpen, onClose]);

  // Auto-slugify ID when name changes (only in create mode unless user manually edited ID)
  const handleNameChange = (val: string) => {
    setName(val);
    if (!editBlockId && !idManuallyEdited) {
      const slug = val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
      setId(slug ? `custom.${slug}` : "");
    }
  };

  // Validation issues computation for live draft status
  const validationIssues = useCallback((): string[] => {
    const issues: string[] = [];
    const cleanName = name.trim();
    const cleanId = id.trim();

    if (!cleanName) issues.push("Display name is required");
    if (!cleanId) {
      issues.push("Block ID is required");
    } else {
      // Check duplicate ID against registry and customBlockStore
      const existingInRegistry = blockRegistry.get(cleanId);
      const existingInStore = getCustomBlock(cleanId);
      if (
        (!editBlockId && (existingInRegistry || existingInStore)) ||
        (editBlockId && cleanId !== editBlockId && (existingInRegistry || existingInStore))
      ) {
        issues.push(`ID "${cleanId}" already exists`);
      }
    }

    if (inputs.length === 0 && outputs.length === 0) {
      issues.push("At least 1 port (input or output) is required");
    }

    const portIds = new Set<string>();
    for (const inp of inputs) {
      if (!inp.id.trim()) issues.push("All input ports must have an ID");
      else if (portIds.has(inp.id.trim())) issues.push(`Duplicate port ID: "${inp.id}"`);
      portIds.add(inp.id.trim());
    }
    for (const out of outputs) {
      if (!out.id.trim()) issues.push("All output ports must have an ID");
      else if (portIds.has(out.id.trim())) issues.push(`Duplicate port ID: "${out.id}"`);
      portIds.add(out.id.trim());
    }

    return issues;
  }, [name, id, editBlockId, inputs, outputs, getCustomBlock]);

  const issues = validationIssues();
  const idError = issues.find((i) => i.includes("Block ID") || i.includes("already exists"));

  // Port management
  const handleAddInput = () => {
    const nextIdx = inputs.length + 1;
    setInputs([
      ...inputs,
      { id: `in_${nextIdx}`, name: `Input ${nextIdx}`, type: "dataframe", direction: "input", required: false },
    ]);
  };

  const handleRemoveInput = (index: number) => {
    setInputs(inputs.filter((_, i) => i !== index));
  };

  const handleUpdateInput = (index: number, patch: Partial<PortDefinition>) => {
    const updated = [...inputs];
    updated[index] = { ...updated[index]!, ...patch };
    setInputs(updated);
  };

  const handleAddOutput = () => {
    const nextIdx = outputs.length + 1;
    setOutputs([
      ...outputs,
      { id: `out_${nextIdx}`, name: `Output ${nextIdx}`, type: "dataframe", direction: "output" },
    ]);
  };

  const handleRemoveOutput = (index: number) => {
    setOutputs(outputs.filter((_, i) => i !== index));
  };

  const handleUpdateOutput = (index: number, patch: Partial<PortDefinition>) => {
    const updated = [...outputs];
    updated[index] = { ...updated[index]!, ...patch };
    setOutputs(updated);
  };

  // Config parameters
  const handleAddParam = () => {
    const nextIdx = params.length + 1;
    setParams([
      ...params,
      { key: `param_${nextIdx}`, label: `Parameter ${nextIdx}`, type: "string", defaultValue: "" },
    ]);
  };

  const handleRemoveParam = (index: number) => {
    setParams(params.filter((_, i) => i !== index));
  };

  const handleUpdateParam = (index: number, patch: Partial<(typeof params)[0]>) => {
    const updated = [...params];
    updated[index] = { ...updated[index]!, ...patch };
    setParams(updated);
  };

  // Tags chip input
  const handleAddTag = () => {
    const trimmed = tagInput.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
    }
    setTagInput("");
  };

  const handleRemoveTag = (t: string) => {
    setTags(tags.filter((item) => item !== t));
  };

  // Save handler
  const handleSave = () => {
    if (issues.length > 0) {
      if (issues.some((i) => i.includes("name") || i.includes("ID"))) {
        setActiveTab("general");
      } else if (issues.some((i) => i.includes("port"))) {
        setActiveTab("ports");
      }
      return;
    }

    const cleanName = name.trim();
    const cleanId = id.trim();

    const configSchema: Record<string, BlockConfigField> = {};
    for (const p of params) {
      const pKey = p.key.trim().replace(/[^a-zA-Z0-9_]/g, "_");
      if (!pKey) continue;

      let parsedDefault: unknown = p.defaultValue;
      if (p.type === "number" || p.type === "slider") {
        parsedDefault = Number(p.defaultValue) || 0;
      } else if (p.type === "boolean") {
        parsedDefault = p.defaultValue === "true";
      }

      const options = p.options
        ? p.options.split(",").map((opt) => ({ label: opt.trim(), value: opt.trim() }))
        : undefined;

      configSchema[pKey] = {
        name: pKey,
        label: p.label || pKey,
        type: p.type,
        defaultValue: parsedDefault,
        options,
      };
    }

    if (pythonCode.trim()) {
      configSchema["customCode"] = {
        name: "customCode",
        label: "Python Code",
        type: "string",
        defaultValue: pythonCode,
      };
    }

    const definition: BlockDefinition = {
      id: cleanId,
      name: cleanName,
      category,
      version: version.trim() || "0.1.0",
      description: description.trim() || "User defined custom block",
      author: author.trim() || "User",
      tags,
      inputs,
      outputs,
      configSchema,
    };

    if (editBlockId) {
      updateCustomBlock(editBlockId, definition, pythonCode);
    } else {
      addCustomBlock(definition, pythonCode);
    }

    if (onBlockSaved) {
      onBlockSaved(definition);
    }

    onClose();
  };

  const totalPortsCount = inputs.length + outputs.length;
  const totalParamsCount = params.length;

  if (!isOpen) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="custom-block-modal-title"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-[4px] p-4 select-none animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        className="w-full max-w-2xl bg-[var(--cb-elevation-panel)] border border-[var(--cb-border-strong)] rounded-[var(--cb-radius-panel)] shadow-[var(--cb-shadow-overlay)] flex flex-col max-h-[90vh] overflow-hidden text-[var(--cb-text-primary)] animate-in zoom-in-95 duration-150"
      >
        {/* ── Header ── */}
        <div className="h-14 px-6 border-b border-[var(--cb-border-subtle)] flex items-center justify-between shrink-0 bg-[var(--cb-elevation-raised)]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-[var(--cb-radius-control)] bg-[var(--cb-accent-subtle)] border border-[var(--cb-accent-border)] flex items-center justify-center text-[var(--cb-accent)] shrink-0">
              <Boxes size={18} />
            </div>
            <div>
              <h2 id="custom-block-modal-title" className="text-[13px] font-semibold text-[var(--cb-text-primary)]">
                {editBlockId ? "Edit Custom Block" : "Create Custom Block"}
              </h2>
              <p className="text-[11px] text-[var(--cb-text-muted)]">
                Define typed ports, runtime properties, and executable Python logic
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsImportJsonOpen(!isImportJsonOpen)}
              className="h-7 px-2.5 rounded-[var(--cb-radius-control)] bg-white/[0.04] hover:bg-white/[0.08] text-[var(--cb-text-secondary)] hover:text-white border border-[var(--cb-border-subtle)] text-[11px] flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <FileUp size={12} />
              <span>Import JSON</span>
            </button>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-[var(--cb-radius-control)] text-[var(--cb-text-muted)] hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Close dialog"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* ── JSON Import Drawer ── */}
        {isImportJsonOpen && (
          <div className="p-3 bg-[var(--cb-elevation-app)] border-b border-[var(--cb-border-subtle)] space-y-2">
            <div className="flex items-center justify-between text-[11px] text-[var(--cb-text-secondary)] font-medium">
              <span>Paste Block Definition JSON:</span>
              <button
                onClick={() => setIsImportJsonOpen(false)}
                className="text-[10px] text-[var(--cb-text-muted)] hover:text-white cursor-pointer"
              >
                Close
              </button>
            </div>
            <textarea
              rows={3}
              value={importJsonText}
              onChange={(e) => setImportJsonText(e.target.value)}
              placeholder='{ "id": "custom.my_block", "name": "My Block", "category": "ml", ... }'
              className="w-full bg-[var(--cb-elevation-raised)] border border-[var(--cb-border-subtle)] rounded-[var(--cb-radius-control)] p-2 text-[11px] font-mono text-[var(--cb-text-primary)] focus:border-[var(--cb-accent)] outline-none"
            />
            <button
              onClick={() => {
                try {
                  const parsed = JSON.parse(importJsonText);
                  const def: BlockDefinition = parsed.definition || parsed;
                  if (def.name) setName(def.name);
                  if (def.id) setId(def.id);
                  if (def.category) setCategory(def.category);
                  if (def.version) setVersion(def.version);
                  if (def.description) setDescription(def.description);
                  if (def.author) setAuthor(def.author);
                  if (def.tags) setTags(def.tags);
                  if (def.inputs) setInputs(def.inputs);
                  if (def.outputs) setOutputs(def.outputs);
                  if (parsed.pythonCode) setPythonCode(parsed.pythonCode);
                  setIsImportJsonOpen(false);
                } catch {
                  // ignore
                }
              }}
              className="h-7 px-3 bg-[var(--cb-accent)] hover:bg-[var(--cb-accent-hover)] text-white text-[11px] font-medium rounded-[var(--cb-radius-control)] transition-colors cursor-pointer"
            >
              Load into Form
            </button>
          </div>
        )}

        {/* ── Navigation Tabs ── */}
        <div className="flex border-b border-[var(--cb-border-subtle)] px-6 bg-[var(--cb-elevation-raised)] text-[12px] font-medium shrink-0">
          <button
            onClick={() => setActiveTab("general")}
            className={`h-9 px-3 border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === "general"
                ? "border-[var(--cb-accent)] text-[var(--cb-accent)] font-semibold"
                : "border-transparent text-[var(--cb-text-secondary)] hover:text-white"
            }`}
          >
            <Layers size={13} />
            <span>General</span>
          </button>

          <button
            onClick={() => setActiveTab("ports")}
            className={`h-9 px-3 border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === "ports"
                ? "border-[var(--cb-accent)] text-[var(--cb-accent)] font-semibold"
                : "border-transparent text-[var(--cb-text-secondary)] hover:text-white"
            }`}
          >
            <Boxes size={13} />
            <span>Ports</span>
            {totalPortsCount > 0 && (
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-white/10 text-[var(--cb-text-muted)]">
                {totalPortsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("params")}
            className={`h-9 px-3 border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === "params"
                ? "border-[var(--cb-accent)] text-[var(--cb-accent)] font-semibold"
                : "border-transparent text-[var(--cb-text-secondary)] hover:text-white"
            }`}
          >
            <Sliders size={13} />
            <span>Parameters</span>
            {totalParamsCount > 0 && (
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-white/10 text-[var(--cb-text-muted)]">
                {totalParamsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("code")}
            className={`h-9 px-3 border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === "code"
                ? "border-[var(--cb-accent)] text-[var(--cb-accent)] font-semibold"
                : "border-transparent text-[var(--cb-text-secondary)] hover:text-white"
            }`}
          >
            <Code2 size={13} />
            <span>Python Code</span>
          </button>
        </div>

        {/* ── Form Body: 16px Vertical Rhythm & 32px Shared Inputs ── */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4 text-[12px] select-text">
          {/* TAB 1: GENERAL */}
          {activeTab === "general" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="font-medium text-[var(--cb-text-secondary)]">
                    Display Name <span className="text-[var(--cb-accent)]">*</span>
                  </label>
                  <input
                    ref={firstFocusableRef}
                    type="text"
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="e.g. Text Sentiment Analyzer"
                    className="h-8 px-2.5 rounded-[var(--cb-radius-control)] bg-[var(--cb-elevation-raised)] border border-[var(--cb-border-subtle)] focus:border-[var(--cb-accent)] text-[var(--cb-text-primary)] placeholder-[var(--cb-text-muted)] outline-none transition-colors"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-medium text-[var(--cb-text-secondary)]">
                    Unique Block ID <span className="text-[var(--cb-accent)]">*</span>
                  </label>
                  <input
                    type="text"
                    value={id}
                    onChange={(e) => {
                      setId(e.target.value);
                      setIdManuallyEdited(true);
                    }}
                    placeholder="custom.sentiment_analyzer"
                    className={`h-8 px-2.5 rounded-[var(--cb-radius-control)] bg-[var(--cb-elevation-raised)] border font-mono text-[var(--cb-text-primary)] placeholder-[var(--cb-text-muted)] outline-none transition-colors ${
                      idError ? "border-rose-500/80 focus:border-rose-500" : "border-[var(--cb-border-subtle)] focus:border-[var(--cb-accent)]"
                    }`}
                  />
                  {idError && (
                    <span className="text-[10px] text-rose-400 flex items-center gap-1 mt-0.5">
                      <AlertCircle size={10} /> {idError}
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="font-medium text-[var(--cb-text-secondary)]">Category</label>
                  <Select
                    value={category}
                    onValueChange={(val) => setCategory(val as BlockCategory)}
                    options={CATEGORY_OPTIONS}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-medium text-[var(--cb-text-secondary)]">Version</label>
                  <input
                    type="text"
                    value={version}
                    onChange={(e) => setVersion(e.target.value)}
                    placeholder="0.1.0"
                    className="h-8 px-2.5 rounded-[var(--cb-radius-control)] bg-[var(--cb-elevation-raised)] border border-[var(--cb-border-subtle)] focus:border-[var(--cb-accent)] font-mono text-[var(--cb-text-primary)] placeholder-[var(--cb-text-muted)] outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-medium text-[var(--cb-text-secondary)]">Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Summarize what this block calculates or transforms..."
                  className="p-2.5 rounded-[var(--cb-radius-control)] bg-[var(--cb-elevation-raised)] border border-[var(--cb-border-subtle)] focus:border-[var(--cb-accent)] text-[var(--cb-text-primary)] placeholder-[var(--cb-text-muted)] outline-none transition-colors resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="font-medium text-[var(--cb-text-secondary)]">Author</label>
                  <input
                    type="text"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    placeholder="Your name or team"
                    className="h-8 px-2.5 rounded-[var(--cb-radius-control)] bg-[var(--cb-elevation-raised)] border border-[var(--cb-border-subtle)] focus:border-[var(--cb-accent)] text-[var(--cb-text-primary)] placeholder-[var(--cb-text-muted)] outline-none transition-colors"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-medium text-[var(--cb-text-secondary)]">Tags</label>
                  <div className="min-h-8 p-1 rounded-[var(--cb-radius-control)] bg-[var(--cb-elevation-raised)] border border-[var(--cb-border-subtle)] focus-within:border-[var(--cb-accent)] flex flex-wrap items-center gap-1">
                    {tags.map((t) => (
                      <span
                        key={t}
                        className="h-5 px-1.5 rounded-[var(--cb-radius-sm)] bg-white/10 text-[10px] font-mono text-[var(--cb-text-secondary)] flex items-center gap-1"
                      >
                        {t}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(t)}
                          className="hover:text-white cursor-pointer"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === ",") {
                          e.preventDefault();
                          handleAddTag();
                        }
                      }}
                      onBlur={handleAddTag}
                      placeholder={tags.length === 0 ? "Add tag + Enter..." : ""}
                      className="h-6 flex-1 min-w-[80px] bg-transparent text-[11px] text-[var(--cb-text-primary)] placeholder-[var(--cb-text-muted)] outline-none px-1"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PORTS */}
          {activeTab === "ports" && (
            <div className="space-y-4">
              {/* Inputs */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-cyan-400 text-[11px] uppercase tracking-wider">
                    Incoming Input Ports ({inputs.length})
                  </span>
                  <button
                    onClick={handleAddInput}
                    className="h-6 px-2 rounded-[var(--cb-radius-sm)] bg-cyan-950/40 hover:bg-cyan-900/60 text-cyan-300 border border-cyan-800/60 text-[11px] font-medium flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Plus size={11} />
                    <span>Add Input</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {inputs.map((inp, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-[var(--cb-radius-control)] bg-[var(--cb-elevation-raised)] border border-[var(--cb-border-subtle)] flex items-center gap-2"
                    >
                      <div className="flex-1 grid grid-cols-3 gap-2">
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] text-[var(--cb-text-muted)] font-mono">Port ID</span>
                          <input
                            type="text"
                            value={inp.id}
                            onChange={(e) => handleUpdateInput(idx, { id: e.target.value })}
                            className="h-7 px-2 rounded bg-[var(--cb-elevation-app)] border border-[var(--cb-border-subtle)] text-[11px] font-mono text-[var(--cb-text-primary)] outline-none focus:border-[var(--cb-accent)]"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] text-[var(--cb-text-muted)] font-mono">Label</span>
                          <input
                            type="text"
                            value={inp.name}
                            onChange={(e) => handleUpdateInput(idx, { name: e.target.value })}
                            className="h-7 px-2 rounded bg-[var(--cb-elevation-app)] border border-[var(--cb-border-subtle)] text-[11px] text-[var(--cb-text-primary)] outline-none focus:border-[var(--cb-accent)]"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] text-[var(--cb-text-muted)] font-mono">Type</span>
                          <Select
                            value={inp.type}
                            onValueChange={(val) => handleUpdateInput(idx, { type: val as PortType })}
                            options={PORT_TYPE_OPTIONS}
                            triggerClassName="h-7 text-[11px]"
                          />
                        </div>
                      </div>

                      <label className="flex items-center gap-1 cursor-pointer ml-1">
                        <input
                          type="checkbox"
                          checked={Boolean(inp.required)}
                          onChange={(e) => handleUpdateInput(idx, { required: e.target.checked })}
                          className="rounded text-[var(--cb-accent)]"
                        />
                        <span className="text-[10.5px] text-[var(--cb-text-muted)]">Req</span>
                      </label>

                      <button
                        onClick={() => handleRemoveInput(idx)}
                        className="p-1 rounded text-[var(--cb-text-muted)] hover:text-rose-400 hover:bg-rose-950/40 cursor-pointer transition-colors"
                        title="Remove port"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}

                  {inputs.length === 0 && (
                    <p className="text-center py-4 text-[11px] text-[var(--cb-text-muted)] italic">
                      No incoming ports defined.
                    </p>
                  )}
                </div>
              </div>

              {/* Outputs */}
              <div className="space-y-2 pt-2 border-t border-[var(--cb-border-subtle)]">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-emerald-400 text-[11px] uppercase tracking-wider">
                    Outgoing Output Ports ({outputs.length})
                  </span>
                  <button
                    onClick={handleAddOutput}
                    className="h-6 px-2 rounded-[var(--cb-radius-sm)] bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-800/60 text-[11px] font-medium flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Plus size={11} />
                    <span>Add Output</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {outputs.map((out, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-[var(--cb-radius-control)] bg-[var(--cb-elevation-raised)] border border-[var(--cb-border-subtle)] flex items-center gap-2"
                    >
                      <div className="flex-1 grid grid-cols-3 gap-2">
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] text-[var(--cb-text-muted)] font-mono">Port ID</span>
                          <input
                            type="text"
                            value={out.id}
                            onChange={(e) => handleUpdateOutput(idx, { id: e.target.value })}
                            className="h-7 px-2 rounded bg-[var(--cb-elevation-app)] border border-[var(--cb-border-subtle)] text-[11px] font-mono text-[var(--cb-text-primary)] outline-none focus:border-[var(--cb-accent)]"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] text-[var(--cb-text-muted)] font-mono">Label</span>
                          <input
                            type="text"
                            value={out.name}
                            onChange={(e) => handleUpdateOutput(idx, { name: e.target.value })}
                            className="h-7 px-2 rounded bg-[var(--cb-elevation-app)] border border-[var(--cb-border-subtle)] text-[11px] text-[var(--cb-text-primary)] outline-none focus:border-[var(--cb-accent)]"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] text-[var(--cb-text-muted)] font-mono">Type</span>
                          <Select
                            value={out.type}
                            onValueChange={(val) => handleUpdateOutput(idx, { type: val as PortType })}
                            options={PORT_TYPE_OPTIONS}
                            triggerClassName="h-7 text-[11px]"
                          />
                        </div>
                      </div>

                      <button
                        onClick={() => handleRemoveOutput(idx)}
                        className="p-1 rounded text-[var(--cb-text-muted)] hover:text-rose-400 hover:bg-rose-950/40 cursor-pointer transition-colors ml-1"
                        title="Remove output"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}

                  {outputs.length === 0 && (
                    <p className="text-center py-4 text-[11px] text-[var(--cb-text-muted)] italic">
                      No outgoing ports defined.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PARAMETERS */}
          {activeTab === "params" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-[var(--cb-text-primary)] text-[12px]">Configurable Parameters</h4>
                  <p className="text-[11px] text-[var(--cb-text-muted)]">
                    Exposed in Properties Inspector when this block is selected on the canvas.
                  </p>
                </div>
                <button
                  onClick={handleAddParam}
                  className="h-6 px-2.5 rounded-[var(--cb-radius-sm)] bg-white/10 hover:bg-white/15 text-white text-[11px] font-medium flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Plus size={11} />
                  <span>Add Parameter</span>
                </button>
              </div>

              <div className="space-y-2">
                {params.map((p, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-[var(--cb-radius-control)] bg-[var(--cb-elevation-raised)] border border-[var(--cb-border-subtle)] grid grid-cols-4 gap-2 items-center"
                  >
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-[var(--cb-text-muted)] font-mono">Variable Key</span>
                      <input
                        type="text"
                        value={p.key}
                        onChange={(e) => handleUpdateParam(idx, { key: e.target.value })}
                        placeholder="e.g. learning_rate"
                        className="h-7 px-2 rounded bg-[var(--cb-elevation-app)] border border-[var(--cb-border-subtle)] text-[11px] font-mono text-[var(--cb-text-primary)] outline-none focus:border-[var(--cb-accent)]"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-[var(--cb-text-muted)] font-mono">Label</span>
                      <input
                        type="text"
                        value={p.label}
                        onChange={(e) => handleUpdateParam(idx, { label: e.target.value })}
                        placeholder="e.g. Learning Rate"
                        className="h-7 px-2 rounded bg-[var(--cb-elevation-app)] border border-[var(--cb-border-subtle)] text-[11px] text-[var(--cb-text-primary)] outline-none focus:border-[var(--cb-accent)]"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-[var(--cb-text-muted)] font-mono">Type</span>
                      <Select
                        value={p.type}
                        onValueChange={(val) =>
                          handleUpdateParam(idx, { type: val as BlockConfigField["type"] })
                        }
                        options={PARAM_TYPE_OPTIONS}
                        triggerClassName="h-7 text-[11px]"
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="flex-1 flex flex-col gap-1">
                        <span className="text-[10px] text-[var(--cb-text-muted)] font-mono">Default</span>
                        <input
                          type="text"
                          value={p.defaultValue}
                          onChange={(e) => handleUpdateParam(idx, { defaultValue: e.target.value })}
                          className="h-7 px-2 rounded bg-[var(--cb-elevation-app)] border border-[var(--cb-border-subtle)] text-[11px] font-mono text-[var(--cb-text-primary)] outline-none focus:border-[var(--cb-accent)]"
                        />
                      </div>
                      <button
                        onClick={() => handleRemoveParam(idx)}
                        className="p-1 rounded text-[var(--cb-text-muted)] hover:text-rose-400 hover:bg-rose-950/40 cursor-pointer transition-colors mt-4"
                        title="Remove parameter"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}

                {params.length === 0 && (
                  <p className="text-center py-4 text-[11px] text-[var(--cb-text-muted)] italic">
                    No custom parameters defined.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: PYTHON CODE */}
          {activeTab === "code" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-[var(--cb-text-primary)] text-[12px]">Executable Python Logic</h4>
                  <p className="text-[11px] text-[var(--cb-text-muted)]">
                    Inputs are in <code className="text-cyan-400 font-mono">inputs[...]</code>, outputs in{" "}
                    <code className="text-emerald-400 font-mono">outputs[...]</code>.
                  </p>
                </div>

                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-[var(--cb-text-muted)] mr-1">Templates:</span>
                  <button
                    onClick={() => setPythonCode(CODE_TEMPLATES.transform)}
                    className="h-6 px-2 rounded bg-white/5 hover:bg-white/10 text-[10.5px] text-[var(--cb-text-secondary)] hover:text-white transition-colors cursor-pointer"
                  >
                    Data
                  </button>
                  <button
                    onClick={() => setPythonCode(CODE_TEMPLATES.model)}
                    className="h-6 px-2 rounded bg-white/5 hover:bg-white/10 text-[10.5px] text-[var(--cb-text-secondary)] hover:text-white transition-colors cursor-pointer"
                  >
                    Model
                  </button>
                  <button
                    onClick={() => setPythonCode(CODE_TEMPLATES.metric)}
                    className="h-6 px-2 rounded bg-white/5 hover:bg-white/10 text-[10.5px] text-[var(--cb-text-secondary)] hover:text-white transition-colors cursor-pointer"
                  >
                    Metric
                  </button>
                </div>
              </div>

              <textarea
                rows={12}
                value={pythonCode}
                onChange={(e) => setPythonCode(e.target.value)}
                className="w-full bg-[var(--cb-elevation-raised)] border border-[var(--cb-border-subtle)] focus:border-[var(--cb-accent)] rounded-[var(--cb-radius-control)] p-3 font-mono text-[11.5px] text-emerald-300 outline-none leading-relaxed resize-none"
                spellCheck={false}
              />
            </div>
          )}
        </div>

        {/* ── Footer: Draft Status & Primary Action ── */}
        <div className="h-12 px-6 border-t border-[var(--cb-border-subtle)] flex items-center justify-between bg-[var(--cb-elevation-raised)] shrink-0">
          {/* Left: Validation/Draft status */}
          <div className="flex items-center gap-2 text-[11px]">
            {issues.length > 0 ? (
              <span className="text-amber-400 flex items-center gap-1.5 font-medium">
                <AlertCircle size={12} />
                <span>Draft • {issues.length} {issues.length === 1 ? "issue" : "issues"}</span>
              </span>
            ) : (
              <span className="text-emerald-400 flex items-center gap-1.5 font-medium">
                <Check size={12} />
                <span>Ready to save</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="h-7 px-3 rounded-[var(--cb-radius-control)] border border-[var(--cb-border-subtle)] hover:bg-white/10 text-[var(--cb-text-secondary)] hover:text-white text-[12px] font-medium transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={issues.length > 0}
              className="h-7 px-4 rounded-[var(--cb-radius-control)] bg-[var(--cb-accent)] hover:bg-[var(--cb-accent-hover)] disabled:opacity-40 disabled:cursor-not-allowed text-white text-[12px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
            >
              <span>{editBlockId ? "Update Block" : "Save Block"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
