# Helpers for JSON API routes — reduces duplicated error handling.
from flask import jsonify
from app.models import ALL_ROLES
from app.models import Milestone, Project
from app.store import get_project


def json_error(message: str, status: int):
    return jsonify(error=message), status


def json_project(project: Project):
    return jsonify(project=project.to_dict())


def require_project():
    # Return (project, error_response) — error_response is None when ok.
    project = get_project()
    if not project:
        return None, json_error("No project exists. Create one first.", 404)
    return project, None


def get_milestone(project: Project, index: int):
    # Return (milestone, error_response) — error_response is None when ok.
    if index < 0 or index >= len(project.milestones):
        return None, json_error("Milestone not found", 404)
    return project.milestones[index], None

def reset_milestone_approvals(milestone: Milestone) -> None:
    # Clear approval flags when a milestone is submitted for verification.
    milestone.approvals = {role: False for role in ALL_ROLES}
