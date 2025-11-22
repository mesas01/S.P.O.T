import requests

BASE_URL = "http://localhost:4000"

payload = {
    "creator": "GBDZQGS2ERUGP2Z4DCXUDNBTT73AH7JQ5XEF5AU4HPVY6IC4Q7VSW3B2",
    "eventName": "Taco Festival Pro",
    "eventDate": 1735689600,
    "location": "Bogotá",
    "description": "SPOT Demo",
    "maxPoaps": 100,
    "claimStart": 1735689600,
    "claimEnd": 1736294400,
    "metadataUri": "https://example.com/metadata.json",
    "imageUrl": "https://example.com/image.png",
}

response = requests.post(f"{BASE_URL}/events/create", json=payload)

print("Status:", response.status_code)
try:
    print("Body:", response.json())
except ValueError:
    print("Body:", response.text)


