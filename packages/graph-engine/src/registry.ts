import type { BlockDefinition } from "@codebrix/types";

/**
 * BlockDefinitionRegistry: A lookup service that maps block definition IDs
 * to their full BlockDefinition metadata.
 *
 * The validator and codegen layers use this to resolve ports, config schemas,
 * and dependencies for each block instance placed on the canvas.
 */
export class BlockDefinitionRegistry {
  private readonly definitions = new Map<string, BlockDefinition>();

  /**
   * Register a single block definition.
   * @throws if a definition with the same ID is already registered.
   */
  register(definition: BlockDefinition): void {
    if (this.definitions.has(definition.id)) {
      throw new Error(
        `BlockDefinition "${definition.id}" is already registered. ` +
          `Use replace() to overwrite.`
      );
    }
    this.definitions.set(definition.id, definition);
  }

  /**
   * Register multiple block definitions at once.
   */
  registerMany(definitions: BlockDefinition[]): void {
    for (const def of definitions) {
      this.register(def);
    }
  }

  /**
   * Replace an existing definition (for hot-reload or versioning).
   */
  replace(definition: BlockDefinition): void {
    this.definitions.set(definition.id, definition);
  }

  /**
   * Retrieve a block definition by its unique ID.
   * @returns The BlockDefinition, or undefined if not found.
   */
  get(definitionId: string): BlockDefinition | undefined {
    return this.definitions.get(definitionId);
  }

  /**
   * Check if a definition ID is registered.
   */
  has(definitionId: string): boolean {
    return this.definitions.has(definitionId);
  }

  /**
   * Return all registered definitions.
   */
  getAll(): BlockDefinition[] {
    return Array.from(this.definitions.values());
  }

  /**
   * Return all registered definition IDs.
   */
  getAllIds(): string[] {
    return Array.from(this.definitions.keys());
  }

  /**
   * Get the number of registered definitions.
   */
  get size(): number {
    return this.definitions.size;
  }

  /**
   * Remove a definition by ID.
   */
  unregister(definitionId: string): boolean {
    return this.definitions.delete(definitionId);
  }

  /**
   * Clear all registered definitions.
   */
  clear(): void {
    this.definitions.clear();
  }
}
