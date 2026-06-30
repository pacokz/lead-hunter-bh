"""Testa a integração Text Search com o Google MOCKADO (sem rede real)."""
import httpx

from app.integrations import google_places

SAMPLE_RESPONSE = {
    "places": [
        {
            "id": "ChIJ_abc123",
            "displayName": {"text": "Clínica Sorriso", "languageCode": "pt"},
            "formattedAddress": "Rua X, 100 - Savassi, Belo Horizonte",
            "primaryType": "dentist",
            "businessStatus": "OPERATIONAL",
            "rating": 4.7,
            "userRatingCount": 215,
            "websiteUri": "https://clinicasorriso.com.br",
            "nationalPhoneNumber": "(31) 3333-4444",
            "googleMapsUri": "https://maps.google.com/?cid=1",
            "location": {"latitude": -19.94, "longitude": -43.93},
        }
    ],
    "nextPageToken": "NEXT_TOKEN_XYZ",
}


def _client(handler) -> httpx.Client:
    return httpx.Client(transport=httpx.MockTransport(handler))


def test_search_text_parses_and_returns_token():
    def handler(request: httpx.Request) -> httpx.Response:
        assert "places:searchText" in str(request.url)
        assert request.headers["X-Goog-FieldMask"]
        assert request.headers["X-Goog-Api-Key"] == "FAKE_KEY"
        return httpx.Response(200, json=SAMPLE_RESPONSE)

    places, token = google_places.search_text(
        "clínica odontológica em Savassi, Belo Horizonte",
        api_key="FAKE_KEY",
        client=_client(handler),
    )

    assert token == "NEXT_TOKEN_XYZ"
    assert len(places) == 1
    p = places[0]
    assert p["place_id"] == "ChIJ_abc123"
    assert p["name"] == "Clínica Sorriso"
    assert p["rating"] == 4.7
    assert p["reviews_count"] == 215
    assert p["lat"] == -19.94 and p["lng"] == -43.93
    assert p["phone"] == "(31) 3333-4444"


def test_search_text_empty_results():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"places": []})

    places, token = google_places.search_text(
        "x", api_key="FAKE_KEY", client=_client(handler)
    )
    assert places == []
    assert token is None


def test_search_text_raises_on_http_error():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(403, text="PERMISSION_DENIED")

    raised = False
    try:
        google_places.search_text("x", api_key="BAD", client=_client(handler), max_retries=0)
    except google_places.PlacesAPIError:
        raised = True
    assert raised
