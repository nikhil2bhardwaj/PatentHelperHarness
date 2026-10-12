import tiktoken
import json
import re

from harness.config import OPENAI_MODEL, TOKEN_WARNING_THRESHOLD, COMPRESS_PHASE_OUTPUTS, OUTPUT_COMPRESSION_THRESHOLD


def count_tokens(text: str, model: str = OPENAI_MODEL) -> int:
    try:
        encoding = tiktoken.encoding_for_model(model)
    except KeyError:
        encoding = tiktoken.get_encoding("cl100k_base")
    return len(encoding.encode(text))


def truncate_to_tokens(text: str, max_tokens: int, model: str = OPENAI_MODEL) -> str:
    try:
        encoding = tiktoken.encoding_for_model(model)
    except KeyError:
        encoding = tiktoken.get_encoding("cl100k_base")
    tokens = encoding.encode(text)
    if len(tokens) <= max_tokens:
        return text
    return encoding.decode(tokens[:max_tokens])


def extract_next_phase_inputs(output: str, next_phase: int) -> str:
    """Extract relevant sections from JSON output for the next phase.

    Extracts inputs_for_phase, decision, recommended, problem, idea, constraint,
    assumption, and summary sections. Falls back to full output if extraction
    yields too little content.
    """
    try:
        data = json.loads(output)
    except (json.JSONDecodeError, TypeError):
        return output

    next_phase_patterns = [
        f"inputs_for_phase_{next_phase}",
        f"inputs_for_phase_{next_phase}_",
        f"phase_{next_phase - 1}_decision",
        f"phase_{next_phase - 1}_inputs",
        f"for_phase_{next_phase}",
        f"next_phase",
    ]

    content_patterns = [
        "decision",
        "final_path",
        "final_decision",
        "recommendation",
        "recommended",
        "selected",
        "problem",
        "idea",
        "opportunity",
        "constraint",
        "assumption",
        "summary",
        "input_summary",
        "scope",
        "boundary",
        "missing",
        "deliverable",
        "research",
        "novelty",
        "feasibility",
        "cost",
        "risk",
        "compliance",
        "abstract",
        "invention",
        "claim",
        "patent",
        "prior_art",
        "screening",
        "ranking",
        "fact_check",
        "evidence",
        "validation",
        "modification",
    ]

    exclude_patterns = [
        "modification",
        "mitigation",
        "correction",
        "opportunity_map",
    ]

    extracted = {}
    for key in data:
        key_lower = key.lower()

        if any(p in key_lower for p in next_phase_patterns):
            extracted[key] = data[key]
            continue

        if next_phase >= 1 and f"phase_{next_phase - 1}" in key_lower and "decision" in key_lower:
            extracted[key] = data[key]
            continue

        if any(p in key_lower for p in content_patterns) and not any(
            p in key_lower for p in exclude_patterns
        ):
            if key_lower not in extracted:
                extracted[key] = data[key]

    if not extracted:
        return output

    compressed = json.dumps(extracted, indent=2, ensure_ascii=False)
    full_token_count = count_tokens(output)
    compressed_token_count = count_tokens(compressed)

    if compressed_token_count < full_token_count * 0.3:
        return output

    return compressed


def compress_phase_output(output: str, next_phase: int, model: str = OPENAI_MODEL) -> str:
    """Compress a phase output before passing to the next phase.

    Strategy: Truncate to OUTPUT_COMPRESSION_THRESHOLD tokens.
    No key extraction - pass full output truncated to fit token limit.
    """
    if not COMPRESS_PHASE_OUTPUTS:
        return output

    token_count = count_tokens(output, model)
    if token_count <= OUTPUT_COMPRESSION_THRESHOLD:
        return output

    return truncate_to_tokens(output, OUTPUT_COMPRESSION_THRESHOLD, model)


def build_historical_context(phase_outputs: dict, phases: list, model: str = OPENAI_MODEL) -> str:
    parts = []
    total_tokens = 0
    for phase in phases:
        output = phase_outputs.get(phase)
        if not output:
            continue
        if COMPRESS_PHASE_OUTPUTS:
            output = compress_phase_output(output, next_phase=11, model=model)
        header = f"--- PHASE {phase} OUTPUT ---\n"
        section = header + output + "\n\n"
        section_tokens = count_tokens(section, model)
        total_tokens += section_tokens
        parts.append(section)

    full_text = "".join(parts)

    if total_tokens > TOKEN_WARNING_THRESHOLD:
        compressed = compress_context(full_text, model)
        return compressed

    return full_text.strip()


def compress_context(text: str, model: str = OPENAI_MODEL) -> str:
    max_tokens = TOKEN_WARNING_THRESHOLD
    return truncate_to_tokens(text, max_tokens, model)


def build_cumulative_context(phase_outputs: dict, phases: list, model: str = OPENAI_MODEL) -> str:
    return build_historical_context(phase_outputs, phases, model)


def open_in_editor(filepath: str) -> str:
    import subprocess
    import platform

    system = platform.system()
    if system == "Windows":
        editor = __import__("os").environ.get("EDITOR", "notepad")
    else:
        editor = __import__("os").environ.get("EDITOR", "nano")

    subprocess.call([editor, filepath])
    with open(filepath, "r", encoding="utf-8") as f:
        return f.read()
