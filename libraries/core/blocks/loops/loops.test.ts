import { describe, it, expect } from "vitest";
import { loopsBlockDefinition } from "./block";
import { generatePython } from "./generate";
import { isValidBlockDefinition } from "@codebrix/shared";

describe("Loops Block (D1-4.5 Stretch)", () => {
  it("conforms strictly to the BlockDefinition contract", () => {
    expect(isValidBlockDefinition(loopsBlockDefinition)).toBe(true);
    expect(loopsBlockDefinition.id).toBe("core.loops");
    expect(loopsBlockDefinition.category).toBe("core");
    expect(loopsBlockDefinition.outputs.some((p) => p.id === "accumulated_out")).toBe(true);
  });

  it("generates range loop code with static iterations count", () => {
    const code = generatePython(
      { loopType: "range", iterations: 10, itemName: "step" },
      { outputVarName: "steps_list" }
    );

    expect(code).toContain("for idx in range(int(10)):");
    expect(code).toContain("step = idx");
    expect(code).toContain("steps_list.append(step)");
  });

  it("generates for-each loop over connected collection", () => {
    const code = generatePython(
      { loopType: "for_each", itemName: "sample" },
      {
        outputVarName: "processed_samples",
        inputVarNames: { collection_in: "raw_dataset" },
      }
    );

    expect(code).toContain("for idx, sample in enumerate(raw_dataset):");
    expect(code).toContain("processed_samples.append(sample)");
  });

  it("supports dynamic count override from input", () => {
    const code = generatePython(
      { loopType: "range", itemName: "epoch" },
      {
        outputVarName: "epoch_losses",
        inputVarNames: { count_in: "max_epochs_var" },
      }
    );

    expect(code).toContain("for idx in range(int(max_epochs_var)):");
  });
});
