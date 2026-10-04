# CSV Loader Block

Reads tabular data from a CSV file into a pandas DataFrame.

## Outputs
- **DataFrame (`dataset_out`)**: Port type `dataframe`. The parsed tabular data.

## Configuration
- **File Path (`filePath`)**: Relative or absolute path to the `.csv` file.
- **Delimiter (`delimiter`)**: Delimiter character (default: `,`).
- **Has Header (`hasHeader`)**: Boolean flag whether line 0 is the header row.
