/**
 * Library Manifest contract definitions.
 * Version: 0.1.0
 */

/**
 * Manifest describing an extensible block library package.
 * Each library directory contains a `library.json` file adhering to this schema.
 */
export interface LibraryManifest {
  /** Unique name of the library (e.g. 'core', 'data', 'scikit-learn', 'visualization') */
  name: string;
  /** Semantic version string (e.g. '0.1.0') */
  version: string;
  /** Human-readable description of what the library provides */
  description: string;
  /** Author or maintainer of the library */
  author?: string;
  /**
   * List of block entrypoint files or block IDs included in this library.
   * Typically relative paths like "blocks/csv/block.js" or "blocks/variables/block.js".
   */
  blocks: string[];
  /** Optional Python or system dependencies required by this library */
  dependencies?: Record<string, string>;
  /** Optional homepage or repository URL */
  homepage?: string;
  /** Optional license (e.g. 'MIT') */
  license?: string;
}

/**
 * Discovered library metadata with disk location.
 */
export interface DiscoveredLibrary {
  manifest: LibraryManifest;
  path: string;
  isBuiltIn: boolean;
  enabled: boolean;
}
