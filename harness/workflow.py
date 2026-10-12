import os
import json
import tempfile
from typing import Dict, Optional

from rich.console import Console
from rich.markdown import Markdown
from rich.json import JSON
from rich.panel import Panel
from rich.syntax import Syntax

from harness.config import PHASE_NAMES, USE_JSON_OUTPUT, COMPRESS_PHASE_OUTPUTS
from harness.prompt_loader import load_system_prompt, load_all_prompts, substitute_variables
from harness.api_client import APIClient
from harness.output_store import OutputStore
from harness.utils import (
    count_tokens,
    build_historical_context,
    build_cumulative_context,
    open_in_editor,
    compress_phase_output,
)

console = Console()


class Workflow:
    def __init__(
        self,
        api_client: APIClient,
        output_store: OutputStore,
        user_input: str = "",
    ):
        self.api_client = api_client
        self.output_store = output_store
        self.user_input = user_input
        self.system_prompt = load_system_prompt()
        self.prompts = load_all_prompts()
        self.phase_outputs: Dict[int, str] = {}
        self.feedback: Dict[int, str] = {}

    def run(self, start_phase: int = 0, end_phase: int = 12):
        for phase in range(start_phase, end_phase + 1):
            result = self._run_phase(phase)
            if result == "exit":
                self._save_state(phase, completed=False)
                console.print("[yellow]Session saved. Resume with:[/yellow]")
                console.print(f"  python run_harness.py --resume {self.output_store.session_dir}")
                return
            if result == "rerun":
                while result == "rerun":
                    result = self._run_phase(phase)
                    if result == "exit":
                        self._save_state(phase, completed=False)
                        return

        self._save_state(end_phase, completed=True)
        console.print("\n[bold green]All phases complete![/bold green]")
        console.print(f"Outputs saved in: {self.output_store.session_dir}")

    def _run_phase(self, phase: int) -> str:
        prompt = self.prompts[phase]
        console.print(Panel(
            f"[bold cyan]Phase {phase}: {prompt.name}[/bold cyan]",
            border_style="cyan",
        ))

        values = self._build_variable_values(phase)
        user_prompt = substitute_variables(prompt.template, values)

        if phase in self.feedback:
            user_prompt = f"[ADDITIONAL USER FEEDBACK]\n{self.feedback[phase]}\n[/ADDITIONAL USER FEEDBACK]\n\n{user_prompt}"

        token_count = count_tokens(self.system_prompt) + count_tokens(user_prompt)
        console.print(f"[dim]Estimated input tokens: {token_count}[/dim]")

        if COMPRESS_PHASE_OUTPUTS and phase > 0:
            prev_full = self.phase_outputs.get(phase - 1, "")
            prev_compressed = values.get(f"PHASE_{phase - 1}_OUTPUT", "")
            if prev_full and prev_compressed and prev_full != prev_compressed:
                full_tokens = count_tokens(prev_full)
                comp_tokens = count_tokens(prev_compressed)
                console.print(f"[dim]Output compression: {full_tokens} → {comp_tokens} tokens ({100*(full_tokens-comp_tokens)//full_tokens}% saved)[/dim]")

        console.print("[dim]Calling API...[/dim]")
        output = self.api_client.chat(self.system_prompt, user_prompt, json_mode=USE_JSON_OUTPUT)

        self.output_store.save_phase_output(phase, output)

        cumulative_path = os.path.join(self.output_store.session_dir, f"all_phases_output.{('json' if USE_JSON_OUTPUT else 'md')}")
        console.print(f"[dim]Cumulative file: {cumulative_path}[/dim]")

        self._display_output(output)
        console.print()

        return self._gate(phase, output)

    def _display_output(self, output: str):
        """Display output as JSON or markdown depending on format."""
        if USE_JSON_OUTPUT:
            try:
                data = json.loads(output)
                console.print(JSON.from_data(data))
            except (json.JSONDecodeError, TypeError):
                console.print(Syntax(output, "json", theme="monokai", line_numbers=False))
        else:
            console.print(Markdown(output))

    def _gate(self, phase: int, output: str) -> str:
        while True:
            console.print("\n[bold]Gate Options:[/bold]")
            console.print("  [1] Accept  - proceed to next phase")
            console.print("  [2] Edit    - open in editor")
            console.print("  [3] Feedback - provide feedback for next phase")
            console.print("  [4] Save & Exit")
            console.print("  [5] Rerun phase")
            console.print("  [6] View cumulative output (all phases so far)")

            choice = console.input("\nChoice [1-6]: ").strip()

            if choice == "1":
                self.phase_outputs[phase] = output
                return "accept"

            elif choice == "2":
                edited = self._edit_output(phase, output)
                self.output_store.save_phase_output(phase, edited, edited=True)
                self.phase_outputs[phase] = edited
                console.print("[green]Edited output saved and accepted.[/green]")
                return "accept"

            elif choice == "3":
                feedback = console.input("Enter feedback for the next phase: ").strip()
                if feedback:
                    self.feedback[phase + 1] = feedback
                    self.output_store.save_feedback(phase, feedback)
                    console.print("[green]Feedback saved. It will be prepended to the next prompt.[/green]")
                self.phase_outputs[phase] = output
                return "accept"

            elif choice == "4":
                self.phase_outputs[phase] = output
                return "exit"

            elif choice == "5":
                return "rerun"

            elif choice == "6":
                cumulative = self.output_store.load_cumulative()
                if cumulative:
                    ext = "json" if USE_JSON_OUTPUT else "md"
                    tmp_path = os.path.join(self.output_store.session_dir, f"all_phases_output.{ext}")
                    console.print(f"[dim]Opening {tmp_path}...[/dim]")
                    open_in_editor(tmp_path)
                else:
                    console.print("[red]No cumulative output found.[/red]")

            else:
                console.print("[red]Invalid choice. Please enter 1-6.[/red]")

    def _edit_output(self, phase: int, output: str) -> str:
        ext = ".json" if USE_JSON_OUTPUT else ".md"
        tmp_path = os.path.join(self.output_store.session_dir, f"phase_{phase}_edit_tmp{ext}")
        with open(tmp_path, "w", encoding="utf-8") as f:
            f.write(output)

        console.print("[dim]Opening editor... Save and close to continue.[/dim]")
        edited = open_in_editor(tmp_path)

        return edited

    def _build_variable_values(self, phase: int) -> Dict[str, str]:
        values: Dict[str, str] = {}

        if phase == 0:
            values["USER_INPUT"] = self.user_input if self.user_input else "(No user input provided. Proceed in Autonomous mode.)"

        if phase >= 1:
            prev_output = self.phase_outputs.get(phase - 1)
            if prev_output is None:
                prev_output = self.output_store.load_phase_output(phase - 1)
                if prev_output:
                    self.phase_outputs[phase - 1] = prev_output
            if prev_output:
                if COMPRESS_PHASE_OUTPUTS:
                    values[f"PHASE_{phase - 1}_OUTPUT"] = compress_phase_output(
                        prev_output, next_phase=phase, model=self.api_client.model
                    )
                else:
                    values[f"PHASE_{phase - 1}_OUTPUT"] = prev_output

        if phase == 11:
            historical = build_historical_context(
                self.phase_outputs,
                phases=[5, 6, 7, 8, 9],
                model=self.api_client.model,
            )
            values["HISTORICAL_CONTEXT"] = historical

        if phase == 12:
            cumulative = build_cumulative_context(
                self.phase_outputs,
                phases=[4, 5, 6, 7, 8, 9, 10],
                model=self.api_client.model,
            )
            values["CUMULATIVE_CONTEXT"] = cumulative

        return values

    def _save_state(self, current_phase: int, completed: bool):
        state = {
            "current_phase": current_phase,
            "completed": completed,
            "completed_phases": [p for p in sorted(self.phase_outputs.keys())],
            "user_input": self.user_input,
            "model": self.api_client.model,
        }
        self.output_store.save_session_state(state)

    def restore_from_state(self, state: Dict):
        self.user_input = state.get("user_input", "")
        for phase in state.get("completed_phases", []):
            output = self.output_store.load_phase_output(phase)
            if output:
                self.phase_outputs[phase] = output
            fb = self.output_store.load_feedback(phase)
            if fb:
                self.feedback[phase] = fb
