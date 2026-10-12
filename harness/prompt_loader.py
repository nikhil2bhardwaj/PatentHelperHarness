import os
import re
from dataclasses import dataclass, field
from typing import Dict, List, Optional

from harness.config import PROMPTS_DIR, SYSTEM_PROMPT_FILE, PROMPT_FILES, PHASE_NAMES, USE_JSON_OUTPUT


@dataclass
class Prompt:
    phase: int
    name: str
    template: str
    variables: List[str] = field(default_factory=list)


def _extract_variables(text: str) -> List[str]:
    pattern = r"\{\{([A-Z_0-9]+)\}\}"
    return list(dict.fromkeys(re.findall(pattern, text)))


_JSON_OUTPUT_INSTRUCTION = (
    "Output your response as a single valid JSON object. "
    "Use the section headings from the template below as top-level keys "
    "(e.g., \"1_input_summary\", \"2_research_plan\"). "
    "Each key's value should be an object, array, or string matching the fields described. "
    "Use arrays for repeated items (e.g., multiple ideas, problems, signals). "
    "Include all sections. Do not output any text outside the JSON object."
)


def _transform_to_json_output(template: str) -> str:
    if not USE_JSON_OUTPUT:
        return template

    template = re.sub(
        r"(<output_instructions>)\n.*?\n(</output_instructions>)",
        lambda m: f"{m.group(1)}\n{_JSON_OUTPUT_INSTRUCTION}\n{m.group(2)}",
        template,
        flags=re.DOTALL,
    )

    template = template.replace(
        "<output_format_template>",
        '<output_format_template (use as structural guide for JSON keys)>',
    )

    return template


def load_system_prompt() -> str:
    path = os.path.join(PROMPTS_DIR, SYSTEM_PROMPT_FILE)
    with open(path, "r", encoding="utf-8") as f:
        return f.read().strip()


def load_prompt(phase: int) -> Prompt:
    filename = PROMPT_FILES[phase]
    path = os.path.join(PROMPTS_DIR, filename)
    with open(path, "r", encoding="utf-8") as f:
        template = f.read().strip()
    template = _transform_to_json_output(template)
    variables = _extract_variables(template)
    return Prompt(
        phase=phase,
        name=PHASE_NAMES.get(phase, f"Phase {phase}"),
        template=template,
        variables=variables,
    )


def load_all_prompts() -> Dict[int, Prompt]:
    prompts = {}
    for phase in sorted(PROMPT_FILES.keys()):
        prompts[phase] = load_prompt(phase)
    return prompts


def substitute_variables(template: str, values: Dict[str, str]) -> str:
    def replacer(match):
        var_name = match.group(1)
        return values.get(var_name, match.group(0))

    return re.sub(r"\{\{([A-Z_0-9]+)\}\}", replacer, template)
