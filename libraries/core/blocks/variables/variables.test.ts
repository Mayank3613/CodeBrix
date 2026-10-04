import { describe, it, expect } from "vitest";
import { variablesBlockDefinition } from "./block";
import { generatePython } from "./generate";
import { isValidBlockDefinition } from "@codebrix/shared";

describe("Variables Block (D1-3.5)", () => {
  it("conforms strictly to the BlockDefinition contract", () => {
    expect(isValidBlockDefinition(variablesBlockDefinition)).toBe(true);
    expect(variablesBlockDefinition.id).toBe("core.variables");
    expect(variablesBlockDefinition.category).toBe("core");
    expect(variablesBlockDefinition.outputs[0]?.type).toBe("any");
  });

  it("generates correct Python code for number variable", () => {
    const code = generatePython({
      varName: "alpha_rate",
      varType: "number",
      varValue: "0.05",
    });

    expect(code).toContain("alpha_rate = 0.05");
  });

  it("generates correct Python code for boolean and string variables", () => {
    const boolCode = generatePython({
      varName: "is_enabled",
      varType: "boolean",
      varValue: "true",
    });
    expect(boolCode).toContain("is_enabled = True");

    const strCode = generatePython({
      varName: "model_mode",
      varType: "string",
      varValue: "classification",
    });
    expect(strCode).toContain('model_mode = "classification"');
  });

  it("handles input override when provided", () => {
    const code = generatePython(
      { varName: "dynamic_val", varType: "number", varValue: "10" },
      {
        outputVarName: "dynamic_val",
        inputVarNames: { input_val: "upstream_output" },
      }
    );
    expect(code).toContain("dynamic_val = upstream_output");
  });
});
