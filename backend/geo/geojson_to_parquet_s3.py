#!/usr/bin/env python3
import sys
import tempfile
import boto3
import geopandas as gpd

def geojson_to_parquet_s3(input_geojson_path, s3_uri, drop_columns=None, aws_profile=None):
    """
    Convert a GeoJSON (EPSG:3857) to Parquet (EPSG:4326),
    drop duplicate or unneeded columns, and upload to S3.
    """
    # Load GeoJSON
    gdf = gpd.read_file(input_geojson_path)

    # Reproject to WGS84
    gdf = gdf.to_crs(epsg=4326)

    # Drop duplicate columns (case-insensitive)
    seen = set()
    keep_cols = []
    for c in gdf.columns:
        cl = c.lower()
        if cl not in seen:
            seen.add(cl)
            keep_cols.append(c)
    gdf = gdf[keep_cols]

    # Drop specified columns
    if drop_columns:
        gdf = gdf.drop(columns=drop_columns, errors="ignore")

    # Parse S3 URI
    if not s3_uri.startswith("s3://"):
        raise ValueError("S3 URI must start with s3://")
    s3_path = s3_uri[5:]
    bucket, key = s3_path.split("/", 1)

    # Upload to S3
    session = boto3.Session(profile_name=aws_profile) if aws_profile else boto3.Session()
    s3 = session.client("s3")

    with tempfile.NamedTemporaryFile(suffix=".parquet") as tmp:
        gdf.to_parquet(tmp.name, engine="pyarrow", index=False)
        print(f"Parquet written locally: {tmp.name}")
        s3.upload_file(tmp.name, bucket, key)
        print(f"Uploaded to {s3_uri}")

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python geojson_to_parquet_s3.py <input_geojson> <s3_uri>")
        sys.exit(1)

    geojson_to_parquet_s3(sys.argv[1], sys.argv[2], drop_columns=["SE_ANNO_CAD_DATA"])
