# Milestone Tracker

A small Flask web application that simulates milestone-based escrow for a single construction project. Create a project with a budget and milestones, collect three independent approvals per milestone (Engineer, REGA Inspector, Trustee), and watch funds move from in escrow to released on the dashboard.

Built for the Bunyan engineering assessment (Task 2).

## How to run locally

Requirements: Python 3.10+

### macOS / Linux

```bash
git clone git@github.com:bosbos-9/bunyan.git
cd bunyan
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python run.py
```

### Windows

```powershell
git clone git@github.com:bosbos-9/bunyan.git
cd bunyan
py -3 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python run.py
```

Open local link in your browser.

## Pages

| URL | Purpose |
|-----|---------|
| `/` | **Project** — create a project or view project overview |
| `/approvals` | **Approvals** — verify milestones and track progress(Engineer, REGA, Trustee) |

## Quick walkthrough

1. Create a project with milestones set your budget and milestones.
2. On Project page, the PM submits each completed milestone with its actual cost.
3. Submitted milestones appear on approvals for Engineer, REGA Inspector, and Trustee.
4. On full approval, actual cost is released and remaining amount is updated.
5. Dashboard tracks raised, released, and escrow. Surplus returns to investors and appear only when all milestones are verified and total spend is under budget no financial functions happening this is just a dmeonstration.
6. Start over clears in-memory state.

## Design decisions

### Stack: Flask + vanilla HTML/JS

- Flask (Python) owns pages, business rules, validation, and in-memory state (`app/models.py`, `app/store.py`, `app/routes.py`).
- JavaScript handles interactive UI only: dynamic create form, submit/approve without full page reloads, pie chart, toasts.
- flask was chosen for faster implemention as my skills in pyhthon is higher
- as for interacting with frontend elements JS was used.

### Data model

- only one Project at a time.
- Each Milestone has name, expected completion date, budget percentage, and three boolean approvals.
- Milestones start as draft until the PM submits them with an `actual_cost`.
- Verified when submitted and all three roles approve.
- Released = sum of `actual_cost` for verified milestones till point of vewing.
- Returned to investors = `max(0, total_budget − total_released)` when all milestones are verified max function was used to prevent negitive values when project is overbudget.
- Over budget = `max(0, total_released − total_budget)` when complete (no investor return).
- In escrow = `total_budget − released` while the project is in progress; $0 when complete.

### Validation

- At least one milestone; each percentage in (0, 100].
- Percentages must sum to 100%
- Invalid payloads return `400` with `{ "error": "..." }`.

### API

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/project` | Create project (JSON) |
| `POST` | `/api/milestones/<index>/submit` | PM submits `{"actual_cost": 40000}` |
| `POST` | `/api/milestones/<index>/approve` | `{"role": "engineer"}` etc. |
| `DELETE` | `/api/project` | Reset state |

## AI use disclosure

This project was built with assistance from Cursor(AI pair programming). Architecture, validation rules, and UI flow follow the assessment brief; Cursor helped scaffold files and styling. Escrow logic and the three-role verification gate were reviewed and are documented above.
to do this project in a quick manner Cursor modified most UI element and functions to ensure code modalraty

## Project structure

```text
bunyan/
├── app/
│   ├── __init__.py # Flask app factory
│   ├── models.py # Project/Milestone + budget rules
│   ├── store.py # In-memory state + validation
│   ├── api_helpers.py # Shared API error/response helpers
│   └── routes.py # Pages + JSON endpoints
├── static/
│   ├── common.js # Shared UI + fetch helpers
│   ├── project.js # Create form + PM milestones
│   ├── approvals.js # Approval workflow
│   ├── dashboard.js # pi chart and progress bar
│   └── style.css
├── templates/
│   └── index.html
├── run.py
├── requirements.txt
└── README.md
```