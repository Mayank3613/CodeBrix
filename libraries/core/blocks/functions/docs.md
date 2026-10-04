# Function Block

The **Function** block allows declaring and executing custom Python functions with configured arguments and return expressions.

## Parameters

- **Function Name**: Python identifier for the function (e.g. `normalize_feature`).
- **Parameters**: Comma-separated formal parameter names (e.g. `x`, `x, scale=1.0`).
- **Return Expression**: The Python expression evaluated and returned.
- **Docstring**: Embedded Python docstring description.

## Ports

### Inputs
- `input_arg` (any): Primary argument passed into the function call.
- `secondary_arg` (any): Optional second argument.

### Outputs
- `return_val` (any): Return value from the function invocation.
