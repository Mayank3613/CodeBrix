# Loop Block

The **Loop** block enables iterative computation and repetitive execution in CodeBrix pipelines.

## Modes

1. **Range (Fixed Count)**: Iterates from `0` to `iterations - 1` or dynamic count limit.
2. **For Each (Collection)**: Iterates over elements in an input collection or list.
3. **While (Conditional)**: Runs while a condition predicate holds true.

## Ports

### Inputs
- `collection_in` (array): Optional input list to iterate through.
- `count_in` (number): Optional iteration count limit overriding configuration.

### Outputs
- `item_out` (any): Value of current element in iteration.
- `index_out` (number): 0-indexed loop step counter.
- `accumulated_out` (array): Resulting list aggregated across all iterations.
