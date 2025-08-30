import pandas as pd
import pyarrow as pa
import pyarrow.parquet as pq
import json
import sys

if len(sys.argv) != 3:
    print("Usage: python convert_geojson_to_parquet_clean.py input.json output.parquet")
    sys.exit(1)

input_file = sys.argv[1]
output_file = sys.argv[2]

# --- Load GeoJSON ---
with open(input_file) as f:
    geojson = json.load(f)

# --- Flatten features into DataFrame ---
rows = []
for feature in geojson["features"]:
    props = feature["properties"]
    geom = feature["geometry"]
    # Assuming POINT geometries
    lng, lat = geom["coordinates"]
    props["shape_lat"] = lat
    props["shape_lng"] = lng
    rows.append(props)

df = pd.DataFrame(rows)

# --- Remove duplicate columns (case-insensitive) ---
seen = set()
unique_cols = []
for col in df.columns:
    lower = col.lower()
    if lower not in seen:
        unique_cols.append(col)
        seen.add(lower)
df = df[unique_cols]

# Optional: reorder columns (geometry last)
cols = [c for c in df.columns if c not in ("shape_lat", "shape_lng")] + ["shape_lat", "shape_lng"]
df = df[[c for c in cols if c in df.columns]]  # only keep columns that exist

# --- Convert to Parquet ---
table = pa.Table.from_pandas(df)
pq.write_table(table, output_file, compression="SNAPPY")

print(f"Clean Parquet file ready: {output_file}")
