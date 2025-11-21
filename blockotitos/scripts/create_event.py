import requests

BASE_URL = "http://localhost:4000"

payload = {
    "creatorSecret": "SBK5VSQDTBWV6DFIL4RQFQIEIKV4EIBPNPARZ5FGJP6VWQHUQI4RER7W",
    "creator": "GBDZQGS2ERUGP2Z4DCXUDNBTT73AH7JQ5XEF5AU4HPVY6IC4Q7VSW3B2",
    "eventName": "SuperDuper mega event",
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


