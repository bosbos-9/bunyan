from flask import Flask, jsonify, redirect, render_template, request, url_for

from app.api_helpers import (
    get_milestone,
    json_error,
    json_project,
    require_project,
    reset_milestone_approvals,
)
from app.models import ALL_ROLES
from app.store import create_project, get_project, parse_milestone_payload, reset_project


def register_routes(app: Flask) -> None:
    @app.template_filter("currency")
    def currency_filter(value):
        return f"${value:,.0f}"

    def project_dict():
        project = get_project()
        return project.to_dict() if project else None

    def render_with_project(template: str, active_page: str):
        #if there is no project redirect to project page
        project = project_dict()
        if not project:
            return redirect(url_for("project_page"))
        return render_template(template, project=project, active_page=active_page)

    @app.get("/")
    def project_page():
        return render_template(
            "project.html",
            project=project_dict(),
            active_page="project",
        )


    @app.get("/approvals")
    def approvals_page():
        return render_with_project("approvals.html", "approvals")

    @app.post("/api/project")
    #create a new project
    def api_create_project():
        body = request.get_json(silent=True) or {}
        name = (body.get("name")).strip()

        total_budget = float(body.get("total_budget"))
        if not total_budget:
            return json_error("Total budget is required", 400)
        if total_budget <= 0:
            return json_error("Total budget must be greater than zero", 400)
      
        if not name:
            return json_error("Project name is required", 400)

        milestones_data, error = parse_milestone_payload(body.get("milestones") or [])
        if error:
            return json_error(error, 400)

        project = create_project(name, total_budget, milestones_data)
        return json_project(project)

    @app.post("/api/milestones/<int:milestone_index>/submit")
    def api_submit_milestone(milestone_index: int):
        project = get_project()
        if not project:
            return json_error("No project exists. Create one first.", 404)

        milestone = project.milestones[milestone_index]
        if not milestone:
            return json_error("Milestone not found", 404)

        if milestone.submitted:
            return json_error("Milestone already submitted for verification", 400)

        body = request.get_json(silent=True) or {}
        actual_cost = float(body.get("actual_cost"))
        if not actual_cost or actual_cost <= 0:
            return json_error("Actual cost must be a positive number", 400)

        milestone.actual_cost = actual_cost
        milestone.submitted = True
        reset_milestone_approvals(milestone)
        return json_project(project)

    @app.post("/api/milestones/<int:milestone_index>/approve")
    def api_approve(milestone_index: int):
        project = get_project()
        if not project:
            return json_error("No project exists. Create one first.", 404)

        milestone = project.milestones[milestone_index]
        if not milestone:
            return json_error("Milestone not found", 404)

      
        body = request.get_json(silent=True) or {}
        role = body.get("role")
        if role not in ALL_ROLES:
            return json_error("Invalid role", 400)

        if not milestone.is_verified:
            milestone.approvals[role] = True

        return json_project(project)

    @app.delete("/api/project")
    def api_reset():
        reset_project()
        return jsonify(ok=True)
