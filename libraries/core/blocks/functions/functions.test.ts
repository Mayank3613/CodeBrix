import { describe, it, expect } from "vitest";
import { functionsBlockDefinition } from "./block";
import { generatePython } from "./generate";
import { isValidBlockDefinition } from "@codebrix/shared";

describe("Functions Block (D1-4.5 Stretch)", () => {
  it("conforms strictly to the BlockDefinition contract", () => {
    expect(isValidBlockDefinition(functionsBlockDefinition)).toBe(true);
    expect(functionsBlockDefinition.id).toBe("core.functions");
    expect(functionsBlockDefinition.category).toBe("core");
    expect(functionsBlockDefinition.outputs.some((p) => p.id === "return_val")).toBe(true);
  });

  it("generates correct Python function definition and invocation", () => {
    const code = generatePython(
      {
        functionName: "double_val",
        parameters: "x",
        returnExpr: "x * 2",
        docstring: "Multiplies input by 2.",
      },
      {
        outputVarName: "scaled_output",
        inputVarNames: { input_arg: "feature_col" },
      }
    );

    expect(code).toContain("def double_val(x):");
    expect(code).toContain('"""Multiplies input by 2."""');
    expect(code).toContain("return x * 2");
    expect(code).toContain("scaled_output = double_val(feature_col)");
  });

  it("handles secondary input arguments", () => {
    const code = generatePython(
      {
        functionName: "add_offset",
        parameters: "a, b",
        returnExpr: "a + b",
      },
      {
        outputVarName: "sum_res",
        inputVarNames: { input_arg: "val1", secondary_arg: "val2" },
      }
    );

    expect(code).toContain("def add_offset(a, b):");
    expect(code).toContain("return a + b");
    expect(code).toContain("sum_res = add_offset(val1, val2)");
  });
});
