# Patent Helper Harness - Web App Documentation

## Overview

The web app provides a browser-based UI for running the 13-phase automotive R&D patent ideation pipeline. It consists of:

- **Backend**: FastAPI server (Python) serving the API and static frontend files
- **Frontend**: React + TailwindCSS single-page app (pre-built, served by backend)
- **API Providers**: Groq, OpenAI, Nararouter (selectable per session)

---

## Prerequisites

1. **Python 3.10+** installed and on PATH
2. **Node.js** (bundled in `node-v26.5.0-win-x64/` or installed globally)
3. **API keys** configured in `.env` (see below)

---

## First-Time Setup

### 1. Install Python dependencies

```powershell
pip install -r requirements.txt
```

### 2. Configure environment variables

Copy the example and fill in your API keys:

```powershell
Copy-Item .env.example .env
```

Edit `.env` with your actual keys:

```env
# Provider Selection: "openai", "anthropic", "gemini", or "openaicompatible"
API_PROVIDER=openai

# OpenAI
OPENAI_API_KEY=sk-proj-your_key
OPENAI_MODEL=gpt-4o

# Anthropic
ANTHROPIC_API_KEY=sk-ant-your_key
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022

# Google Gemini
GEMINI_API_KEY=your_gemini_key
GEMINI_MODEL=gemini-1.5-pro

# OpenAI-Compatible (Ollama, vLLM, DeepSeek, Groq, LMStudio)
OPENAI_COMPATIBLE_BASE_URL=http://localhost:11434/v1
OPENAI_COMPATIBLE_MODEL=llama3.3:70b
```

> **Note**: You only need keys for the providers you plan to use. The provider is selected on the start screen per session.

### 3. Build the frontend (only needed if source changes)

The frontend is pre-built in `web/frontend/dist/`. You only need to rebuild if you modify React source files in `web/frontend/src/`.

```powershell
# Using bundled Node.js
$env:PATH = (Get-Location).Path + "\node-v26.5.0-win-x64;" + $env:PATH
node node-v26.5.0-win-x64\node_modules\npm\bin\npm-cli.js run build --prefix web/frontend

# Or if Node.js is installed globally
npm run build --prefix web/frontend
```

---

## Starting the Server

### Start the backend (serves both API and frontend)

From the project root directory:

```powershell
python -m uvicorn web.backend.main:app --host 127.0.0.1 --port 8000
```

You should see:

```
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
```

Open your browser to **http://127.0.0.1:8000**.

### Development mode (optional)

For frontend hot-reload during development, run both servers:

**Terminal 1 - Backend:**
```powershell
python -m uvicorn web.backend.main:app --host 127.0.0.1 --port 8000
```

**Terminal 2 - Frontend dev server:**
```powershell
npm run dev --prefix web/frontend
```

Then open **http://localhost:5173** (the Vite dev server proxies `/api` calls to the backend on port 8000).

---

## Stopping the Server

### Method 1: Ctrl+C (if running in foreground)

Press `Ctrl+C` in the terminal where the server is running.

### Method 2: PowerShell command (if running in background)

```powershell
Stop-Process -Name python -ErrorAction SilentlyContinue
```

### Method 3: Find and kill by port

```powershell
# Find the process using port 8000
Get-NetTCPConnection -LocalPort 8000 | Select-Object OwningProcess

# Kill it (replace PID with the number from above)
Stop-Process -Id <PID>
```

---

## Using the Web App

### Start Screen

1. **Initial Input** - Enter a topic (e.g., "Battery thermal management for EVs") or leave empty for autonomous mode
2. **API Provider** - Select Groq, OpenAI, Nararouter, or Mock (no API needed)
3. **Execution Mode**:
   - **Normal** - Review each phase output before proceeding (gate panel with Accept/Edit/Feedback/Rerun/Exit)
   - **Autonomous** - All 13 phases run automatically without manual review
4. Click **Start Session**

### Normal Mode

- Click **Run Phase N** to start each phase
- After each phase completes, a **gate panel** appears at the bottom with options:
  - **Accept** - Use output as-is, proceed to next phase
  - **Edit** - Modify output before proceeding
  - **Feedback** - Provide feedback for the next phase
  - **Save & Exit** - Save session and exit
  - **Rerun** - Re-run the current phase
- Click completed phases in the left sidebar to review past outputs
- Click **Go to Phase N** to return to the active phase

### Autonomous Mode

- Phases run automatically one after another
- A **Stop Auto-Run** button appears during execution to break the chain
- If stopped, the current phase output is shown with the gate panel for manual review
- On error, auto-run stops and shows a **Retry** button

### Output Views

Each phase output can be viewed in two formats:
- **Formatted** - Human-readable rendering of JSON output with color-coded sections
- **Raw JSON** - Original JSON with syntax highlighting

### Cumulative Output

After all phases complete, click **View Cumulative Output** to see the combined results from all phases in a modal overlay.

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/phases` | List all 13 phases |
| `POST` | `/api/sessions` | Start a new session |
| `POST` | `/api/sessions/{id}/run/{phase}` | Run a specific phase |
| `POST` | `/api/sessions/{id}/gate` | Submit gate decision (accept/edit/feedback/exit/rerun) |
| `GET` | `/api/sessions/{id}` | Get session status |
| `GET` | `/api/sessions/{id}/cumulative` | Get cumulative output from all phases |
| `GET` | `/api/sessions/{id}/phase/{phase}` | Get a specific phase's output |

---

## Troubleshooting

### "Failed to generate JSON" error

This happens when the LLM model produces invalid JSON (e.g., unquoted `N/A` values). Solutions:
- Click **Retry** to try again
- Switch to a more capable model (e.g., `llama-3.3-70b-versatile` instead of `llama-3.1-8b-instant`)
- Use Mock mode to test the pipeline without API calls

### "Request too large" / rate limit error

The Groq free tier has a 6000 TPM limit. Solutions:
- Use a larger model tier or different provider
- Wait a minute and retry
- Use Nararouter or OpenAI instead

### 409 Conflict error

This was fixed by relaxing the backend concurrency check. If it recurs, restart the server.

### Frontend changes not reflected

The frontend is pre-built. After modifying `web/frontend/src/` files, rebuild:

```powershell
$env:PATH = (Get-Location).Path + "\node-v26.5.0-win-x64;" + $env:PATH
node node-v26.5.0-win-x64\node_modules\npm\bin\npm-cli.js run build --prefix web/frontend
```

Then restart the backend server.

### Server won't start

- Ensure port 8000 is not in use: `Get-NetTCPConnection -LocalPort 8000`
- Kill any stale process: `Stop-Process -Name python -ErrorAction SilentlyContinue`
- Verify dependencies are installed: `pip install -r requirements.txt`

---

## Project Structure

```
Harness/
├── .env                          # API keys and config (not in git)
├── .env.example                  # Template for .env
├── requirements.txt              # Python dependencies
├── run_harness.py                # CLI entry point (alternative to web app)
├── harness/                      # Core Python modules
│   ├── config.py                 # Environment config and constants
│   ├── api_client.py             # LLM API client (Groq/OpenAI/Nararouter)
│   ├── mock_client.py            # Mock API client for testing
│   ├── prompt_loader.py          # Loads prompt templates from files
│   ├── output_store.py           # Saves phase outputs to disk
│   ├── utils.py                  # Token counting, compression, context building
│   └── workflow.py               # CLI workflow orchestration
├── Innovation Prompts/           # 13 phase prompt templates + system prompt
├── outputs/                      # Session output directories
├── web/
│   ├── backend/
│   │   └── main.py               # FastAPI server (API + static frontend)
│   └── frontend/
│       ├── src/                  # React source code
│       ├── dist/                 # Built frontend (served by backend)
│       ├── package.json          # Node.js dependencies
│       └── vite.config.js        # Vite build config
└── node-v26.5.0-win-x64/         # Bundled Node.js for building frontend
```

---

## Session Output Storage

Each session creates a directory under `outputs/`:

```
outputs/session_YYYYMMDD_HHMMSS/
├── phase_0_output.md
├── phase_1_output.md
├── ...
├── phase_0_edited.md            # (if user edited the output)
├── cumulative_output.md         # (if all phases completed)
└── session_state.json           # Session metadata
```
