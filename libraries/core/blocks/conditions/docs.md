# Condition Block (`core.conditions`)

## Overview
The **Condition** block evaluates a logical comparison between an input variable and a threshold or comparison value. It outputs a boolean result suitable for filtering, routing, and conditional branching.

## Inputs
- **Input** (`any`): The primary value to test.
- **Compare With** (`any`, optional): Secondary value to compare against. If disconnected, uses the configured threshold.

## Outputs
- **Condition Result** (`boolean`): Boolean outcome (`True` / `False`).
- **If True** (`any`): Input value passed through if condition is met.
- **If False** (`any`): Input value passed through if condition is not met.

## Configuration Options
- **Operator** (`select`): Comparison operator (`==`, `!=`, `>`, `>=`, `<`, `<=`, `is not None`, `is None`).
- **Threshold / Value** (`string`): Fallback constant comparison operand.
