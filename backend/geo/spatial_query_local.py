import geopandas as gpd
from shapely.geometry import Point
import matplotlib.pyplot as plt

# Load datasets at startup
# Note: these file paths are from the main.py's perspective, so the uvicorn command is run from the root of the backend folder. thus, dont' do ../
# rpz_data = gpd.read_file("data/rpz_areas_4326.geojson").to_crs(epsg=4326)
public_parking_data = gpd.read_file(
    "./data/public_garages_and_parking_lots_20250807.geojson"
).to_crs(epsg=4326)

sdot_street_signs_data = gpd.read_file(
    "./data/sdot_street_signs_3857.geojson"
).to_crs(epsg=4326)

street_parking_data = gpd.read_file(
    "./data/street_parking_20250807.geojson"
).to_crs(epsg=4326)

# Pre-project to EPSG:3857 for distance calculations
sdot_street_signs_data_3857 = gpd.read_file("./data/sdot_street_signs_3857.geojson")
print(f"SDOT street signs CRS: {sdot_street_signs_data_3857.crs}")
street_parking_data_3857 = street_parking_data.to_crs(epsg=3857)
public_parking_data_3857 = public_parking_data.to_crs(epsg=3857)
# rpz_data_3857 = rpz_data.to_crs(epsg=3857)

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


def get_signs_nearby(lat: float, lon: float, radius_meters: float = 500, debug=False, top_n = 10):
    """Return parking signs within radius_meters of given lat/lon."""
    _validate_lat_lon(lat, lon)

    pt = gpd.GeoSeries([Point(lon, lat)], crs="EPSG:4326").to_crs(epsg=3857)

    # ax = sdot_street_signs_data_3857.plot(figsize=(8, 8), color="blue", markersize=5)
    # pt.plot(ax=ax, color="red", markersize=50)
    # plt.show()

    print("Signs CRS:", sdot_street_signs_data_3857.crs)
    print("Point CRS:", pt.crs)
    distances = sdot_street_signs_data_3857.distance(pt.iloc[0])
    min_idx = distances.idxmin()
    print(f"Closest sign is {distances[min_idx]:.2f} m away")
    nearby = sdot_street_signs_data_3857[distances <= radius_meters].copy()
    nearby["distance_m"] = distances[distances <= radius_meters]

    nearby = nearby.sort_values("distance_m")

    if debug:
        print(f"Found {len(nearby)} signs within {radius_meters}m of ({lat}, {lon})")
    
    # print(f"Nearby signs: {nearby.head(top_n)}")
    return nearby.to_crs(epsg=4326).to_dict("records")


def get_parking_street(lat: float, lon: float, radius_meters: float = 20, debug=False, top_n: int = 10):
    """Return street parking segments within radius_meters of given lat/lon."""
    _validate_lat_lon(lat, lon)

    pt = gpd.GeoSeries([Point(lon, lat)], crs="EPSG:4326").to_crs(epsg=3857)

    distances = street_parking_data_3857.distance(pt.iloc[0])
    nearby = street_parking_data_3857[distances <= radius_meters]

    if debug:
        print(f"Found {len(nearby)} street parking segments nearby.")

    return nearby.to_crs(epsg=4326).to_dict("records")


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


# def get_rpz_zone(lat: float, lon: float):
#     """Return RPZ (Residential Parking Zone) polygons containing the given point."""
#     _validate_lat_lon(lat, lon)

#     pt = gpd.GeoSeries([Point(lon, lat)], crs="EPSG:4326")
#     matching = rpz_data[rpz_data.contains(pt.iloc[0])]

#     return matching.to_dict("records")


# Optional: category lookup if you have categories_data loaded
# def get_parking_category(lat: float, lon: float):
#     _validate_lat_lon(lat, lon)
#     pt = gpd.GeoSeries([Point(lon, lat)], crs="EPSG:4326")
#     matching = categories_data[categories_data.contains(pt.iloc[0])]
#     return matching.to_dict("records")