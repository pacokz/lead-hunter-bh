import app.models  # noqa: F401  — registra os models
from app.database import Base

EXPECTED_TABLES = {
    # configuração
    "project_settings",
    "categories",
    "regions",
    "qualification_rules",
    # google places
    "search_campaigns",
    "search_jobs",
    "api_usage",
    "places",
    # pipeline & score
    "lead_pipeline",
    "lead_scores",
    "lead_score_components",
    # auditoria
    "site_audits",
    "site_audit_issues",
    "site_screenshots",
    # referências de design
    "design_references",
    # demonstrações
    "demo_projects",
    "demo_versions",
    "demo_reviews",
    # agentes
    "agents",
    "agent_tasks",
    "agent_runs",
    "operation_logs",
    "agent_errors",
    # crm
    "commercial_pipeline",
    "outreach_drafts",
    "interactions",
    "follow_ups",
    "opportunities",
    "do_not_contact",
    # diagnóstico
    "client_diagnostics",
    "automation_opportunities",
    # controle
    "approvals",
    "approval_events",
}


def test_all_expected_tables_registered():
    registered = set(Base.metadata.tables.keys())
    missing = EXPECTED_TABLES - registered
    assert not missing, f"Tabelas faltando no metadata: {missing}"


def test_places_primary_key_is_place_id():
    place = Base.metadata.tables["places"]
    pks = [c.name for c in place.primary_key.columns]
    assert pks == ["place_id"]


def test_lead_pipeline_references_place():
    pipeline = Base.metadata.tables["lead_pipeline"]
    fks = {fk.column.table.name for fk in pipeline.foreign_keys}
    assert "places" in fks
