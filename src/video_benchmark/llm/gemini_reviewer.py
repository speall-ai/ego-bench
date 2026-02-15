"""Optional Tier 2 LLM-based video quality review using Gemini."""

from __future__ import annotations

import json
import logging

logger = logging.getLogger(__name__)


def review_with_gemini(
    scores: list[dict],
    rankings: list[dict],
    api_key: str | None = None,
) -> str | None:
    """Send scoring results to Gemini for qualitative review.

    Requires google-generativeai package (install with: uv add --group llm google-generativeai).
    """
    try:
        import google.generativeai as genai
    except ImportError:
        logger.warning(
            "google-generativeai not installed. "
            "Install with: uv add --group llm google-generativeai"
        )
        return None

    if not api_key:
        logger.warning("No Gemini API key provided. Skipping LLM review.")
        return None

    genai.configure(api_key=api_key)
    model = genai.GenerativeModel("gemini-1.5-flash")

    prompt = f"""Analyze these video quality benchmark results for operator headband cameras.

Rankings (top 10):
{json.dumps(rankings[:10], indent=2)}

Provide a brief assessment:
1. Overall quality of the operator camera fleet
2. Key patterns in the data
3. Recommendations for operators with low scores
4. Any concerning trends

Keep the response concise (under 200 words).
"""

    try:
        response = model.generate_content(prompt)
        return response.text
    except Exception:
        logger.exception("Gemini review failed")
        return None
