from datetime import date

from app.models import Milestone, Project

_project: Project | None = None

#get the current project
def get_project() -> Project | None:
    return _project

#set the current project
def set_project(project: Project) -> None:
    global _project
    _project = project

#reset the current project
def reset_project() -> None:
    global _project
    _project = None

#create a new project
def create_project(
    name: str,
    total_budget: float,
    milestones_data: list[dict],
) -> Project:
    milestones = [
        Milestone(
            name=item["name"],
            expected_completion_date=item["expected_completion_date"],
            budget_percentage=float(item["budget_percentage"]),
        )
        for item in milestones_data
    ]
    project = Project(name=name, total_budget=total_budget, milestones=milestones)
    set_project(project)
    return project


def parse_milestone_payload(raw: list[dict]) -> tuple[list[dict], str | None]:
    #Validate milestone JSON and return parsed rows or an error message.
    if not raw:
        return [], "At least one milestone is required"

    parsed: list[dict] = []
    total_pct = 0.0

    for index, item in enumerate(raw):
        label = f"Milestone {index + 1}"
        name = (item.get("name") or "").strip()
        date_str = item.get("expected_completion_date")
        pct_raw = item.get("budget_percentage")

        if not name:
            return [], f"{label}: name is required"
        if not date_str:
            return [], f"{label}: expected completion date is required"

        try:
            completion_date = date.fromisoformat(date_str)
        except ValueError:
            return [], f"{label}: invalid date (use YYYY-MM-DD)"

        try:
            pct = float(pct_raw)
        except (TypeError, ValueError):
            return [], f"{label}: budget percentage must be a number"

        if pct <= 0 or pct > 100:
            return [], f"{label}: budget percentage must be between 0 and 100"

        total_pct += pct
        parsed.append(
            {
                "name": name,
                "expected_completion_date": completion_date,
                "budget_percentage": pct,
            }
        )

    if abs(total_pct - 100.0) > 0.01:
        return [], f"Milestone budget percentages must sum to 100% (currently {total_pct:.1f}%)"

    return parsed, None
