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


def public_parking_nearby(lat: float, lon: float, radius_meters: float = 50, debug=False, top_n: int = 10):
    """Return public parking lots/garages within radius_meters of given lat/lon."""
    _validate_lat_lon(lat, lon)

    # Create point in EPSG:4326 and project to EPSG:3857 for meter-based distance
    pt = gpd.GeoSeries([Point(lon, lat)], crs="EPSG:4326").to_crs(epsg=3857)

    # Calculate distances in meters
    distances = public_parking_data_3857.distance(pt.iloc[0])

    # Filter by radius
    nearby = public_parking_data_3857[distances <= radius_meters].copy()

    # Add distance column
    nearby["distance_m"] = distances[distances <= radius_meters]

    # Sort by distance
    nearby = nearby.sort_values("distance_m")

    if debug:
        print(f"Found {len(nearby)} public parking facilities within {radius_meters}m.")
        print(nearby[["distance_m"]].head())

    # Return as list of dicts in EPSG:4326 with distance included
    return nearby.to_crs(epsg=4326).to_dict("records")


# def get_parking_street(lat: float, lon: float, radius_meters: float = 20, debug=False, top_n: int = 10):
#     """Return street parking segments within radius_meters of given lat/lon."""
#     _validate_lat_lon(lat, lon)

#     pt = gpd.GeoSeries([Point(lon, lat)], crs="EPSG:4326").to_crs(epsg=3857)

#     distances = street_parking_data_3857.distance(pt.iloc[0])
#     nearby = street_parking_data_3857[distances <= radius_meters]

#     if debug:
#         print(f"Found {len(nearby)} street parking segments nearby.")

#     return nearby.to_crs(epsg=4326).to_dict("records")


