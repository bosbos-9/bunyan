from pathlib import Path

from flask import Flask

from app.routes import register_routes

# Templates/static live at project root, not inside the app package.
BASE_DIR = Path(__file__).resolve().parent.parent


def create_app() -> Flask:
    app = Flask(
        __name__,
        template_folder=str(BASE_DIR / "templates"),
        static_folder=str(BASE_DIR / "static"),
    )
    register_routes(app)
    return app
