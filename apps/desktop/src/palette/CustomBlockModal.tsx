import { useState, useEffect } from "react";
import type { BlockDefinition, PortDefinition, PortType, BlockConfigField, BlockCategory } from "@codebrix/types";
import { useCustomBlockStore } from "../stores/customBlockStore";

interface CustomBlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  editBlockId?: string | null;
  initialTemplate?: "transform" | "model" | "metric" | null;
  onBlockSaved?: (block: BlockDefinition) => void;
}

const PORT_TYPES: PortType[] = [
  "dataframe",
  "series",
  "model",
  "number",
  "string",
  "scalar",
  "boolean",
  "array",
  "file",
  "figure",
  "dict",
  "any",
];

const CATEGORIES: Array<{ value: BlockCategory; label: string }> = [
  { value: "custom", label: "Custom (User-Defined)" },
  { value: "data", label: "Data I/O & Storage" },
  { value: "preprocessing", label: "Preprocessing & Cleaning" },
  { value: "ml", label: "Machine Learning" },
  { value: "evaluation", label: "Evaluation & Metrics" },
  { value: "visualization", label: "Visualization" },
  { value: "core", label: "Core Control" },
];

const CODE_TEMPLATES = {
  transform: `# ── Custom Data Transform ──
# Incoming inputs: inputs["dataset_in"] (pandas.DataFrame)
# Config values: config["method"]
df = inputs.get("dataset_in", pd.DataFrame()).copy()

# Your custom data transformation logic here:
print(f"Processing DataFrame with {len(df)} rows...")
outputs["dataset_out"] = df
`,
  model: `# ── Custom ML Model ──
# Incoming inputs: inputs["train_data_in"] (pandas.DataFrame)
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
# Access any port via inputs["port_id"]
# Assign outputs via outputs["port_id"] = result
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
  const [tags, setTags] = useState("");

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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isImportJsonOpen, setIsImportJsonOpen] = useState(false);
  const [importJsonText, setImportJsonText] = useState("");

  const addCustomBlock = useCustomBlockStore((s) => s.addCustomBlock);
  const updateCustomBlock = useCustomBlockStore((s) => s.updateCustomBlock);
  const getCustomBlock = useCustomBlockStore((s) => s.getCustomBlock);
  const getPythonCode = useCustomBlockStore((s) => s.getPythonCode);

  // Populate state if editing existing block or using a template
  useEffect(() => {
    if (editBlockId) {
      const existing = getCustomBlock(editBlockId);
      if (existing) {
        setName(existing.name);
        setId(existing.id);
        setCategory(existing.category || "custom");
        setVersion(existing.version || "0.1.0");
        setDescription(existing.description || "");
        setAuthor(existing.author || "");
        setTags((existing.tags || []).join(", "));
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
    } else if (initialTemplate === "model") {
      setName("Custom ML Classifier");
      setId("custom.my_classifier");
      setCategory("ml");
      setVersion("0.1.0");
      setDescription("Custom supervised classification model using ExtraTreesClassifier.");
      setAuthor("");
      setTags("custom, ml, classifier, supervised");
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
      setTags("custom, eval, metric, score");
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
      // Defaults for new generic/transform block
      setName(initialTemplate === "transform" ? "Custom Data Transform" : "");
      setId(initialTemplate === "transform" ? "custom.data_transform" : "");
      setCategory(initialTemplate === "transform" ? "preprocessing" : "custom");
      setVersion("0.1.0");
      setDescription(initialTemplate === "transform" ? "Transforms input DataFrame and outputs processed dataset." : "");
      setAuthor("");
      setTags("custom, ml, data");
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
    setErrorMessage(null);
  }, [editBlockId, initialTemplate, isOpen, getCustomBlock, getPythonCode]);

  // Auto-slugify ID when name changes (only in create mode)
  const handleNameChange = (val: string) => {
    setName(val);
    if (!editBlockId) {
      const slug = val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
      setId(slug ? `custom.${slug}` : "");
    }
  };

  // Add / Remove Ports
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

  // Add / Remove Config Parameters
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

  // Save Block
  const handleSave = () => {
    setErrorMessage(null);

    const cleanName = name.trim();
    const cleanId = id.trim();

    if (!cleanName) {
      setErrorMessage("Please enter a block display name.");
      setActiveTab("general");
      return;
    }

    if (!cleanId) {
      setErrorMessage("Please enter a unique Block ID.");
      setActiveTab("general");
      return;
    }

    if (inputs.length === 0 && outputs.length === 0) {
      setErrorMessage("The block must declare at least one input or output port.");
      setActiveTab("ports");
      return;
    }

    // Check unique port IDs
    const portIds = new Set<string>();
    for (const inp of inputs) {
      if (!inp.id.trim()) {
        setErrorMessage("All input ports must have a non-empty ID.");
        setActiveTab("ports");
        return;
      }
      if (portIds.has(inp.id)) {
        setErrorMessage(`Duplicate port ID: "${inp.id}". Port IDs must be unique.`);
        setActiveTab("ports");
        return;
      }
      portIds.add(inp.id);
    }
    for (const out of outputs) {
      if (!out.id.trim()) {
        setErrorMessage("All output ports must have a non-empty ID.");
        setActiveTab("ports");
        return;
      }
      if (portIds.has(out.id)) {
        setErrorMessage(`Duplicate port ID: "${out.id}". Port IDs must be unique.`);
        setActiveTab("ports");
        return;
      }
      portIds.add(out.id);
    }

    // Build configSchema
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

    // Embed pythonCode into configSchema default if desired
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
      tags: tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
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

  // Import JSON handler
  const handleImportJson = () => {
    try {
      const parsed = JSON.parse(importJsonText);
      const def: BlockDefinition = parsed.definition || parsed;

      if (!def.id || !def.name) {
        throw new Error("Missing 'id' or 'name' in JSON.");
      }

      setName(def.name);
      setId(def.id);
      setCategory(def.category || "custom");
      setVersion(def.version || "0.1.0");
      setDescription(def.description || "");
      setAuthor(def.author || "");
      setTags((def.tags || []).join(", "));
      if (def.inputs) setInputs(def.inputs);
      if (def.outputs) setOutputs(def.outputs);

      if (parsed.pythonCode) {
        setPythonCode(parsed.pythonCode);
      } else if (def.configSchema?.customCode?.defaultValue) {
        setPythonCode(String(def.configSchema.customCode.defaultValue));
      }

      setIsImportJsonOpen(false);
      setErrorMessage(null);
    } catch (err) {
      setErrorMessage(`Invalid JSON: ${(err as Error).message}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="bg-[#0b0e15]/95 border border-white/10 rounded-2xl w-full max-w-2xl shadow-[0_24px_60px_-10px_rgba(0,0,0,0.85),inset_0_1px_0_0_rgba(255,255,255,0.1)] flex flex-col max-h-[90vh] overflow-hidden text-slate-100 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-black/40">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 via-orange-600 to-rose-600 border border-amber-300/30 flex items-center justify-center text-white text-xs font-mono font-bold shadow-[0_0_12px_rgba(245,158,11,0.4)]">
              CB
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight">
                {editBlockId ? "Edit Custom Block" : "Create Custom Block Studio"}
              </h2>
              <p className="text-[11px] text-slate-400">
                Design custom ML nodes with typed ports, properties, and Python code
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsImportJsonOpen(!isImportJsonOpen)}
              className="text-[11px] px-3 py-1 rounded-lg bg-black/40 hover:bg-white/10 text-slate-300 border border-white/10 transition-colors"
            >
              Import JSON
            </button>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors text-xs"
            >
              ×
            </button>
          </div>
        </div>

        {/* JSON Import Drawer */}
        {isImportJsonOpen && (
          <div className="p-4 bg-slate-950 border-b border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-300 font-medium">
              <span>Paste Custom Block JSON:</span>
              <button
                onClick={() => setIsImportJsonOpen(false)}
                className="text-[10px] text-slate-500 hover:text-slate-300"
              >
                Close
              </button>
            </div>
            <textarea
              rows={4}
              value={importJsonText}
              onChange={(e) => setImportJsonText(e.target.value)}
              placeholder='{ "definition": { "id": "custom.my_block", "name": "My Block", ... } }'
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
            />
            <button
              onClick={handleImportJson}
              className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-medium transition-colors"
            >
              Load into Form
            </button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 px-6 bg-slate-950/30 text-xs font-medium">
          <button
            onClick={() => setActiveTab("general")}
            className={`py-2.5 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === "general"
                ? "border-indigo-500 text-indigo-400 font-semibold"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            General
          </button>
          <button
            onClick={() => setActiveTab("ports")}
            className={`py-2.5 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === "ports"
                ? "border-indigo-500 text-indigo-400 font-semibold"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            Ports ({inputs.length + outputs.length})
          </button>
          <button
            onClick={() => setActiveTab("params")}
            className={`py-2.5 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === "params"
                ? "border-indigo-500 text-indigo-400 font-semibold"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            Parameters ({params.length})
          </button>
          <button
            onClick={() => setActiveTab("code")}
            className={`py-2.5 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === "code"
                ? "border-indigo-500 text-indigo-400 font-semibold"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            Python Code
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {errorMessage && (
            <div className="p-3 bg-rose-950/60 border border-rose-800/80 rounded-lg text-rose-300 text-xs flex items-center gap-2">
              <span className="font-bold text-rose-400">!</span>
              <span>{errorMessage}</span>
            </div>
          )}

          {/* TAB 1: GENERAL */}
          {activeTab === "general" && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Block Name *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="e.g. Text Sentiment Analyzer"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Unique Block ID *</label>
                  <input
                    type="text"
                    value={id}
                    onChange={(e) => setId(e.target.value)}
                    placeholder="custom.sentiment_analyzer"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 font-mono text-slate-300 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as BlockCategory)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Version</label>
                  <input
                    type="text"
                    value={version}
                    onChange={(e) => setVersion(e.target.value)}
                    placeholder="0.1.0"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 font-mono text-slate-300 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Summarize what this block calculates or transforms..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Author</label>
                  <input
                    type="text"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    placeholder="Your name or team"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Tags (comma-separated)</label>
                  <input
                    type="text"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="nlp, sentiment, text, transform"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PORTS */}
          {activeTab === "ports" && (
            <div className="space-y-6 text-xs">
              {/* Input Ports */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-cyan-400 uppercase tracking-wider text-[11px]">
                    Incoming Input Ports ({inputs.length})
                  </span>
                  <button
                    onClick={handleAddInput}
                    className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-800/60 text-[11px] font-medium"
                  >
                    + Add Input Port
                  </button>
                </div>

                <div className="space-y-2">
                  {inputs.map((inp, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center gap-2"
                    >
                      <div className="flex-1 grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-[10px] text-slate-500 block mb-0.5">Port ID</label>
                          <input
                            type="text"
                            value={inp.id}
                            onChange={(e) => handleUpdateInput(idx, { id: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 font-mono text-slate-200"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500 block mb-0.5">Display Label</label>
                          <input
                            type="text"
                            value={inp.name}
                            onChange={(e) => handleUpdateInput(idx, { name: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500 block mb-0.5">Data Type</label>
                          <select
                            value={inp.type}
                            onChange={(e) => handleUpdateInput(idx, { type: e.target.value as PortType })}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 font-mono text-cyan-400"
                          >
                            {PORT_TYPES.map((t) => (
                              <option key={t} value={t}>
                                {t}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <label className="flex items-center gap-1.5 cursor-pointer ml-2">
                        <input
                          type="checkbox"
                          checked={Boolean(inp.required)}
                          onChange={(e) => handleUpdateInput(idx, { required: e.target.checked })}
                          className="rounded bg-slate-900 border-slate-700 text-indigo-600"
                        />
                        <span className="text-[11px] text-slate-400">Req</span>
                      </label>

                      <button
                        onClick={() => handleRemoveInput(idx)}
                        className="text-slate-500 hover:text-rose-400 p-1.5 rounded transition-colors ml-1"
                        title="Remove port"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  {inputs.length === 0 && (
                    <p className="text-slate-500 italic p-3 text-center bg-slate-950/40 rounded-xl">
                      No input ports. This block will act as a source / generator.
                    </p>
                  )}
                </div>
              </div>

              {/* Output Ports */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-emerald-400 uppercase tracking-wider text-[11px]">
                    Outgoing Output Ports ({outputs.length})
                  </span>
                  <button
                    onClick={handleAddOutput}
                    className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-800/60 text-[11px] font-medium"
                  >
                    + Add Output Port
                  </button>
                </div>

                <div className="space-y-2">
                  {outputs.map((out, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center gap-2"
                    >
                      <div className="flex-1 grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-[10px] text-slate-500 block mb-0.5">Port ID</label>
                          <input
                            type="text"
                            value={out.id}
                            onChange={(e) => handleUpdateOutput(idx, { id: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 font-mono text-slate-200"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500 block mb-0.5">Display Label</label>
                          <input
                            type="text"
                            value={out.name}
                            onChange={(e) => handleUpdateOutput(idx, { name: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500 block mb-0.5">Data Type</label>
                          <select
                            value={out.type}
                            onChange={(e) => handleUpdateOutput(idx, { type: e.target.value as PortType })}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 font-mono text-emerald-400"
                          >
                            {PORT_TYPES.map((t) => (
                              <option key={t} value={t}>
                                {t}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <button
                        onClick={() => handleRemoveOutput(idx)}
                        className="text-slate-500 hover:text-rose-400 p-1.5 rounded transition-colors ml-1"
                        title="Remove port"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  {outputs.length === 0 && (
                    <p className="text-slate-500 italic p-3 text-center bg-slate-950/40 rounded-xl">
                      No output ports. This block will act as a terminal sink / exporter.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PARAMETERS */}
          {activeTab === "params" && (
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-slate-200">Properties Panel Config Fields</h4>
                  <p className="text-[11px] text-slate-500">
                    Configurable parameters that appear in the Properties sidebar when clicked.
                  </p>
                </div>
                <button
                  onClick={handleAddParam}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-indigo-800/60 font-medium"
                >
                  + Add Parameter
                </button>
              </div>

              <div className="space-y-2">
                {params.map((p, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl grid grid-cols-4 gap-2 items-center"
                  >
                    <div>
                      <label className="text-[10px] text-slate-500 block mb-0.5">Variable Key</label>
                      <input
                        type="text"
                        value={p.key}
                        onChange={(e) => handleUpdateParam(idx, { key: e.target.value })}
                        placeholder="e.g. learning_rate"
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 font-mono text-slate-200"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 block mb-0.5">Label</label>
                      <input
                        type="text"
                        value={p.label}
                        onChange={(e) => handleUpdateParam(idx, { label: e.target.value })}
                        placeholder="e.g. Learning Rate"
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 block mb-0.5">Field Type</label>
                      <select
                        value={p.type}
                        onChange={(e) =>
                          handleUpdateParam(idx, { type: e.target.value as BlockConfigField["type"] })
                        }
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 font-mono text-slate-300"
                      >
                        <option value="string">string</option>
                        <option value="number">number</option>
                        <option value="boolean">boolean</option>
                        <option value="select">select</option>
                        <option value="slider">slider</option>
                        <option value="file">file</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="flex-1">
                        <label className="text-[10px] text-slate-500 block mb-0.5">Default Value</label>
                        <input
                          type="text"
                          value={p.defaultValue}
                          onChange={(e) => handleUpdateParam(idx, { defaultValue: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 font-mono text-slate-300"
                        />
                      </div>
                      <button
                        onClick={() => handleRemoveParam(idx)}
                        className="text-slate-500 hover:text-rose-400 p-1.5 rounded transition-colors mt-3"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}

                {params.length === 0 && (
                  <p className="text-slate-500 italic p-3 text-center bg-slate-950/40 rounded-xl">
                    No custom parameters defined. Click "+ Add Parameter" to add one.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: PYTHON CODE */}
          {activeTab === "code" && (
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-slate-200">Executable Python Logic</h4>
                  <p className="text-[11px] text-slate-500">
                    Script executed in subprocess. Inputs are in `inputs[...]`, outputs in `outputs[...]`.
                  </p>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-slate-500">Templates:</span>
                  <button
                    onClick={() => setPythonCode(CODE_TEMPLATES.transform)}
                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px]"
                  >
                    Data
                  </button>
                  <button
                    onClick={() => setPythonCode(CODE_TEMPLATES.model)}
                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px]"
                  >
                    Model
                  </button>
                  <button
                    onClick={() => setPythonCode(CODE_TEMPLATES.metric)}
                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px]"
                  >
                    Metric
                  </button>
                </div>
              </div>

              <div className="relative">
                <textarea
                  rows={14}
                  value={pythonCode}
                  onChange={(e) => setPythonCode(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl p-3 font-mono text-xs text-emerald-300 focus:outline-none focus:border-indigo-500 leading-relaxed shadow-inner"
                  spellCheck={false}
                />
              </div>

              <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl space-y-1 text-[11px] text-slate-400">
                <div className="font-semibold text-slate-300">Available Variable Bindings:</div>
                <div>• <code className="text-cyan-300">inputs["port_id"]</code>: Input data received from connected nodes.</div>
                <div>• <code className="text-emerald-300">outputs["port_id"] = result</code>: Values emitted to downstream nodes.</div>
                <div>• <code className="text-amber-300">config["param_name"]</code>: Values configured in Properties Panel.</div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 border-t border-white/10 flex items-center justify-between bg-black/40">
          <div className="text-[11px] text-slate-500 font-mono">
            {editBlockId ? `Editing ${editBlockId}` : "New custom block"}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 text-xs font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-1.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs font-semibold transition-all shadow-lg shadow-amber-950/60 flex items-center gap-1.5 cursor-pointer"
            >
              <span>{editBlockId ? "Update Block" : "Save & Register Block"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
