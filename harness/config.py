import os
from dotenv import load_dotenv

load_dotenv()

API_PROVIDER = os.getenv("API_PROVIDER", "openai")  # "openai" or "groq"

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o")
OPENAI_BASE_URL = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
GROQ_BASE_URL = "https://api.groq.com/openai/v1"

NARAROUTER_API_KEY = os.getenv("NARAROUTER_API_KEY", "")
NARAROUTER_MODEL = os.getenv("NARAROUTER_MODEL", "agnes-2.5-flash")
NARAROUTER_BASE_URL = os.getenv("NARAROUTER_BASE_URL", "https://router.bynara.id/v1")

OPENAI_TEMPERATURE = float(os.getenv("OPENAI_TEMPERATURE", "0.7"))
OPENAI_MAX_TOKENS = int(os.getenv("OPENAI_MAX_TOKENS", "4096"))

MAX_RETRIES = 3
RETRY_BASE_DELAY = 2  # seconds

TOKEN_WARNING_THRESHOLD = 50000

USE_JSON_OUTPUT = True
COMPRESS_PHASE_OUTPUTS = True
OUTPUT_COMPRESSION_THRESHOLD = 6000  # max tokens for phase-to-phase transfer

PROMPTS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "Innovation Prompts")
OUTPUTS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "outputs")

SYSTEM_PROMPT_FILE = "1. SystemPrompt.txt"
PROMPT_FILES = {
    0: "Prompt 0.md",
    1: "Prompt 1.txt",
    2: "Prompt 2.txt",
    3: "Prompt 3.txt",
    4: "Prompt 4.txt",
    5: "Prompt 5.txt",
    6: "Prompt 6.txt",
    7: "Prompt 7.txt",
    8: "Prompt 8.txt",
    9: "Prompt 9.txt",
    10: "Prompt 10.txt",
    11: "Prompt 11.txt",
    12: "Prompt 12.txt",
}

PHASE_NAMES = {
    0: "User Intent & Scope Setup",
    1: "Research",
    2: "Problem Discovery & Opportunity Mining",
    3: "Idea Generation",
    4: "Idea Screening & Shortlisting",
    5: "Prior Art & Patent Landscape Search",
    6: "Novelty & Inventive Step Analysis",
    7: "Technical Feasibility Analysis",
    8: "Cost & Effort Estimation",
    9: "Safety, Compliance & Risk Review",
    10: "Patent Abstract / Invention Disclosure Drafting",
    11: "Fact-Checking & Evidence Validation",
    12: "Final Recommendation & Decision Support",
}
