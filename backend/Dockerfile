# Base image
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Copy and install dependencies
COPY requirements.txt .
RUN python -m venv .venv && \
    .venv/bin/pip install --upgrade pip && \
    .venv/bin/pip install -r requirements.txt

# Copy the rest of your app
COPY . .

# Railway sets $PORT automatically; default to 8000 if missing
ENV PORT=${PORT:-8000}

# Start FastAPI app
CMD ["/bin/sh", "-c", "/app/.venv/bin/uvicorn main:app --host 0.0.0.0 --port $PORT"]
