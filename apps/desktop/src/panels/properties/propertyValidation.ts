import type { BlockConfigField } from "@codebrix/types";

/**
 * Validates a property input value against its schema definition.
 * Returns null if valid, or a descriptive error message string if invalid.
 */
export function validatePropertyValue(
  value: unknown,
  schema: BlockConfigField
): string | null {
  // Check required
  if (schema.required) {
    if (value === undefined || value === null || value === "") {
      return `${schema.label || schema.name} is required`;
    }
  }

  // If value is empty and not required, it is valid
  if (value === undefined || value === null || value === "") {
    return null;
  }

  switch (schema.type) {
    case "number":
    case "slider": {
      const num = typeof value === "number" ? value : Number(value);
      if (isNaN(num)) {
        return "Must be a valid number";
      }
      if (schema.min !== undefined && num < schema.min) {
        return `Value must be at least ${schema.min}`;
      }
      if (schema.max !== undefined && num > schema.max) {
        return `Value must be at most ${schema.max}`;
      }
      return null;
    }

    case "select": {
      if (schema.options && schema.options.length > 0) {
        const strVal = String(value);
        const match = schema.options.some((opt) => String(opt.value) === strVal);
        if (!match) {
          return "Selected option is invalid";
        }
      }
      return null;
    }

    case "file": {
      if (typeof value !== "string" || value.trim() === "") {
        if (schema.required) {
          return "File path is required";
        }
      }
      return null;
    }

    case "string": {
      if (typeof value !== "string") {
        return "Must be text";
      }
      return null;
    }

    case "boolean":
      return null;

    default:
      return null;
  }
}
