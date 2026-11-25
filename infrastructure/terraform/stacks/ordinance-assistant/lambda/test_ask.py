"""The generator is not called unless a section clears the score."""

from __future__ import annotations

import json
import os
import unittest
from unittest import mock

from ask import handle, settings_from_env


SETTINGS = {
    "knowledge_base_id": "kb",
    "model_id": "amazon.nova-lite-v1:0",
    "guardrail_id": "guard",
    "guardrail_version": "1",
    "grounding_guardrail_id": "grounding",
    "grounding_guardrail_version": "1",
    "min_score": 0.7,
    "max_tokens": 512,
    "allowed_origins": ["https://townofwiley.gov"],
}


class FakeClients:
    def __init__(
        self, *, guard_action: str = "NONE", results: list | None = None
    ) -> None:
        self.guard_action = guard_action
        self.results = results or []
        self.calls: list[str] = []

    def apply_guardrail(self, **kwargs):
        self.calls.append("guardrail")
        return {"action": self.guard_action}

    def retrieve(self, **kwargs):
        self.calls.append("retrieve")
        number_of_results = kwargs["retrievalConfiguration"][
            "vectorSearchConfiguration"
        ]["numberOfResults"]
        assert number_of_results == 10
        return {"retrievalResults": self.results}

    def converse(self, **kwargs):
        self.calls.append("converse")
        content = kwargs["messages"][0]["content"]
        instruction = content[0]["text"]
        assert "Do not invent rules" in instruction
        assert "ordinance-2024-2" in instruction
        qualifiers = []
        for block in content:
            guard = block.get("guardContent")
            if guard:
                qualifiers.extend(guard["text"]["qualifiers"])
        assert qualifiers == ["grounding_source", "query"]
        assert kwargs["guardrailConfig"]["guardrailIdentifier"] == "grounding"
        assert kwargs["inferenceConfig"]["maxTokens"] == 512
        assert kwargs["inferenceConfig"]["temperature"] == 0
        return {
            "output": {
                "message": {
                    "content": [{"text": "Section 7-6-120 requires a license."}]
                }
            }
        }


def event(question: str) -> dict:
    return {
        "httpMethod": "POST",
        "headers": {"origin": "https://townofwiley.gov"},
        "body": json.dumps({"question": question}),
    }


class AskHandlerTest(unittest.TestCase):
    def test_homework_never_reaches_converse(self) -> None:
        clients = FakeClients(guard_action="GUARDRAIL_INTERVENED")
        result = handle(event("What is the capital of France?"), clients, SETTINGS)
        self.assertEqual(clients.calls, ["guardrail"])
        self.assertIn("only answer questions", json.loads(result["body"])["answer"])

    def test_no_matching_section_never_reaches_converse(self) -> None:
        clients = FakeClients(
            results=[{"score": 0.2, "content": {"text": "unrelated"}, "metadata": {}}]
        )
        result = handle(event("Do I need a license for my dog?"), clients, SETTINGS)
        self.assertEqual(clients.calls, ["guardrail", "retrieve"])
        self.assertFalse(json.loads(result["body"])["matched"])

    def test_matching_section_cites_the_ordinance(self) -> None:
        clients = FakeClients(
            results=[
                {
                    "score": 0.91,
                    "content": {
                        "text": "It is unlawful to fail to prevent an animal from running at large."
                    },
                    "metadata": {"section": "7-6-120", "authority": "ordinance-2024-2"},
                }
            ]
        )
        body = json.loads(
            handle(
                event("What is the rule for a dog running at large?"), clients, SETTINGS
            )["body"]
        )
        self.assertEqual(clients.calls, ["guardrail", "retrieve", "converse"])
        self.assertEqual(body["citations"][0]["section"], "7-6-120")
        self.assertEqual(body["citations"][0]["authority"], "ordinance-2024-2")

    def test_blocked_generation_keeps_the_section(self) -> None:
        clients = FakeClients(
            results=[
                {
                    "score": 0.8,
                    "content": {
                        "text": "The Board of Zoning Adjustment may grant a variance."
                    },
                    "metadata": {"section": "16-10-10", "authority": "code"},
                }
            ]
        )
        clients.converse = lambda **kwargs: (
            clients.calls.append("converse")
            or {
                "stopReason": "guardrail_intervened",
                "output": {
                    "message": {
                        "content": [
                            {
                                "text": "I could not answer from the municipal code. The Town Clerk can provide the official text."
                            }
                        ]
                    }
                },
            }
        )
        body = json.loads(
            handle(event("Where are the zoning variance rules?"), clients, SETTINGS)[
                "body"
            ]
        )
        self.assertNotIn("only answer questions", body["answer"])
        self.assertEqual(body["citations"][0]["section"], "16-10-10")
        self.assertFalse(body["matched"])

    def test_score_just_above_floor_reaches_converse(self) -> None:
        settings = {**SETTINGS, "min_score": 0.50}
        clients = FakeClients(
            results=[
                {
                    "score": 0.55,
                    "content": {
                        "text": "Fences in front yards may not exceed four feet."
                    },
                    "metadata": {"section": "16-2-40", "authority": "code"},
                }
            ]
        )
        body = json.loads(
            handle(event("Can I build a fence?"), clients, settings)["body"]
        )
        self.assertEqual(clients.calls, ["guardrail", "retrieve", "converse"])
        self.assertTrue(body["matched"])
        self.assertEqual(body["citations"][0]["section"], "16-2-40")

    def test_score_below_floor_keeps_the_clerk_message(self) -> None:
        settings = {**SETTINGS, "min_score": 0.50}
        clients = FakeClients(
            results=[
                {
                    "score": 0.49,
                    "content": {
                        "text": "A nearby section that does not clear the floor."
                    },
                    "metadata": {"section": "1-1-1", "authority": "code"},
                }
            ]
        )
        body = json.loads(
            handle(event("Can I build a fence?"), clients, settings)["body"]
        )
        self.assertEqual(clients.calls, ["guardrail", "retrieve"])
        self.assertFalse(body["matched"])
        self.assertIn("Town Clerk", body["answer"])
        self.assertEqual(body["citations"], [])

    def test_default_min_score_is_permissive_when_unset(self) -> None:
        with mock.patch.dict(
            os.environ,
            {
                "KNOWLEDGE_BASE_ID": "kb",
                "MODEL_ID": "model",
                "GUARDRAIL_ID": "guard",
                "GUARDRAIL_VERSION": "1",
                "GROUNDING_GUARDRAIL_ID": "grounding",
                "GROUNDING_GUARDRAIL_VERSION": "1",
            },
            clear=False,
        ):
            os.environ.pop("MIN_SCORE", None)
            self.assertEqual(settings_from_env()["min_score"], 0.50)


if __name__ == "__main__":
    unittest.main()
