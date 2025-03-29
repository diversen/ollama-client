#!/bin/sh
black . --config pyproject.toml
mypy  --config-file pyproject.toml .
flake8 . --config .flake8