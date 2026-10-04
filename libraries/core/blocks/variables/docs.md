# Variable Block (`core.variables`)

## Overview
The **Variable** block defines a static or dynamically overridden scalar variable (number, string, boolean, or JSON object) for use across downstream workflow blocks.

## Inputs
- **Input Override** (`any`, optional): Dynamic value from an upstream block that overrides the configured default value.

## Outputs
- **Value** (`any`): The typed variable value.

## Configuration Options
- **Variable Name** (`string`): The variable name in generated Python code.
- **Variable Type** (`select`): Choose between `number`, `string`, `boolean`, or `json`.
- **Value** (`string`): The literal value representation.
