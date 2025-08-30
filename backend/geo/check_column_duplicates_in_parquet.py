import pyarrow.parquet as pq
from collections import Counter

# Path to your Parquet file
parquet_file = "../data/SDOT_STREET_SIGNS.parquet"

# Read Parquet schema
table = pq.read_table(parquet_file)
columns = table.schema.names

# Check for duplicates (case-insensitive)
lower_cols = [c.lower() for c in columns]
duplicates = [item for item, count in Counter(lower_cols).items() if count > 1]

if duplicates:
    print("Duplicate columns found (case-insensitive):", duplicates)
else:
    print("No duplicate columns found in the Parquet file.")
