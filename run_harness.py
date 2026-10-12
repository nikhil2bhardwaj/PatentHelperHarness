import argparse
import sys
from typing import Optional

from rich.console import Console

from harness.config import OPENAI_MODEL, OPENAI_TEMPERATURE, OPENAI_MAX_TOKENS, API_PROVIDER, GROQ_MODEL
from harness.api_client import APIClient
from harness.mock_client import MockAPIClient
from harness.output_store import OutputStore
from harness.workflow import Workflow

console = Console()


def main():
    parser = argparse.ArgumentParser(
        description="Patent Helper Harness - Automotive R&D Patent Ideation Pipeline"
    )
    parser.add_argument(
        "--resume",
        type=str,
        default=None,
        help="Path to a session directory to resume (e.g., outputs/session_20240101_120000/)",
    )
    parser.add_argument(
        "--model",
        type=str,
        default=None,
        help=f"OpenAI model to use (default: {OPENAI_MODEL})",
    )
    parser.add_argument(
        "--temperature",
        type=float,
        default=None,
        help=f"Temperature for generation (default: {OPENAI_TEMPERATURE})",
    )
    parser.add_argument(
        "--max-tokens",
        type=int,
        default=None,
        help=f"Max tokens for response (default: {OPENAI_MAX_TOKENS})",
    )
    parser.add_argument(
        "--input",
        type=str,
        default=None,
        help="Initial user input text (skips interactive prompt)",
    )
    parser.add_argument(
        "--start-phase",
        type=int,
        default=None,
        help="Phase to start from (0-12, for resume override)",
    )
    parser.add_argument(
        "--mock",
        action="store_true",
        help="Use mock API client (no OpenAI API needed, for testing)",
    )
    parser.add_argument(
        "--provider",
        type=str,
        default=None,
        choices=["openai", "anthropic", "gemini", "openaicompatible", "groq", "nararouter"],
        help="API provider: 'openai', 'anthropic', 'gemini', or 'openaicompatible' (default: from .env)",
    )
    parser.add_argument(
        "--base-url",
        type=str,
        default=None,
        help="Custom base URL for OpenAI-compatible endpoints (e.g. http://localhost:11434/v1)",
    )
    parser.add_argument(
        "--api-key",
        type=str,
        default=None,
        help="Custom API key override",
    )

    args = parser.parse_args()

    if args.mock:
        console.print("[yellow][MOCK MODE] Using simulated API client. No external API calls will be made.[/yellow]\n")
        api_client = MockAPIClient(
            model=args.model,
            temperature=args.temperature,
            max_tokens=args.max_tokens,
        )
    else:
        provider = args.provider or API_PROVIDER
        api_client = APIClient(
            model=args.model,
            temperature=args.temperature,
            max_tokens=args.max_tokens,
            provider=provider,
            base_url=args.base_url,
            api_key=args.api_key,
        )
        console.print(f"[dim]Provider: {provider} | Model: {api_client.model}[/dim]")

    if args.resume:
        output_store = OutputStore(session_dir=args.resume)
        state = output_store.load_session_state()
        if not state:
            console.print(f"[red]No session state found in {args.resume}[/red]")
            sys.exit(1)

        console.print(f"[green]Resuming session: {args.resume}[/green]")
        console.print(f"[dim]Completed phases: {state.get('completed_phases', [])}[/dim]")

        user_input = state.get("user_input", "")
        start_phase = args.start_phase if args.start_phase is not None else (max(state.get("completed_phases", [-1])) + 1)

        workflow = Workflow(api_client, output_store, user_input=user_input)
        workflow.restore_from_state(state)
        workflow.run(start_phase=start_phase)

    else:
        console.print("[bold cyan]Patent Helper Harness[/bold cyan]")
        console.print("[dim]Automotive R&D Patent Ideation Pipeline[/dim]\n")

        if args.input is not None:
            user_input = args.input
        else:
            console.print("Enter your initial input (or press Enter for Autonomous mode):")
            user_input = console.input("> ").strip()

        if user_input:
            console.print(f"\n[green]User input received. Running in User-Guided/Hybrid mode.[/green]\n")
        else:
            console.print(f"\n[green]No input provided. Running in Autonomous mode.[/green]\n")

        output_store = OutputStore()
        console.print(f"[dim]Session directory: {output_store.session_dir}[/dim]\n")

        workflow = Workflow(api_client, output_store, user_input=user_input)
        workflow.run(start_phase=0)


if __name__ == "__main__":
    main()
