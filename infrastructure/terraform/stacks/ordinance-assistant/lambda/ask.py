"""Answer a Wiley ordinance question only when a retrieved section matches.

The browser never receives AWS credentials. ApplyGuardrail runs before any
generation. Converse runs only after a chunk clears the score, with the
retrieved text marked as a grounding source.
"""

from __future__ import annotations

import json
import os
from typing import Any

CLERK_MESSAGE = (
    "I could not find a matching section of the Wiley Municipal Code, so I will not guess. "
    "The Town Clerk can provide the official text."
)
OFF_TOPIC_MESSAGE = "I only answer questions about the Town of Wiley municipal code and adopted ordinances."
MAX_QUESTION_LENGTH = 600


def settings_from_env() -> dict[str, Any]:
    return {
        "knowledge_base_id": os.environ["KNOWLEDGE_BASE_ID"],
        "model_id": os.environ["MODEL_ID"],
        "guardrail_id": os.environ["GUARDRAIL_ID"],
        "guardrail_version": os.environ["GUARDRAIL_VERSION"],
        "min_score": float(os.environ.get("MIN_SCORE", "0.7")),
        "max_tokens": int(os.environ.get("MAX_TOKENS", "512")),
        "allowed_origins": [
            origin.strip()
            for origin in os.environ.get(
                "ALLOWED_ORIGINS",
                "https://townofwiley.gov,https://www.townofwiley.gov,http://127.0.0.1:4300,http://localhost:4300",
            ).split(",")
            if origin.strip()
        ],
    }


def response(
    status: int, payload: dict[str, Any], origin: str, allowed: list[str]
) -> dict[str, Any]:
    allow_origin = origin if origin in allowed else allowed[0]
    return {
        "statusCode": status,
        "headers": {
            "content-type": "application/json",
            "access-control-allow-origin": allow_origin,
            "access-control-allow-headers": "content-type,x-api-key",
            "access-control-allow-methods": "POST,OPTIONS",
        },
        "body": json.dumps(payload),
    }


def citations_from(
    results: list[dict[str, Any]], min_score: float
) -> list[dict[str, Any]]:
    chosen: list[dict[str, Any]] = []
    for item in results:
        score = float(item.get("score") or 0)
        if score < min_score:
            continue
        metadata = item.get("metadata") or {}
        text = (item.get("content") or {}).get("text") or ""
        if not text.strip():
            continue
        chosen.append(
            {
                "text": text,
                "score": score,
                "section": str(metadata.get("section") or ""),
                "authority": str(metadata.get("authority") or ""),
                "uri": ((item.get("location") or {}).get("s3Location") or {}).get("uri")
                or "",
            }
        )
    return chosen[:4]


def converse_blocks(question: str, hits: list[dict[str, Any]]) -> list[dict[str, Any]]:
    blocks: list[dict[str, Any]] = [
        {
            "text": (
                "Answer only from the ordinance excerpts below. Cite the section number. "
                "When an excerpt has authority ordinance-2024-2, it is later law than the municipal code section it supersedes. "
                "If the excerpts do not answer the question, say the Town Clerk has the official text."
            )
        }
    ]
    for hit in hits:
        blocks.append(
            {
                "guardContent": {
                    "text": {
                        "text": hit["text"],
                        "qualifiers": ["grounding_source"],
                    }
                }
            }
        )
    blocks.append({"text": question})
    return blocks


def handle(
    event: dict[str, Any], clients: Any, settings: dict[str, Any]
) -> dict[str, Any]:
    headers = {
        key.lower(): value for key, value in (event.get("headers") or {}).items()
    }
    origin = headers.get("origin", "")
    allowed = settings["allowed_origins"]
    if event.get("httpMethod") == "OPTIONS":
        return response(204, {}, origin, allowed)
    try:
        body = json.loads(event.get("body") or "{}")
    except json.JSONDecodeError:
        body = {}
    question = str(body.get("question") or "").strip()
    if not question or len(question) > MAX_QUESTION_LENGTH:
        return response(
            400,
            {
                "answer": "Enter one question about a Wiley ordinance, under 600 characters.",
                "citations": [],
            },
            origin,
            allowed,
        )

    guard = clients.apply_guardrail(
        guardrailIdentifier=settings["guardrail_id"],
        guardrailVersion=settings["guardrail_version"],
        source="INPUT",
        content=[{"text": {"text": question}}],
    )
    if guard.get("action") == "GUARDRAIL_INTERVENED":
        return response(
            200,
            {"answer": OFF_TOPIC_MESSAGE, "citations": [], "matched": False},
            origin,
            allowed,
        )

    retrieved = clients.retrieve(
        knowledgeBaseId=settings["knowledge_base_id"],
        retrievalQuery={"text": question},
        retrievalConfiguration={"vectorSearchConfiguration": {"numberOfResults": 5}},
    )
    hits = citations_from(
        retrieved.get("retrievalResults") or [], settings["min_score"]
    )
    if not hits:
        return response(
            200,
            {"answer": CLERK_MESSAGE, "citations": [], "matched": False},
            origin,
            allowed,
        )

    generated = clients.converse(
        modelId=settings["model_id"],
        messages=[{"role": "user", "content": converse_blocks(question, hits)}],
        inferenceConfig={"maxTokens": settings["max_tokens"], "temperature": 0},
        guardrailConfig={
            "guardrailIdentifier": settings["guardrail_id"],
            "guardrailVersion": settings["guardrail_version"],
            "trace": "disabled",
        },
    )
    if generated.get("stopReason") == "guardrail_intervened":
        return response(
            200,
            {"answer": OFF_TOPIC_MESSAGE, "citations": [], "matched": False},
            origin,
            allowed,
        )
    answer = ""
    for block in (generated.get("output") or {}).get("message", {}).get("content", []):
        answer += block.get("text") or ""
    return response(
        200,
        {
            "answer": answer.strip() or CLERK_MESSAGE,
            "matched": True,
            "citations": [
                {
                    "section": hit["section"],
                    "authority": hit["authority"],
                    "score": hit["score"],
                }
                for hit in hits
            ],
        },
        origin,
        allowed,
    )


class AwsClients:
    def __init__(self) -> None:
        import boto3

        self._runtime = boto3.client("bedrock-runtime")
        self._retrieve = boto3.client("bedrock-agent-runtime")

    def apply_guardrail(self, **kwargs: Any) -> dict[str, Any]:
        return self._runtime.apply_guardrail(**kwargs)

    def converse(self, **kwargs: Any) -> dict[str, Any]:
        return self._runtime.converse(**kwargs)

    def retrieve(self, **kwargs: Any) -> dict[str, Any]:
        return self._retrieve.retrieve(**kwargs)


def lambda_handler(event: dict[str, Any], context: Any) -> dict[str, Any]:
    del context
    return handle(event, AwsClients(), settings_from_env())
