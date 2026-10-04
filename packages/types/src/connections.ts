/**
 * Connection: A directed edge connecting an output port of a source block
 * to an input port of a target block.
 */
export interface Connection {
  /** Unique connection identifier */
  id: string;
  /** Source block UUID */
  sourceBlockId: string;
  /** ID of output port on source block */
  sourcePortId: string;
  /** Target block UUID */
  targetBlockId: string;
  /** ID of input port on target block */
  targetPortId: string;
}

/**
 * Neutral connection format matching React Flow edge properties.
 */
export interface FlowEdgeData {
  connectionId: string;
  sourceType?: string;
  targetType?: string;
  isValid?: boolean;
}
