import type {
  BlockDefinition,
  BlockCategory,
  PortType,
} from "@codebrix/types";
import { isValidBlockDefinition, isCompatiblePortType } from "@codebrix/shared";

export class BlockRegistryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BlockRegistryError";
  }
}

export class DuplicateBlockError extends BlockRegistryError {
  constructor(public readonly blockId: string) {
    super(`Block definition with ID "${blockId}" is already registered.`);
    this.name = "DuplicateBlockError";
  }
}

export class InvalidBlockDefinitionError extends BlockRegistryError {
  constructor(public readonly details: string) {
    super(`Invalid block definition: ${details}`);
    this.name = "InvalidBlockDefinitionError";
  }
}

/**
 * BlockRegistry maintains the catalogue of loaded BlockDefinitions.
 * It strictly validates all definitions on registration and provides
 * category, search, and port-compatibility queries.
 */
export class BlockRegistry {
  private readonly blocks = new Map<string, BlockDefinition>();

  /**
   * Register a new block definition.
   * Throws InvalidBlockDefinitionError if malformed.
   * Throws DuplicateBlockError if duplicate id.
   */
  public register(definition: BlockDefinition): void {
    if (!isValidBlockDefinition(definition)) {
      throw new InvalidBlockDefinitionError(
        `Definition must have id, name, category, version, inputs array, and outputs array.`
      );
    }

    if (this.blocks.has(definition.id)) {
      throw new DuplicateBlockError(definition.id);
    }

    this.blocks.set(definition.id, Object.freeze({ ...definition }));
  }

  /**
   * Retrieve a block definition by its ID.
   */
  public get(id: string): BlockDefinition | undefined {
    return this.blocks.get(id);
  }

  /**
   * Check if a block definition is registered.
   */
  public has(id: string): boolean {
    return this.blocks.has(id);
  }

  /**
   * List all registered block definitions.
   */
  public list(): BlockDefinition[] {
    return Array.from(this.blocks.values());
  }

  /**
   * List block definitions filtered by category.
   */
  public listByCategory(category: BlockCategory): BlockDefinition[] {
    return this.list().filter((b) => b.category === category);
  }

  /**
   * Search registered blocks by keyword in name, description, id, or tags.
   */
  public search(query: string): BlockDefinition[] {
    const q = query.trim().toLowerCase();
    if (!q) return this.list();

    return this.list().filter((b) => {
      if (b.name.toLowerCase().includes(q)) return true;
      if (b.description.toLowerCase().includes(q)) return true;
      if (b.id.toLowerCase().includes(q)) return true;
      if (b.tags?.some((t) => t.toLowerCase().includes(q))) return true;
      return false;
    });
  }

  /**
   * Validate port connection compatibility between two port types
   * using the shared contract compatibility map.
   */
  public checkPortCompatibility(sourceType: PortType, targetType: PortType): boolean {
    return isCompatiblePortType(sourceType, targetType);
  }

  /**
   * Validate a block's instance configuration against its definition's configSchema.
   */
  public validateConfig(
    definitionId: string,
    config: Record<string, unknown>
  ): { valid: boolean; errors: string[] } {
    const def = this.get(definitionId);
    if (!def) {
      return { valid: false, errors: [`Unknown block definition "${definitionId}"`] };
    }

    const errors: string[] = [];
    const schema = def.configSchema || {};

    for (const [fieldName, fieldSchema] of Object.entries(schema)) {
      const val = config[fieldName];

      // Check required
      if (fieldSchema.required && (val === undefined || val === null || val === "")) {
        errors.push(`Field "${fieldSchema.label || fieldName}" is required.`);
        continue;
      }

      if (val === undefined || val === null) {
        continue;
      }

      // Check types
      switch (fieldSchema.type) {
        case "string":
        case "file":
          if (typeof val !== "string") {
            errors.push(`Field "${fieldSchema.label || fieldName}" must be a string.`);
          }
          break;
        case "number":
        case "slider":
          if (typeof val !== "number" || isNaN(val)) {
            errors.push(`Field "${fieldSchema.label || fieldName}" must be a valid number.`);
          } else {
            if (fieldSchema.min !== undefined && val < fieldSchema.min) {
              errors.push(`Field "${fieldSchema.label || fieldName}" must be >= ${fieldSchema.min}.`);
            }
            if (fieldSchema.max !== undefined && val > fieldSchema.max) {
              errors.push(`Field "${fieldSchema.label || fieldName}" must be <= ${fieldSchema.max}.`);
            }
          }
          break;
        case "boolean":
          if (typeof val !== "boolean") {
            errors.push(`Field "${fieldSchema.label || fieldName}" must be a boolean.`);
          }
          break;
        case "select":
          if (fieldSchema.options) {
            const validValues = fieldSchema.options.map((o) => o.value);
            if (!validValues.includes(val)) {
              errors.push(`Field "${fieldSchema.label || fieldName}" has invalid option.`);
            }
          }
          break;
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Clear all registered block definitions.
   */
  public clear(): void {
    this.blocks.clear();
  }
}

// Global default singleton registry instance
export const blockRegistry = new BlockRegistry();
