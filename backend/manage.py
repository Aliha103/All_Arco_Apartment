#!/usr/bin/env python
"""Django's command-line utility for administrative tasks."""
import os
import sys


def _normalize_argv(argv):
    """
    Normalize CLI args:
    - Convert common unicode dashes (em/en) to standard double-dash so options like
      “—deploy” are interpreted correctly instead of as app labels.
    - For the `check` command, drop stray positional tokens (e.g., pasted log text)
      that would otherwise be treated as app labels and crash deployments.
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

    # If running `check`, strip non-flag positional args to avoid crashes from stray text
    if len(normalized) >= 2 and normalized[1] == "check":
        filtered = [normalized[0], normalized[1]]
        filtered.extend(arg for arg in normalized[2:] if arg.startswith("-"))
        return filtered

    return normalized


def main():
    """Run administrative tasks."""
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    execute_from_command_line(_normalize_argv(sys.argv))


if __name__ == '__main__':
    main()
