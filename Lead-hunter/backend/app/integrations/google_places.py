"""Cliente do Google Places API (New) — Text Search.

Usa exclusivamente o endpoint `places:searchText` com `X-Goog-FieldMask`.
Proibido: lib `googlemaps` legada, Places Legacy, scraping do Maps.
"""
from __future__ import annotations

import time

import httpx

SEARCH_TEXT_URL = "https://places.googleapis.com/v1/places:searchText"

FIELD_MASK = ",".join(
    [
        "places.id",
        "places.displayName",
        "places.formattedAddress",
        "places.primaryType",
        "places.businessStatus",
        "places.rating",
        "places.userRatingCount",
        "places.websiteUri",
        "places.nationalPhoneNumber",
        "places.googleMapsUri",
        "places.location",
        "nextPageToken",
    ]
)

_RETRY_STATUS = {429, 500, 502, 503, 504}


class PlacesAPIError(Exception):
    pass


def normalize_place(raw: dict) -> dict:
    """Converte um place da resposta da API para o formato das colunas de `places`."""
    location = raw.get("location") or {}
    display_name = raw.get("displayName") or {}
    return {
        "place_id": raw.get("id"),
        "name": display_name.get("text"),
        "primary_type": raw.get("primaryType"),
        "address": raw.get("formattedAddress"),
        "phone": raw.get("nationalPhoneNumber"),
        "website": raw.get("websiteUri"),
        "rating": raw.get("rating"),
        "reviews_count": raw.get("userRatingCount"),
        "lat": location.get("latitude"),
        "lng": location.get("longitude"),
        "business_status": raw.get("businessStatus"),
        "google_maps_uri": raw.get("googleMapsUri"),
    }


def search_text(
    query: str,
    *,
    api_key: str,
    page_token: str | None = None,
    page_size: int = 20,
    language_code: str = "pt-BR",
    region_code: str = "BR",
    client: httpx.Client | None = None,
    max_retries: int = 3,
) -> tuple[list[dict], str | None]:
    """Faz uma busca Text Search. Retorna (places_normalizados, next_page_token)."""
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": api_key,
        "X-Goog-FieldMask": FIELD_MASK,
    }
    body: dict = {
        "textQuery": query,
        "pageSize": page_size,
        "languageCode": language_code,
        "regionCode": region_code,
    }
    if page_token:
        body["pageToken"] = page_token

    own_client = client is None
    client = client or httpx.Client(timeout=30)
    try:
        attempt = 0
        while True:
            attempt += 1
            try:
                resp = client.post(SEARCH_TEXT_URL, headers=headers, json=body)
            except httpx.TransportError as exc:
                if attempt <= max_retries:
                    time.sleep(0.5 * attempt)
                    continue
                raise PlacesAPIError(f"Falha de transporte: {exc}") from exc

            if resp.status_code in _RETRY_STATUS and attempt <= max_retries:
                time.sleep(0.5 * attempt)
                continue
            if resp.status_code >= 400:
                raise PlacesAPIError(f"HTTP {resp.status_code}: {resp.text}")

            data = resp.json()
            places = [normalize_place(p) for p in data.get("places", [])]
            return places, data.get("nextPageToken")
    finally:
        if own_client:
            client.close()
