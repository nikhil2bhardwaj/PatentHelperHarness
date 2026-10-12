import os
import json
from datetime import datetime
from typing import Dict, Optional

from harness.config import OUTPUTS_DIR, PHASE_NAMES, USE_JSON_OUTPUT


class OutputStore:
    def __init__(self, session_dir: Optional[str] = None):
        if session_dir:
            self.session_dir = session_dir
        else:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            self.session_dir = os.path.join(OUTPUTS_DIR, f"session_{timestamp}")

        os.makedirs(self.session_dir, exist_ok=True)

    def save_phase_output(self, phase: int, content: str, edited: bool = False) -> str:
        suffix = "_edited" if edited else "_output"
        filename = f"phase_{phase}{suffix}.md"
        path = os.path.join(self.session_dir, filename)
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
        self.rebuild_cumulative()
        return path

    def _get_all_saved_phases(self) -> list:
        """Return list of (phase, content, edited) tuples for all saved phases."""
        results = []
        for phase in range(13):
            edited_content = None
            edited_path = os.path.join(self.session_dir, f"phase_{phase}_edited.md")
            if os.path.exists(edited_path):
                with open(edited_path, "r", encoding="utf-8") as f:
                    edited_content = f.read()

            if edited_content is not None:
                results.append((phase, edited_content, True))
                continue

            output_path = os.path.join(self.session_dir, f"phase_{phase}_output.md")
            if os.path.exists(output_path):
                with open(output_path, "r", encoding="utf-8") as f:
                    results.append((phase, f.read(), False))
        return results

    def rebuild_cumulative(self) -> str:
        """Rebuild the cumulative output file with a line-number index at the top."""
        ext = ".json" if USE_JSON_OUTPUT else ".md"
        path = os.path.join(self.session_dir, f"all_phases_output{ext}")
        saved = self._get_all_saved_phases()
        if not saved:
            return path

        sections = []
        for phase, content, edited in saved:
            phase_name = PHASE_NAMES.get(phase, f"Phase {phase}")
            tag = " (EDITED)" if edited else ""
            header = f"{'=' * 80}\nPHASE {phase}: {phase_name}{tag}\n{'=' * 80}"
            sections.append((phase, phase_name, tag, header, content))

        # Build the file in two passes: first compute line numbers, then write
        # Pass 1: Calculate index block size to offset line numbers
        index_header_lines = 4  # title + blank + "INDEX:" + blank
        index_entry_lines = len(sections)
        index_footer_lines = 2  # separator + blank
        index_total = index_header_lines + index_entry_lines + index_footer_lines

        # Pass 2: Build content and track line offsets
        body_lines = []
        phase_line_map = {}
        current_line = index_total + 1  # 1-indexed, content starts after index

        for phase, phase_name, tag, header, content in sections:
            header_lines = header.split("\n")
            for hl in header_lines:
                body_lines.append(hl)
                current_line += 1

            body_lines.append("")  # blank line after header
            current_line += 1

            phase_line_map[phase] = current_line  # first line of actual content

            content_lines = content.split("\n")
            for cl in content_lines:
                body_lines.append(cl)
                current_line += 1

            body_lines.append("")
            body_lines.append("")
            current_line += 2

        # Pass 3: Write the file with index
        with open(path, "w", encoding="utf-8") as f:
            f.write("CUMULATIVE PHASE OUTPUT INDEX\n")
            f.write("\n")
            f.write("INDEX:\n")
            for phase, phase_name, tag, header, content in sections:
                line_num = phase_line_map[phase]
                f.write(f"  Phase {phase:>2}: {phase_name}{tag:<10}  →  Line {line_num}\n")
            f.write("\n")
            f.write(f"{'─' * 80}\n")
            f.write("\n")

            for line in body_lines:
                f.write(line + "\n")

        return path

    def load_cumulative(self) -> Optional[str]:
        ext = ".json" if USE_JSON_OUTPUT else ".md"
        path = os.path.join(self.session_dir, f"all_phases_output{ext}")
        if os.path.exists(path):
            with open(path, "r", encoding="utf-8") as f:
                return f.read()
        return None

    def load_phase_output(self, phase: int, prefer_edited: bool = True) -> Optional[str]:
        if prefer_edited:
            edited_path = os.path.join(self.session_dir, f"phase_{phase}_edited.md")
            if os.path.exists(edited_path):
                with open(edited_path, "r", encoding="utf-8") as f:
                    return f.read()

        output_path = os.path.join(self.session_dir, f"phase_{phase}_output.md")
        if os.path.exists(output_path):
            with open(output_path, "r", encoding="utf-8") as f:
                return f.read()

        return None

    def save_session_state(self, state: Dict) -> None:
        path = os.path.join(self.session_dir, "session_state.json")
        with open(path, "w", encoding="utf-8") as f:
            json.dump(state, f, indent=2, ensure_ascii=False)

    def load_session_state(self) -> Optional[Dict]:
        path = os.path.join(self.session_dir, "session_state.json")
        if os.path.exists(path):
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
        return None

    def save_feedback(self, phase: int, feedback: str) -> None:
        path = os.path.join(self.session_dir, f"phase_{phase}_feedback.txt")
        with open(path, "w", encoding="utf-8") as f:
            f.write(feedback)

    def load_feedback(self, phase: int) -> Optional[str]:
        path = os.path.join(self.session_dir, f"phase_{phase}_feedback.txt")
        if os.path.exists(path):
            with open(path, "r", encoding="utf-8") as f:
                return f.read()
        return None

    def get_completed_phases(self) -> list:
        state = self.load_session_state()
        if state:
            return state.get("completed_phases", [])
        return []

    @staticmethod
    def list_sessions() -> list:
        if not os.path.exists(OUTPUTS_DIR):
            return []
        sessions = []
        for entry in sorted(os.listdir(OUTPUTS_DIR), reverse=True):
            full = os.path.join(OUTPUTS_DIR, entry)
            if os.path.isdir(full) and entry.startswith("session_"):
                sessions.append(full)
        return sessions
