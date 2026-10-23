import copy
import json

import pytest
from django.conf import settings
from django.core.management import call_command
from django.core.management.base import CommandError

from core.contract.build import build_contract
from core.contract.compat import Change, bump_made, classify_changes, required_bump
from core.http import ERRORS
from core.result import ErrorCode

FIELD = {"name": "subject", "type": "string", "widget": "text", "label": "Subject", "maxLength": 160}


def with_model(contract: dict, *fields: dict) -> dict:
    c = copy.deepcopy(contract)
    c["models"]["sample"] = {"label": "Sample", "fields": list(fields)}
    return c


def kinds(old: dict, new: dict) -> set[Change]:
    return {c.kind for c in classify_changes(old, new)}


def test_committed_artefact_matches_backend():
    call_command("contract", "check")  # raises CommandError on drift


def test_export_is_deterministic():
    assert build_contract() == build_contract()
    committed = json.loads(settings.AC_CONTRACT["path"].read_text(encoding="utf-8"))
    assert committed["meta"]["contractVersion"] == settings.AC_CONTRACT["version"]


def test_every_display_field_is_a_declared_field():
    """Rows and dialogs are titled by `displayField`; one the record does not declare would read "Not set"."""
    models = build_contract()["models"]
    missing = {
        k: m["displayField"] for k, m in models.items() if m["displayField"] not in {f["name"] for f in m["fields"]}
    }
    assert missing == {}


def test_every_error_code_has_a_status_and_message():
    assert set(ERRORS) == set(ErrorCode)
    assert all(spec.message for spec in ERRORS.values())


@pytest.fixture
def base() -> dict:
    return with_model(build_contract(), FIELD)


def test_adding_optional_field_is_additive(base):
    assert kinds(base, with_model(base, FIELD, {"name": "notes", "type": "text"})) == {Change.ADDITIVE}


def test_adding_required_field_without_default_is_breaking(base):
    new = with_model(base, FIELD, {"name": "sku", "type": "string", "required": True})
    assert kinds(base, new) == {Change.BREAKING}


def test_removing_field_is_breaking(base):
    assert kinds(base, with_model(base)) == {Change.BREAKING}


def test_dropping_a_required_flag_relaxes_the_field(base):
    required = with_model(base, {**FIELD, "required": True})
    assert kinds(required, with_model(required, FIELD)) == {Change.ADDITIVE}
    assert kinds(with_model(base, FIELD), required) == {Change.BREAKING}


@pytest.mark.parametrize(("limit", "kind"), [(120, Change.BREAKING), (200, Change.ADDITIVE)])
def test_constraint_direction(base, limit, kind):
    assert kinds(base, with_model(base, {**FIELD, "maxLength": limit})) == {kind}


def test_label_change_is_presentational(base):
    assert kinds(base, with_model(base, {**FIELD, "label": "Title"})) == {Change.PRESENTATIONAL}


def test_version_bump_levels():
    assert bump_made("0.1.0", "1.0.0") is Change.BREAKING
    assert bump_made("0.1.0", "0.2.0") is Change.ADDITIVE
    assert bump_made("0.1.0", "0.1.1") is Change.PRESENTATIONAL
    assert bump_made("0.1.0", "0.1.0") is None


def test_export_refuses_breaking_change_without_major_bump(tmp_path, settings):
    old = with_model(build_contract(), FIELD)
    target = tmp_path / "ac-contract.json"
    target.write_text(json.dumps(old), encoding="utf-8")
    settings.AC_CONTRACT = {**settings.AC_CONTRACT, "path": target}
    assert required_bump(classify_changes(old, build_contract())) is Change.BREAKING
    with pytest.raises(CommandError, match="major bump"):
        call_command("contract", "export")
