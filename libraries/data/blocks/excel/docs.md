# Excel Loader Block (`data.excel_loader`)

Reads tabular data from an Excel workbook (`.xlsx`, `.xls`) using `pandas.read_excel()` and the `openpyxl` engine.

## Inputs
- None (Source block)

## Outputs
- **DataFrame** (`dataframe`): Loaded pandas DataFrame.

## Configuration
- **Excel File Path** (`filePath`): Path to the Excel workbook file.
- **Sheet Name** (`sheetName`): Name or index of the worksheet to read (defaults to `Sheet1`).
- **Header Row Index** (`headerRow`): Zero-indexed row number containing column names.
