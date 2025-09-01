from geo.spatial_query_api import get_signs_nearby, public_parking_nearby
from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Body, Request
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
import base64
import os
from openai import OpenAI
import json
import uuid
import re
import requests 
import firebase_admin
from firebase_admin import credentials
import boto3
from botocore.exceptions import ClientError

from message_types import (
    ParkingCheckResponse,
    ParkingSearchResponse,
    LocationCheckResponse,
    ParkingSearchRequest,
    FollowUpRequest, 
    FollowUpResponse
)
from dotenv import load_dotenv
load_dotenv()


app = FastAPI(title="CanIParkHere API", version="2.0.0")

# Add CORS middleware for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001", 
        "https://caniparkhere.dev",
        "https://caniparkhere.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# single source of truth dictionary - mapped to actual database categories
parking_signs = {
    "Paid Parking": ["PR", "PPP", "PPL", "PPEAK"],
    "Time Limited Parking": ["PTIML", "PTRKL"],
    "Parking Zone": ["PZONE", "PRZ", "PBZ"],
    "General Parking Sign": ["PS"],
    "General Business Parking": ["GBP"]
}

# Reverse mapping for quick lookup
code_to_desc = {code: desc for desc, codes in parking_signs.items() for code in codes}

store = {}

try:
    service_account_info = json.loads(os.environ.get("FIREBASE_SERVICE_ACCOUNT", "{}"))
    if service_account_info:
        cred = credentials.Certificate(service_account_info)
        firebase_admin.initialize_app(cred)
        print("Firebase initialized")
    else:
        print("FIREBASE_SERVICE_ACCOUNT not set, skipping Firebase initialization")
except Exception as e:
    print(f"Warning: Firebase initialization failed: {e}")

# Initialize OpenAI client (conditional for API generation)
client = None
try:
    if os.getenv("OPENAI_API_KEY"):
        client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
except Exception as e:
    print(f"Warning: OpenAI client initialization failed: {e}")
    print("Server will start but image processing will be disabled")

# Initialize s3 and athena client
s3_client = None
athena_client = None
try:
    # Get S3 credentials from environment variables
    aws_access_key_id = os.getenv("AWS_ACCESS_KEY_ID")
    aws_secret_access_key = os.getenv("AWS_SECRET_ACCESS_KEY")
    aws_region = os.getenv("AWS_REGION", "us-west-2")
    
    if aws_access_key_id and aws_secret_access_key:
        s3_client = boto3.client(
            's3',
            aws_access_key_id=aws_access_key_id,
            aws_secret_access_key=aws_secret_access_key,
            region_name=aws_region
        )
        print("s3 client initialized successfully")

        athena_client = boto3.client(
            'athena',
            aws_access_key_id=aws_access_key_id,
            aws_secret_access_key=aws_secret_access_key,
            region_name=aws_region
        )
        print("athena client initialized successfully")
    else:
        print("Warning: AWS credentials not found")
except Exception as e:
    print(f"Warning: S3/Athena client initialization failed: {e}")

##### SANITY CHECK CONFIRM YOUR CREDENTIALS ARE WORKING ###### 
try:
    sts = boto3.client(
        "sts",
        aws_access_key_id=aws_access_key_id,
        aws_secret_access_key=aws_secret_access_key,
        region_name=aws_region
    )

except Exception as e:
    print("Could not get caller identity:", e)

def list_files():
    """List objects in your bucket"""
    resp = s3_client.list_objects_v2(Bucket=S3_BUCKET)
    files = [obj["Key"] for obj in resp.get("Contents", [])]
    return {"files": files}

def get_file(key: str):
    """Fetch object contents from s3"""
    resp = s3_client.get_object(Bucket=S3_BUCKET, Key=key)
    data = resp["Body"].read().decode("utf-8")
    return {"key": key, "data_preview": data[:500]}  # preview first 500 chars


# Add request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    print(f"Incoming request: {request.method} {request.url}")
    print(f"Origin: {request.headers.get('origin', 'No origin header')}")
    print(f"User-Agent: {request.headers.get('user-agent', 'No user-agent')}")
    response = await call_next(request)
    print(f"Response status: {response.status_code}")
    return response

image_prompt = """
You are a helpful assistant that interprets parking signs from images.
Given a photo of a parking sign, output the result in **valid JSON only** with the following keys:

{{
  "isParkingSignFound": "true" | "false",
  "canPark": "true" | "false" | "uncertain",
  "reason": "Clear one-sentence explanation",
  "rules": "Full text of the parsed parking rule(s)",
  "parsedText": "The raw text you extracted from the sign",
  "advice": "Optional human-friendly tip or clarification"
}}

The current date/time is in '%a %I:%M%p' format: {datetime_str}
Use the the current date/time to determine if parking is allowed and reference it in your response.
Respond with *JSON only*, no extra text. If there is no parking sign found, say parkingSignFound = false in the JSON.
You must respond with valid JSON only — do NOT use markdown, backticks, or explanations.
"""

followup_prompt_template = """
    You are a parking assistant.

    Here is the previously parsed parking sign data:
    {previous_summary}

    Use the current time for your response in '%a %I:%M%p' format: {datetime_str}

    User's follow-up question:
    \"{question}\"

    Answer based only on the parking sign data and general logic. If a sign says 'Pay to Park 8am-8pm', typically that means people can park for free outside of those hours. Be nice.
"""

# Message types are now imported from message_types.py

@app.get("/")
async def root():
    """Health check endpoint."""
    return {"message": "CanIParkHere API is running!"}

@app.post("/get-firebase-token")
async def get_firebase_token(request: Request):
    # Get Clerk user ID from frontend
    auth_header = request.headers.get("Authorization")  # "Bearer <user_id>"
    if not auth_header:
        raise HTTPException(status_code=401, detail="Missing Authorization header")

    # Extract user ID from Bearer token
    try:
        clerk_user_id = auth_header.replace("Bearer ", "").strip()
        if not clerk_user_id:
            raise HTTPException(status_code=401, detail="Empty user ID")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid Authorization header format")

    # Create Firebase custom token for this Clerk user ID
    from firebase_admin import auth
    try:
        firebase_token = auth.create_custom_token(clerk_user_id)
        return {"customToken": firebase_token.decode()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create Firebase token: {str(e)}")

async def get_summary_from_image_with_gpt4o(image_bytes: bytes) -> str:
    """
    Extract parking sign text using GPT-4o-mini vision capabilities.
    """
    # print("=== ENTERING get_summary_from_image_with_gpt4o ===")
    # print(f"Client available: {client is not None}")
   # print(f"Image bytes length: {len(image_bytes)}")
    
    if not client:
        # print("ERROR: OpenAI client not available")
        raise HTTPException(status_code=503, detail="OpenAI client not available")
        
    try:
        # print("Starting base64 encoding...")
        # Encode image to base64
        base64_image = base64.b64encode(image_bytes).decode('utf-8')
        # print(f"Base64 encoding complete, length: {len(base64_image)}")
        
        # print("Creating datetime string...")
        datetime_str = datetime.now().strftime("%a %I:%M%p")  # Current datetime in required format
       #  print(f"Datetime: {datetime_str}")
        
        # print("Making OpenAI API call...")
        # print(f"About to format image_prompt with datetime: {datetime_str}")
        
        try:
            formatted_prompt = image_prompt.format(datetime_str=datetime_str)
            print("Prompt formatting successful")
        except Exception as format_error:
            print(f"Prompt formatting failed: {format_error}")
            raise
        
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages = [
                {
                    "role": "system",
                    "content": formatted_prompt
                },
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{base64_image}"
                            }
                        }
                    ]
                }
            ],
            max_tokens=300
        )
        print("OpenAI API call successful!")
        print(f"Response object type: {type(response)}")
        print(f"Response choices length: {len(response.choices)}")
        print(f"First choice: {response.choices[0]}")
        
        content = response.choices[0].message.content.strip()
        # print(f"GPT-4o raw response: {content}")
        print(f"Content type: {type(content)}")
        return content
        
    except Exception as e:
        print(f"Exception in get_summary_from_image_with_gpt4o: {type(e).__name__}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing image with GPT-4o: {str(e)}")


def extract_json_from_gpt_output(response: str) -> dict:
    # Extract JSON code block if wrapped in triple backticks
    json_block = re.search(r"```(?:json)?\s*({.*?})\s*```", response, re.DOTALL)
    if json_block:
        json_str = json_block.group(1)
    else:
        # Fallback: assume entire string is JSON
        json_str = response.strip()

    try:
        return json.loads(json_str)
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"JSON decode error: {str(e)} | Raw: {json_str[:300]}")
    
@app.post("/check-parking-image", response_model=ParkingCheckResponse)
async def check_parking_from_image(
    file: UploadFile = File(...),
    datetime_str: str = Form(...),
) -> ParkingCheckResponse:
    """
    Query ChatGPT, get a JSON response, and return a structured ParkingCheckResponse about the parking image.
    FastAPI automatically converts the returned object into JSON.
    This also saves the JSON into an in-memory dictionary.
    """
    if not file.content_type or not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image")
    try:
        image_bytes = await file.read()
        summary_str = await get_summary_from_image_with_gpt4o(image_bytes)
        summary_json = extract_json_from_gpt_output(summary_str)
        session_id = str(uuid.uuid4())
        # In-memory: This maps a Session ID to the summary JSON for later follow-up questions.
        store[session_id] = summary_json
        # Check if the sign was found and set message type
        is_sign_found = summary_json.get("isParkingSignFound", "true") == "true"
        message_type = "parking" if is_sign_found else "error"

        return ParkingCheckResponse(
            messageType=message_type, 
            session_id=session_id,
            isParkingSignFound="true" if is_sign_found else "false",
            canPark=summary_json.get("canPark", "uncertain"),
            reason=summary_json.get("reason", "No reason provided"),
            rules=summary_json.get("rules", "No rules provided"),
            parsedText=summary_json.get("parsedText", "No text extracted"),
            advice=summary_json.get("advice", "No advice provided"),
            processing_method="gpt4o_mini_vision"
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing image: {str(e)}")

def format_public_parking_point(feature):
    """
    This is just for the public parking facility dataset.
    """
    lng, lat = feature.get("lng"), feature.get("lat")
    return {
        "lat": float(lat),
        "lng": float(lng),
        "address": feature.get("dea_facility_address"),
        "gmaps_url": f"https://www.google.com/maps?q={lat},{lng}"
    }
    return None

def format_parking_sign_point(feature):
    lng, lat = feature.get("lng"), feature.get("lat")
    text = feature.get("text")
    category = feature.get("category", "Unknown")
    # Get description from parking signs dictionary
    description = code_to_desc.get(category, "Unknown Sign Type")
    
    if lng is None or lat is None:
        print(f"Missing coordinates in feature: {feature}")
        lng, lat = -1, -1
    
    return {
        "lat": lat, 
        "lng": lng,
        "text": text,
        "category": category,
        "description": description,
        "distance_m": feature.get("distance_m"),  # Distance from spatial query
    }



@app.post("/search-parking", response_model=ParkingSearchResponse)
async def check_parking_location(data: ParkingSearchRequest) -> ParkingSearchResponse:
    # Here, your logic to check parking rules by lat/lng + datetime
    # For prototype, return a dummy response:
    lat, lon = data.latitude, data.longitude
    print(f"Checking parking at lat: {lat}, lon: {lon}")

    try:
        signs_nearby = get_signs_nearby(lat=lat, lon=lon, athena_client=athena_client, radius_meters=1000, debug=False, top_n=20)
        parking_nearby = public_parking_nearby(lat=lat, lon=lon, athena_client=athena_client,radius_meters=2000, debug=False, top_n=30)

        # format signs for the map
        signs_list = [format_parking_sign_point(f) for f in signs_nearby]
        parking_list = [format_public_parking_point(f) for f in parking_nearby]
        
        # print(f"Raw parking nearby: {parking_nearby[:3]}")
        print(f"Parking nearby: {parking_list[:3]}")
        print(all(isinstance(item['lat'], float) and isinstance(item['lng'], float) for item in parking_list))
        # print(f"Parking categories found: {[s['category'] for s in signs_list]}")
        # Filter signs to only include those with known categories
        signs_list = [s for s in signs_list if code_to_desc.get(s['category'])]
        print(f"Found {len(parking_list)} public parking lots/garages nearby")
        print(f"Filtered to {len(signs_list)} signs with known categories")

        return ParkingSearchResponse(
            session_id=str(uuid.uuid4()),
            parking_sign_results=signs_list,
            public_parking_results=parking_list,
            processing_method="search_api"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error checking location: {str(e)}")


@app.post("/followup-question", response_model=FollowUpResponse)
async def followup_question(req: FollowUpRequest) -> FollowUpResponse:
    """
    Handle follow-up questions based on the JSON summary
    that corresponds to a specific session ID from the frontend.
    """
    previous_summary = store.get(req.session_id)
    if not previous_summary:
        raise HTTPException(status_code=404, detail="Session ID not found")
    
    datetime_str = datetime.now().strftime("%a %I:%M%p")  # Current datetime in required format

    prompt = followup_prompt_template.format(
        previous_summary=json.dumps(previous_summary, indent=2),
        datetime_str=datetime_str,
        question=req.question
    )

    if not client:
        raise HTTPException(status_code=503, detail="OpenAI client not available")
        
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=300,
    )

    answer = response.choices[0].message.content.strip()
    return FollowUpResponse(answer=answer)



@app.get("/health")
async def health_check():
    """Detailed health check with service status."""
    try:
        # Test OpenAI API key availability
        openai_available = bool(os.getenv("OPENAI_API_KEY"))
        
        # Test LLM service (basic check)
        llm_working = True  # Could add actual LLM test here
        
        # Test S3 availability
        s3_available = bool(s3_client)
        
        return {
            "status": "healthy",
            "services": {
                "gpt4o": "configured" if openai_available else "missing_api_key",
                "llm": "working" if llm_working else "error",
                "parser": "working",
                "s3": "configured" if s3_available else "missing_credentials"
            },
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)