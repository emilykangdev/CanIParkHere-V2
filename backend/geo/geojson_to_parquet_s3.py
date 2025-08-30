#!/usr/bin/env python3
import sys
import tempfile
import boto3
import geopandas as gpd

def geojson_to_parquet_s3(
    input_geojson_path: str,
    s3_uri: str,
    drop_columns=None,
    aws_profile=None
):
    """
    Convert a GeoJSON in EPSG:3857 to Parquet in EPSG:4326,
    drop duplicate columns, and upload to S3.

    Parameters
    ----------
    input_geojson_path : str
        Path to input GeoJSON (likely in EPSG:3857)
    s3_uri : str
        Target S3 URI, e.g., s3://bucket/folder/file.parquet
    drop_columns : list[str], optional
        Columns to drop explicitly
    aws_profile : str, optional
        AWS CLI profile to use
    """
    # Read GeoJSON
    gdf = gpd.read_file(input_geojson_path)

    # Reproject to WGS84 (lat/lon)
    gdf = gdf.to_crs(epsg=4326)

    # Drop duplicate columns (case-insensitive)
    cols_lower = [c.lower() for c in gdf.columns]
    duplicates = set([c for c in cols_lower if cols_lower.count(c) > 1])
    if duplicates:
        print(f"Dropping duplicate columns (case-insensitive): {duplicates}")
        gdf = gdf.loc[:, ~cols_lower.count]

    # Drop additional columns if requested
    if drop_columns:
        gdf = gdf.drop(columns=drop_columns, errors="ignore")

    # Write temporary Parquet
    with tempfile.NamedTemporaryFile(suffix=".parquet") as tmp:
        gdf.to_parquet(tmp.name, engine="pyarrow", index=False)
        print(f"Local clean Parquet written: {tmp.name}")

        # Parse S3 URI
        if not s3_uri.startswith("s3://"):
            raise ValueError("S3 URI must start with s3://")
        _, path = s3_uri[5:].split("/", 1)
        bucket = s3_uri[5:].split("/", 1)[0]
        key = path

        # Setup boto3 client
        if aws_profile:
            session = boto3.Session(profile_name=aws_profile)
            s3 = session.client("s3")
        else:
            s3 = boto3.client("s3")

        # Upload Parquet
        s3.upload_file(tmp.name, bucket, key)
        print(f"Uploaded clean Parquet to {s3_uri}")

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python geojson_to_parquet_s3.py <input_geojson> <s3_uri>")
        sys.exit(1)

    input_geojson = sys.argv[1]
    s3_uri = sys.argv[2]
    geojson_to_parquet_s3(input_geojson, s3_uri)
