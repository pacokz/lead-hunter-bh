from app.enums import (
    AgentAccess,
    CommercialStage,
    ContactChannel,
    PipelineState,
    ScoreBand,
    SiteClass,
)


def test_pipeline_has_terminal_states():
    values = {s.value for s in PipelineState}
    assert {"WON", "LOST", "ERROR"}.issubset(values)
    assert "QUALIFIED" in values and "DISQUALIFIED" in values


def test_site_class_values():
    assert {s.value for s in SiteClass} == {
        "SEM_SITE",
        "FORA_DO_AR",
        "REDE_SOCIAL",
        "SITE_OBSOLETO",
        "SITE_FRACO",
        "SITE_RAZOAVEL",
        "SITE_BOM",
    }


def test_score_bands():
    assert {s.value for s in ScoreBand} == {
        "DESCARTAR",
        "BAIXO_POTENCIAL",
        "REVISAR",
        "ALTO_POTENCIAL",
        "PRIORIDADE",
    }


def test_commercial_stages_cover_kanban():
    values = {s.value for s in CommercialStage}
    assert {"NOVO", "GANHO", "PERDIDO", "REUNIAO"}.issubset(values)


def test_agent_access_levels():
    assert [a.value for a in AgentAccess] == [
        "OBSERVADOR",
        "ADVICE",
        "OPERADOR",
        "AUTONOMO",
    ]


def test_contact_channels():
    assert {c.value for c in ContactChannel} == {"WHATSAPP", "INSTAGRAM", "EMAIL"}
