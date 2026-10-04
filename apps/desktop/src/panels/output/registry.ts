import type { ComponentType } from "react";
import type { ExecutionResult, OutputMessage } from "@codebrix/types";
import type { RunState } from "../../stores/executionStore";

export type OutputRendererType =
  | "console"
  | "table"
  | "metrics"
  | "image"
  | "plotly"
  | "error"
  | string;

export interface RendererProps<T extends OutputMessage = OutputMessage> {
  messages: T[];
  latestMessage?: T;
  executionResult?: ExecutionResult | null;
  runState?: RunState;
  statusMessage?: string | null;
  onClear?: () => void;
}

export type OutputRendererComponent<T extends OutputMessage = OutputMessage> = ComponentType<RendererProps<T>>;

/**
 * OutputRendererRegistry provides a decoupled plugin seam for Developer 2's renderers
 * (Console, Table, Metrics, Image, Plotly) to register into Developer 1's output container.
 */
class OutputRendererRegistry {
  private readonly renderers = new Map<string, OutputRendererComponent<OutputMessage>>();

  /**
   * Register a component to render a specific output message type or channel.
   */
  registerRenderer<T extends OutputMessage = OutputMessage>(
    type: OutputRendererType,
    component: OutputRendererComponent<T>
  ): void {
    this.renderers.set(
      type.toLowerCase(),
      component as unknown as OutputRendererComponent<OutputMessage>
    );
  }

  /**
   * Retrieve a registered renderer component by type.
   */
  getRenderer<T extends OutputMessage = OutputMessage>(
    type: OutputRendererType
  ): OutputRendererComponent<T> | undefined {
    return this.renderers.get(type.toLowerCase()) as
      | OutputRendererComponent<T>
      | undefined;
  }

  /**
   * Checks if a renderer exists for the given type.
   */
  hasRenderer(type: OutputRendererType): boolean {
    return this.renderers.has(type.toLowerCase());
  }

  /**
   * Returns a list of all currently registered renderer types.
   */
  getRegisteredTypes(): string[] {
    return Array.from(this.renderers.keys());
  }

  /**
   * Clears all registered renderers (useful for testing).
   */
  clear(): void {
    this.renderers.clear();
  }
}

export const outputRendererRegistry = new OutputRendererRegistry();

/**
 * Convenience export adhering to seam 10 contract: registerRenderer(type, component)
 */
export function registerRenderer<T extends OutputMessage = OutputMessage>(
  type: OutputRendererType,
  component: OutputRendererComponent<T>
): void {
  outputRendererRegistry.registerRenderer(type, component);
}
