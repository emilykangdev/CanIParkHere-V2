#!/bin/bash
# Push all variables from .env to Fly as secrets

# Exit if .env doesn’t exist
if [ ! -f .env ]; then
  echo ".env file not found!"
  exit 1
fi

# Read each line in .env
while IFS='=' read -r key value
do
  # Skip comments and empty lines
  if [[ -z "$key" ]] || [[ "$key" =~ ^# ]]; then
    continue
  fi

  # Remove possible surrounding quotes from value
  value="${value%\"}"
  value="${value#\"}"

  # Push to Fly
  echo "Setting Fly secret: $key"
  fly secrets set "$key=$value"

done < .env

echo "All secrets pushed!"
