import { describe, it, expect } from "vitest";
import { validatePropertyValue } from "./propertyValidation";
import type { BlockConfigField } from "@codebrix/types";

describe("propertyValidation", () => {
  it("validates required fields", () => {
    const schema: BlockConfigField = {
      name: "filepath",
      label: "File Path",
      type: "string",
      required: true,
    };

    expect(validatePropertyValue("", schema)).toBe("File Path is required");
    expect(validatePropertyValue(null, schema)).toBe("File Path is required");
    expect(validatePropertyValue("valid/path.csv", schema)).toBeNull();
  });

  it("validates number min and max constraints", () => {
    const schema: BlockConfigField = {
      name: "test_size",
      label: "Test Size",
      type: "number",
      min: 0.1,
      max: 0.9,
    };

    expect(validatePropertyValue("abc", schema)).toBe("Must be a valid number");
    expect(validatePropertyValue(0.05, schema)).toBe("Value must be at least 0.1");
    expect(validatePropertyValue(0.95, schema)).toBe("Value must be at most 0.9");
    expect(validatePropertyValue(0.2, schema)).toBeNull();
  });

  it("validates select options membership", () => {
    const schema: BlockConfigField = {
      name: "method",
      label: "Scaling Method",
      type: "select",
      options: [
        { label: "Standard", value: "standard" },
        { label: "MinMax", value: "minmax" },
      ],
    };

    expect(validatePropertyValue("standard", schema)).toBeNull();
    expect(validatePropertyValue("invalid_opt", schema)).toBe("Selected option is invalid");
  });

  it("allows non-required empty values", () => {
    const schema: BlockConfigField = {
      name: "notes",
      label: "Notes",
      type: "string",
      required: false,
    };

    expect(validatePropertyValue("", schema)).toBeNull();
  });
});
