"""
Strip Markdown Fences from LLM Output
=======================================
Every LLM (mistral, llama, gemma) loves wrapping JSON in ```json fences.
This utility strips them so json.loads() works.

Use in n8n Code nodes or in Python.

Usage (Python):
    from strip_markdown_fences import strip_fences
    clean = strip_fences(llm_output)
    data = json.loads(clean)

Usage (n8n JavaScript Code node):
    let raw = $input.first().json.message.content;
    raw = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '');
    raw = raw.trim();
    const data = JSON.parse(raw);
"""

import re
import json
from typing import Any


def strip_fences(text: str) -> str:
    """
    Remove markdown code fences from LLM output.

    Handles:
    - ```json\n{...}\n```
    - ```\n{...}\n```
    - Leading/trailing whitespace
    - Multiple fence blocks (takes content of first one)
    """
    text = text.strip()

    # Pattern: ```json ... ``` or ``` ... ```
    fence_pattern = re.compile(
        r'^```(?:json|JSON)?\s*\n?(.*?)\n?\s*```\s*$',
        re.DOTALL
    )
    match = fence_pattern.match(text)
    if match:
        return match.group(1).strip()

    # Sometimes the model puts text before/after the fence
    inner_pattern = re.compile(
        r'```(?:json|JSON)?\s*\n(.*?)\n\s*```',
        re.DOTALL
    )
    match = inner_pattern.search(text)
    if match:
        return match.group(1).strip()

    # No fences found — return as-is
    return text


def safe_parse_json(text: str) -> tuple[Any, str | None]:
    """
    Strip fences and parse JSON. Returns (data, error).

    Usage:
        data, error = safe_parse_json(llm_output)
        if error:
            # handle retry
        else:
            # use data
    """
    cleaned = strip_fences(text)
    try:
        return json.loads(cleaned), None
    except json.JSONDecodeError as e:
        return None, f"JSON parse error at position {e.pos}: {e.msg}"


if __name__ == "__main__":
    # Quick test
    test_cases = [
        '```json\n[{"name": "test"}]\n```',
        '```\n{"key": "value"}\n```',
        'Here is the result:\n```json\n[1,2,3]\n```\nDone.',
        '[{"no": "fences"}]',
    ]
    for tc in test_cases:
        result, error = safe_parse_json(tc)
        print(f"Input: {tc[:40]}...")
        print(f"Result: {result}")
        print(f"Error: {error}")
        print("---")
