#!/usr/bin/env python
"""
Convenience manage.py at repository root so commands like
`python manage.py migrate` work when the working directory is /app.
It forwards to the Django project in backend/.
"""
import os
import sys


def _normalize_argv(argv):
    """
    Convert common unicode dashes (em/en) to standard double-dash so options like
    “—deploy” are interpreted correctly instead of as app labels.
    """
    if not argv:
        return argv

    dash_chars = "\u2013\u2014"  # en dash, em dash
    normalized = [argv[0]]
    for arg in argv[1:]:
        if arg and arg[0] in dash_chars:
            # Replace leading unicode dash with standard double dash
            arg = "--" + arg.lstrip(dash_chars + "-")
            if arg == "--":
                continue  # skip stray dash-only args
        normalized.append(arg)
    return normalized


def main() -> None:
    base_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.join(base_dir, "backend")

    # Ensure backend/ is on the Python path so `core` can be imported
    if backend_dir not in sys.path:
        sys.path.insert(0, backend_dir)

    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")

    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc

    execute_from_command_line(_normalize_argv(sys.argv))


if __name__ == "__main__":
    main()
