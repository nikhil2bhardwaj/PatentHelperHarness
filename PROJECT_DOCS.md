# Patent Helper Harness — Project Documentation

## Overview

A Python CLI tool that chains 13 prompts (Phases 0–12) for automotive R&D patent ideation through an LLM API (OpenAI or Groq), with user-controlled gates between each phase. Outputs are saved as JSON, compressed between phases for token efficiency, and accumulated in a single indexed file for easy reference.

---

## File-by-File Explanation

### Root Files

| File | Purpose |
|------|---------|
| `run_harness.py` | **Entry point.** Parses CLI arguments (`--provider`, `--mock`, `--resume`, `--input`, `--model`, etc.), creates the API client and output store, and starts the workflow. |
| `requirements.txt` | Python dependencies: `openai`, `tiktoken`, `rich`, `python-dotenv`. |
| `.env.example` | Template for environment variables. Copy to `.env` and fill in API keys. |
| `.env` | Your actual config (not committed to git). Contains API keys, model names, provider selection. |
| `README.md` | Quick-start guide and usage examples. |
| `PROJECT_DOCS.md` | This file — detailed project documentation. |

### `harness/` Package

| File | Purpose |
|------|---------|
| `__init__.py` | Empty init file that makes `harness/` a Python package. |
| `config.py` | **Central configuration.** Loads `.env` variables, defines API keys, model names, prompt file paths, phase names, and feature flags (`USE_JSON_OUTPUT`, `COMPRESS_PHASE_OUTPUTS`, `OUTPUT_COMPRESSION_THRESHOLD`). |
| `prompt_loader.py` | **Prompt management.** Loads the System Prompt + 13 phase prompts from `Innovation Prompts/`. Extracts `{{TEMPLATE_VARIABLES}}` from each prompt. Transforms prompts for JSON output mode (replaces `<output_instructions>` with JSON directives). Substitutes variables at runtime. |
| `api_client.py` | **API wrapper.** Multi-provider client supporting OpenAI (GPT-4o), Anthropic (Claude 3.5), Google Gemini (1.5 Pro via OpenAI endpoint), and custom OpenAI-Compatible endpoints (Ollama, vLLM, DeepSeek, Groq). Handles retries, rate limits, connection errors, and JSON response mode. |
| `mock_client.py` | **Mock API client.** Drop-in replacement for `APIClient` that returns simulated JSON responses. Used with `--mock` flag for testing without any API key. |
| `workflow.py` | **Core orchestrator.** Chains phases 0→12, manages gate logic (Accept/Edit/Feedback/Save&Exit/Rerun/View Cumulative), builds variable values for each phase (including compressed previous-phase outputs and historical/cumulative context for Phases 11-12), displays output (JSON tree or markdown), and saves session state. |
| `output_store.py` | **Session persistence.** Creates timestamped session folders. Saves each phase output to individual files (`phase_N_output.md`). Rebuilds a cumulative file (`all_phases_output.json`) with a line-number index at the top. Saves/loads session state JSON and feedback files. |
| `utils.py` | **Utilities.** Token counting via `tiktoken`. Output compression — extracts only "Inputs for Phase X+1" and "Decision" sections from JSON outputs before passing to the next phase (60-80% token reduction). Builds historical/cumulative context for Phases 11-12. Opens files in the system editor. |

### `Innovation Prompts/` Directory

| File | Purpose |
|------|---------|
| `1. SystemPrompt.txt` | System prompt sent with every API call. Defines the agent role, phase list, and general rules. |
| `Prompt 0.md` | Phase 0: User Intent & Scope Setup. Classifies user input, determines research mode, sets boundaries. |
| `Prompt 1.txt` | Phase 1: Research. Technology trends, problems, patent activity, literature, market drivers, regulations. |
| `Prompt 2.txt` | Phase 2: Problem Discovery & Opportunity Mining. Converts research signals into structured problem statements. |
| `Prompt 3.txt` | Phase 3: Idea Generation. Converts problems into 2-5 patent idea candidates per problem. |
| `Prompt 4.txt` | Phase 4: Idea Screening & Shortlisting. Scores ideas on 11 weighted factors, ranks, shortlists. |
| `Prompt 5.txt` | Phase 5: Prior Art & Patent Landscape Search. Keyword matrices, Boolean strings, feature comparison. |
| `Prompt 6.txt` | Phase 6: Novelty & Inventive Step Analysis. Feature breakdown, prior art mapping, claimability assessment. |
| `Prompt 7.txt` | Phase 7: Technical Feasibility Analysis. Hardware, software, data, integration, calibration, testing, production feasibility. |
| `Prompt 8.txt` | Phase 8: Cost & Effort Estimation. Effort across 4 maturity levels, WBS, team, cost drivers. |
| `Prompt 9.txt` | Phase 9: Safety, Compliance & Risk Review. ISO 26262, SOTIF, cybersecurity, privacy, regulatory, risk mitigation. |
| `Prompt 10.txt` | Phase 10: Patent Abstract / Invention Disclosure Drafting. Full patent-style disclosure with claims, embodiments, examples. |
| `Prompt 11.txt` | Phase 11: Fact-Checking & Evidence Validation. Audits Phase 10 output, classifies assertions, flags overclaims. Injects `{{HISTORICAL_CONTEXT}}` (Phases 5-9). |
| `Prompt 12.txt` | Phase 12: Final Recommendation & Decision Support. Executive-level IP recommendation, action plan, risk/benefit judgment. Injects `{{CUMULATIVE_CONTEXT}}` (Phases 4-10). |

### `outputs/` Directory (auto-created)

Each run creates `outputs/session_YYYYMMDD_HHMMSS/` containing:

| File | Purpose |
|------|---------|
| `phase_N_output.md` | Raw LLM response for phase N (JSON string). |
| `phase_N_edited.md` | User-edited version of phase N output (if edited at gate). |
| `phase_N_feedback.txt` | User feedback for phase N (if provided at gate). |
| `all_phases_output.json` | Cumulative file with all phase outputs. Starts with a line-number index for quick navigation. |
| `session_state.json` | Session metadata: current phase, completed phases, user input, model used. Enables `--resume`. |

---

## How to Start Using the Main Python Code

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Configure API Access

Copy `.env.example` to `.env` and fill in your API key:

**Using Groq (free):**
```
API_PROVIDER=groq
GROQ_API_KEY=gsk_your_key_here
GROQ_MODEL=llama-3.1-8b-instant
```

**Using OpenAI:**
```
API_PROVIDER=openai
OPENAI_API_KEY=sk_your_key_here
OPENAI_MODEL=gpt-4o
```

Get a Groq API key at [console.groq.com](https://console.groq.com).

### 3. Run the Harness

**Interactive mode (recommended):**
```bash
python run_harness.py --provider groq
```
You'll be prompted for initial input. Type your topic or press Enter for Autonomous mode.

**With pre-filled input:**
```bash
python run_harness.py --provider groq --input "Battery thermal management for EVs"
```

**Mock mode (no API needed, for testing):**
```bash
python run_harness.py --mock
```

**Resume a saved session:**
```bash
python run_harness.py --resume outputs/session_20240101_120000/
```

**Override model:**
```bash
python run_harness.py --provider groq --model llama-3.3-70b-versatile
```

### 4. Gate Options (after each phase)

| Key | Option | Description |
|-----|--------|-------------|
| `1` | Accept | Use AI output as-is, proceed to next phase |
| `2` | Edit | Open output in editor, save changes |
| `3` | Feedback | Type feedback prepended to next phase's prompt |
| `4` | Save & Exit | Save session, exit, resume later |
| `5` | Rerun | Re-run current phase |
| `6` | View Cumulative | Open the cumulative output file with all phases so far |

### 5. Review Outputs

After the session, navigate to the session folder:
```
outputs/session_YYYYMMDD_HHMMSS/
```

- Open `all_phases_output.json` to see all phase outputs with a line-number index at the top
- Individual phase files are `phase_0_output.md`, `phase_1_output.md`, etc.
- `session_state.json` tracks which phases were completed

---

## Architecture Diagram

```
User Input
    │
    ▼
run_harness.py (CLI entry point)
    │
    ├── APIClient (api_client.py) ──→ Groq / OpenAI API
    │       └── MockAPIClient (mock_client.py) ──→ Simulated responses
    │
    ├── OutputStore (output_store.py) ──→ outputs/session_XXX/
    │       ├── phase_N_output.md (individual)
    │       ├── all_phases_output.json (cumulative + index)
    │       └── session_state.json (resume state)
    │
    └── Workflow (workflow.py)
            │
            ├── PromptLoader (prompt_loader.py) ──→ Innovation Prompts/
            │       └── Loads, transforms (JSON mode), substitutes variables
            │
            ├── Utils (utils.py)
            │       ├── Token counting (tiktoken)
            │       ├── Output compression (extract handoff sections)
            │       └── Historical/Cumulative context building
            │
            └── Phase Loop: 0 → 1 → 2 → ... → 12
                    │
                    └── Gate (Accept/Edit/Feedback/Save/Rerun/View)
```

---

## Token Optimization Features

| Feature | How | Savings |
|---------|-----|---------|
| Prompt compression | Removed repeated placeholder blocks, shortened descriptions | ~21% on prompt tokens |
| JSON output mode | Model outputs JSON instead of verbose markdown | ~20-30% on response tokens |
| Phase-to-phase compression | Only "Inputs for Phase X+1" + "Decision" sections passed forward | ~60-80% per phase transfer |
| Historical context compression | Phases 5-9 outputs compressed for Phase 11 injection | ~50-70% |
| Cumulative context compression | Phases 4-10 outputs compressed for Phase 12 injection | ~50-70% |
| System prompt caching | OpenAI auto-caches repeated system prompt (50% discount on cached tokens) | Automatic |

---

## Web App (Phase 2)

The core logic (`prompt_loader`, `api_client`, `workflow`, `output_store`) is reused as a FastAPI backend. A React + TailwindCSS frontend replaces the terminal UI with:

- Phase timeline sidebar
- Output viewer with JSON rendering
- Inline editor for gate edits
- Feedback input box
- Session history

See `web/` directory for the web application.
