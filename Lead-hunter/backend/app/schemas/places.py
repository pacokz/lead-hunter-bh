from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class CampaignCreate(BaseModel):
    name: str
    category: str | None = None
    terms: list[str] = []
    regions: list[str] = []
    min_rating: float | None = None
    min_reviews: int | None = None
    max_pages: int = 1
    max_calls: int | None = None


class CampaignOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    category: str | None
    status: str
    max_pages: int


class JobOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    campaign_id: int
    term: str
    region: str
    page: int
    status: str
    attempts: int
    results_count: int
    error: str | None


class LeadOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    place_id: str
    name: str
    category: str | None
    rating: float | None
    reviews_count: int | None
    website: str | None
    phone: str | None
    business_status: str | None
    instagram_handle: str | None


class AuditOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    place_id: str
    site_class: str
    https: bool | None
    responsive: bool | None
    http_status: int | None
    response_time_s: float | None
    has_form: bool | None
    has_whatsapp: bool | None


class ScoreOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    place_id: str
    score: int
    band: str


class InteractionCreate(BaseModel):
    channel: str | None = None
    direction: str | None = None  # outbound | inbound
    content: str | None = None


class InteractionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    place_id: str
    channel: str | None
    direction: str | None
    content: str | None
    created_at: datetime | None


class FollowUpCreate(BaseModel):
    type: str = "call"  # call | mensagem
    scheduled_at: datetime | None = None
    note: str | None = None


class FollowUpOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    place_id: str
    type: str
    scheduled_at: datetime | None
    note: str | None
    done: bool
    done_at: datetime | None


class FollowUpAgendaOut(FollowUpOut):
    place_name: str | None = None


class RankedLeadOut(BaseModel):
    place_id: str
    name: str
    category: str | None
    rating: float | None
    reviews_count: int | None
    site_class: str | None
    score: int
    band: str
    phone: str | None
    instagram_handle: str | None
    contacted: bool = False
    last_contact_at: datetime | None = None
    stage: str | None = None


class CategoryCreate(BaseModel):
    name: str
    priority: int = 0


class CategoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    priority: int
    active: bool


class RegionCreate(BaseModel):
    name: str


class RegionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    active: bool


class CrmCardOut(BaseModel):
    place_id: str
    name: str
    stage: str
    score: int | None
    band: str | None
    site_class: str | None
    phone: str | None
    instagram_handle: str | None


class OutreachDraftOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    place_id: str
    channel: str
    text: str
    status: str
