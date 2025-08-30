import json

with open("../data/sdot_street_signs_3857.geojson") as f:
    data = json.load(f)

for feature in data["features"]:
    keys = [k.lower() for k in feature["properties"].keys()]
    if len(keys) != len(set(keys)):
        print("Duplicate keys:", feature["properties"])
