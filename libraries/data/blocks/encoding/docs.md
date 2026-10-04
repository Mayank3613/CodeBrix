# Categorical Encoder Block (`data.encoder`)

Converts categorical text variables into numerical formats suitable for machine learning algorithms.

## Inputs
- **Input DataFrame** (`dataframe`): Source dataset containing categorical or string columns.

## Outputs
- **Encoded DataFrame** (`dataframe`): Transformed dataset with numerical encodings.

## Configuration
- **Encoding Method** (`method`):
  - `onehot`: One-Hot Encoding using `pandas.get_dummies` (binary indicator columns).
  - `label`: Integer label encoding (0 to N-1).
  - `ordinal`: Ordinal encoding for ordered categorical features.
- **Target Columns** (`columns`): Comma-separated column list or `auto` for all string/object/categorical columns.
- **Drop First Category** (`dropFirst`): Drops the first binary column to avoid collinearity in linear models (one-hot only).
