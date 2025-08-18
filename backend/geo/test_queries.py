from spatial_query_local import get_signs_nearby, get_parking_street, public_parking_nearby
import geopandas as gpd

if __name__ == "__main__":
    # expects lat, lon format
    lat, lon = 47.6128, -122.3457
    signs_nearby = get_signs_nearby(lat=lat, lon=lon, radius_meters=100)
    # your_street_parking = get_parking_street(lat=lat, lon=lon, radius_meters=30)
    parking_nearby = public_parking_nearby(lat=lat, lon=lon, radius_meters=500)
    
    print(f"Here is a small list of parking signs near you: {signs_nearby[:3]}")
    # print(f"Here is a small list of street parking segments near you: {your_street_parking[:2]}")
    print(f"Here is a small list of public parking facilities near you: {parking_nearby[:10]}")