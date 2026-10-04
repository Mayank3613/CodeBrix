# Feature Scaler Block (`data.scaler`)

Transforms numeric columns using `scikit-learn.preprocessing` estimators: `StandardScaler`, `MinMaxScaler`, or `RobustScaler`.

## Inputs
- **Input DataFrame** (`dataframe`): Source dataset with numerical attributes.

## Outputs
- **Scaled DataFrame** (`dataframe`): Transformed dataset with normalized features.

## Configuration
- **Scaling Method** (`method`):
  - `standard`: Mean = 0, Standard Deviation = 1 (Z-Score).
  - `minmax`: Scales values to range `[0, 1]`.
  - `robust`: Median and Interquartile Range (outlier-resilient).
- **Features to Scale** (`features`): Comma-separated column list or `all` to transform all numerical features.
