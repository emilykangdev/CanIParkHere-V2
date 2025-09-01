import geopandas as gpd
from shapely.geometry import Point
import matplotlib.pyplot as plt
import boto3
import time
import os
from dotenv import load_dotenv
import os, time

load_dotenv()

def _validate_lat_lon(lat: float, lon: float):
    """Ensure lat/lon are in valid ranges and not swapped."""
    if not (-90 <= lat <= 90 and -180 <= lon <= 180):
        raise ValueError(
            f"Invalid lat/lon: ({lat}, {lon}). "
            "Lat must be between -90 and 90, Lon between -180 and 180."
        )
    # Heuristic: if abs(lat) > abs(lon), likely swapped
    if abs(lat) > 90 or abs(lon) > 180:
        raise ValueError(
            f"Possible lat/lon swap detected: ({lat}, {lon}). "
            "Expected (lat, lon) format."
        )

def parse_athena_results(result, numeric_fields=None):
    """
    Convert Athena get_query_results response into a list of dicts.
    Optionally convert specified numeric fields to float.

    Parameters
    ----------
    result : dict
        Raw response from athena_client.get_query_results
    numeric_fields : list of str, optional
        List of columns to convert to float.

    Returns
    -------
    List[dict]
    """
    if numeric_fields is None:
        numeric_fields = []

    cols = [c["Label"] for c in result["ResultSet"]["ResultSetMetadata"]["ColumnInfo"]]
    rows = []
    for r in result["ResultSet"]["Rows"][1:]:  # skip header row
        row_dict = {col: val.get("VarCharValue") if "VarCharValue" in val else None
                    for col, val in zip(cols, r["Data"])}

        # Convert numeric fields
        for k in numeric_fields:
            if row_dict.get(k) is not None:
                try:
                    row_dict[k] = float(row_dict[k])
                except ValueError:
                    row_dict[k] = None

        rows.append(row_dict)

    return rows

def normalize_feature_coords(feature):
    """
    Ensure feature has 'lat' and 'lng' keys from 'shape_lat' and 'shape_lng'.
    Return None if coordinates are missing.
    """
    lat = feature.get("shape_lat")
    lng = feature.get("shape_lng")
    if not lat or not lng:
        print(f"Missing coordinates in feature: {feature}")
        return None
    return {
        "lat": float(lat),
        "lng": float(lng),
        **feature
    }

def get_signs_nearby(lat, lon, athena_client, radius_meters=500, debug=False, top_n=10):


    db_name = os.getenv("AWS_DB_SIG")
    table_name = os.getenv("AWS_TABLE_SIG")
    output_location = os.getenv("AWS_ATHENA_OUTPUT")

    query = f"""
    WITH input_point AS (
        SELECT ST_Point({lon}, {lat}) AS geom
    )
    SELECT
        s.*,
        ST_Distance(ST_Point(s.shape_lng, s.shape_lat), ip.geom) * 111139 AS distance_m
    FROM "AwsDataCatalog"."{db_name}"."{table_name}" s
    CROSS JOIN input_point ip
    WHERE ST_Distance(ST_Point(s.shape_lng, s.shape_lat), ip.geom) * 111139 <= {radius_meters}
    ORDER BY distance_m
    LIMIT {top_n};
    """

    if debug:
        print("Athena query:", query)

    response = athena_client.start_query_execution(
        QueryString=query,
        QueryExecutionContext={"Database": db_name},
        ResultConfiguration={"OutputLocation": output_location},
    )

    execution_id = response["QueryExecutionId"]

    while True:
        status = athena_client.get_query_execution(QueryExecutionId=execution_id)
        state = status["QueryExecution"]["Status"]["State"]
        if state in ("SUCCEEDED", "FAILED", "CANCELLED"):
            break
        time.sleep(1)

    if state != "SUCCEEDED":
        raise RuntimeError(f"Athena query failed with state {state}")

    result = athena_client.get_query_results(QueryExecutionId=execution_id)

    rows = parse_athena_results(result, numeric_fields=["SHAPE_LAT", "SHAPE_LNG", "distance_m"])
    normalized = [normalize_feature_coords(r) for r in rows if normalize_feature_coords(r) is not None]
    return normalized


def public_parking_nearby(lat: float, lon: float, athena_client, radius_meters: float = 50, top_n: int = 10, debug=False):
    """Return public parking lots/garages within radius_meters of given lat/lon using Athena."""
    _validate_lat_lon(lat, lon)

    db_name = os.getenv("AWS_DB_PUB")
    table_name = os.getenv("AWS_TABLE_PUB")
    output_location = os.getenv("AWS_ATHENA_OUTPUT")

    query = f"""
    WITH user_point AS (
        SELECT to_spherical_geography(ST_Point({lon}, {lat})) AS geom
    )
    SELECT
        pg.*,
        ST_X(ST_Centroid(ST_GeomFromBinary(pg.geometry))) AS lng,
        ST_Y(ST_Centroid(ST_GeomFromBinary(pg.geometry))) AS lat,
        ST_Distance(
            to_spherical_geography(ST_Centroid(ST_GeomFromBinary(pg.geometry))),
            up.geom
        ) AS distance_m
    FROM "AwsDataCatalog"."public_parking_garages_lots_db"."public_garages_and_parking_lots" pg
    CROSS JOIN user_point up
    WHERE ST_Distance(
            to_spherical_geography(ST_Centroid(ST_GeomFromBinary(pg.geometry))),
            up.geom
        ) <= {radius_meters}
    ORDER BY distance_m ASC
    LIMIT {top_n};
    """

    response = athena_client.start_query_execution(
        QueryString=query,
        QueryExecutionContext={"Database": db_name},
        ResultConfiguration={"OutputLocation": output_location},
    )

    execution_id = response["QueryExecutionId"]

    # Wait for query completion
    while True:
        status = athena_client.get_query_execution(QueryExecutionId=execution_id)
        state = status["QueryExecution"]["Status"]["State"]
        if state in ("SUCCEEDED", "FAILED", "CANCELLED"):
            break
        time.sleep(1)

    if state != "SUCCEEDED":
        raise RuntimeError(f"Athena query failed with state {state}")

    # Get results
    result = athena_client.get_query_results(QueryExecutionId=execution_id)

    # print(f"Athena query result: {result}")

    # Specify which fields should be numeric
    numeric_fields = ["distance_m", "dea_stalls", "vacant", "regionid"]
    rows = parse_athena_results(result, numeric_fields=numeric_fields)

    print(f"Parsed rows of length={len(rows)}: {rows}")
    print(f"Parsed rows length is {len(rows)}")

    return rows


