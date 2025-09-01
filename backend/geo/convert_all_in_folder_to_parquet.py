#!/usr/bin/env python3
import json
import pandas as pd
from pathlib import Path

# Config
input_folder = Path("/Users/emilykang/Documents/Projects/caniparkhere-v2/backend/data/used")  # folder containing JSON files
output_folder = Path("/Users/emilykang/Documents/Projects/caniparkhere-v2/backend/data/parquet_output")
output_folder.mkdir(parents=True, exist_ok=True)

# Iterate over JSON files
for json_file in input_folder.glob("*.json"):
    print(f"Processing {json_file.name}...")

    # Load JSON
    with open(json_file, "r") as f:
        try:
            data = json.load(f)
        except json.JSONDecodeError as e:
            print(f"  ❌ Failed to parse {json_file.name}: {e}")
            continue

    # Flatten JSON to table if nested
    df = pd.json_normalize(data)

    # Save to Parquet
    parquet_file = output_folder / f"{json_file.stem}.parquet"
    df.to_parquet(parquet_file, engine="pyarrow", index=False)
    print(f"  ✅ Saved {parquet_file.name}")