import { describe, it, expect } from "vitest";
import { conditionsBlockDefinition } from "./block";
import { generatePython } from "./generate";
import { isValidBlockDefinition } from "@codebrix/shared";

describe("Conditions Block (D1-3.5)", () => {
  it("conforms strictly to the BlockDefinition contract", () => {
    expect(isValidBlockDefinition(conditionsBlockDefinition)).toBe(true);
    expect(conditionsBlockDefinition.id).toBe("core.conditions");
    expect(conditionsBlockDefinition.category).toBe("core");
    expect(conditionsBlockDefinition.outputs[0]?.type).toBe("boolean");
  });

  it("generates correct Python code with threshold operand", () => {
    const code = generatePython(
      { operator: ">", threshold: "0.5" },
      { outputVarName: "is_high_accuracy", inputVarNames: { input_val: "accuracy" } }
    );

    expect(code).toContain("is_high_accuracy = bool(accuracy > 0.5)");
  });

  it("generates correct Python code with secondary input operand", () => {
    const code = generatePython(
      { operator: "==" },
      {
        outputVarName: "is_match",
        inputVarNames: { input_val: "y_true", compare_val: "y_pred" },
      }
    );

    expect(code).toContain("is_match = bool(y_true == y_pred)");
  });

  it("handles is not None operator", () => {
    const code = generatePython(
      { operator: "is not None" },
      { outputVarName: "exists", inputVarNames: { input_val: "dataset" } }
    );

    expect(code).toContain("exists = dataset is not None");
  });
});
