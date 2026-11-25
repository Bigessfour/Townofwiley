"""Answer a Wiley ordinance question only when a retrieved section matches.

The browser never receives AWS credentials. A local scope check refuses
homework, coding, and other non-municipal questions before retrieval.
Converse runs only after a chunk clears the score.
"""

from __future__ import annotations

import json
import os
import re
from typing import Any

CLERK_MESSAGE = (
    "I could not find a matching section of the Wiley Municipal Code, so I will not guess. "
    "The Town Clerk can provide the official text."
)
OFF_TOPIC_MESSAGE = "I only answer questions about the Town of Wiley municipal code and adopted ordinances."
MAX_QUESTION_LENGTH = 600


# Keep these aligned with src/app/ordinances/ordinance-question-scope.ts.
# Misuse is checked first, so "write my homework about the dog license" is refused.
MISUSE_PATTERNS = [
    re.compile(
        r"\b(homework|essay|term paper|book report|poem|short story|fanfic|tarea|ensayo)\b",
        re.I,
    ),
    re.compile(r"\b(python|javascript|typescript|\bjava\b|c\+\+|sql)\b", re.I),
    re.compile(
        r"\b(recipe|movie|celebrity|stock price|horoscope|netflix|receta|pel[ií]cula)\b",
        re.I,
    ),
    re.compile(
        r"\b(?:write|draft|redacta|escribe)(?:\s+\w+){0,3}\s+(?:a |an |my |un |una )?(?:poem|story|email|code|script|essay|paper|correo|ensayo|c[oó]digo)\b",
        re.I,
    ),
    re.compile(r"\b\d+\s*[+*/x×]\s*\d+\b"),
    re.compile(r"\b\d+\s+-\s+\d+\b"),
]
ORDINANCE_PATTERNS = [
    re.compile(
        r"\b(ordinance|municipal code|wiley|section|sec\.|chapter|permit|zoning|dog|animal|fence|weed|grass|lawn|yard|building|alcohol|noise|parking|water|sewer|trash|garbage|license|penalty|trustee|mayor|annexation|subdivision|franchise|utility|sidewalk|traffic|offense|sanitation|nuisance|livestock|rabies|vehicle|car|automobile|truck|street|abandoned|tree|junk)\b",
        re.I,
    ),
    re.compile(
        r"\b(pets?|cats?|chickens?|poultry|leash|bark(?:ing)?|kennels?|sheds?|decks?|garages?|setbacks?|variances?|burns?|fireworks|snow|rv|trailers?|campers?|signs?|business(?:es)?|vendors?|pools?|curfew|recycl(?:e|ing)|meters?|alleys?|easements?|coops?)\b",
        re.I,
    ),
    re.compile(
        r"\b(ordenanza|c[oó]digo municipal|permisos?|zonificaci[oó]n|perros?|animal(?:es)?|licencias?|alcald[eí]|anexi[oó]n|basura|agua|alcantarillado|ruido|estacionamiento|estacionar|acera|tr[aá]fico|multas?|malezas|pasto|c[eé]sped|cerc[ao]s?|veh[ií]culos?|carros?|calles?|abandonad)\b",
        re.I,
    ),
    re.compile(
        r"\b(mascotas?|gatos?|gallinas?|pollos?|vallas?|quejas?|construir|construcci[oó]n|patios?|negocios?|remolques?|nieve|quemas?|letreros?)\b",
        re.I,
    ),
    re.compile(r"\b\d{1,2}-\d{1,2}-\d{1,3}\b"),
]


def question_scope(question: str) -> str:
    text = question.strip()
    if not text:
        return "empty"
    if any(pattern.search(text) for pattern in MISUSE_PATTERNS):
        return "out-of-scope"
    if any(pattern.search(text) for pattern in ORDINANCE_PATTERNS):
        return "ordinance"
    return "out-of-scope"


def settings_from_env() -> dict[str, Any]:
    return {
        "knowledge_base_id": os.environ["KNOWLEDGE_BASE_ID"],
        "model_id": os.environ["MODEL_ID"],
        "min_score": float(os.environ.get("MIN_SCORE", "0.50")),
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


def public_citations(hits: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [
        {
            "section": hit["section"],
            "authority": hit["authority"],
            "score": hit["score"],
        }
        for hit in hits
    ]


def answer_from(generated: dict[str, Any]) -> str:
    answer = ""
    for block in (generated.get("output") or {}).get("message", {}).get("content", []):
        answer += block.get("text") or ""
    return answer.strip()


def converse_blocks(question: str, hits: list[dict[str, Any]]) -> list[dict[str, Any]]:
    excerpts = "\n\n".join(hit["text"] for hit in hits)
    return [
        {
            "text": (
                "Answer the question using only the ordinance excerpts below. Cite the section number(s). "
                "Prefer a clear, conversational answer. If the excerpts only partially address the question, "
                "say what they do cover and note that the Town Clerk has the full official text. "
                "Do not invent rules, penalties, or requirements that are not present in the excerpts. "
                "When an excerpt has authority ordinance-2024-2, treat it as later law than the municipal code section it supersedes.\n\n"
                f"Question: {question}\n\nExcerpts:\n{excerpts}"
            )
        }
    ]


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

    if question_scope(question) != "ordinance":
        return response(
            200,
            {"answer": OFF_TOPIC_MESSAGE, "citations": [], "matched": False},
            origin,
            allowed,
        )

    # The score floor and result count are intentionally permissive so a
    # conversational municipal question can still find a relevant chunk.
    # Generation still requires at least one retrieved match.
    retrieved = clients.retrieve(
        knowledgeBaseId=settings["knowledge_base_id"],
        retrievalQuery={"text": question},
        retrievalConfiguration={"vectorSearchConfiguration": {"numberOfResults": 10}},
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
    )
    return response(
        200,
        {
            "answer": answer_from(generated) or CLERK_MESSAGE,
            "matched": True,
            "citations": public_citations(hits),
        },
        origin,
        allowed,
    )


class AwsClients:
    def __init__(self) -> None:
        import boto3

        self._runtime = boto3.client("bedrock-runtime")
        self._retrieve = boto3.client("bedrock-agent-runtime")

    def converse(self, **kwargs: Any) -> dict[str, Any]:
        return self._runtime.converse(**kwargs)

    def retrieve(self, **kwargs: Any) -> dict[str, Any]:
        return self._retrieve.retrieve(**kwargs)


def lambda_handler(event: dict[str, Any], context: Any) -> dict[str, Any]:
    del context
    return handle(event, AwsClients(), settings_from_env())
