# Ollama html client

A simple multi-user html client for the Ollama API.

## Stack

* starlette, 
* jinja2 html templates
* plain javascript.
* sqlite3 for data storage
* uvicorn or unicorn for running a server

## Features

* user authentication and registration
* user profile
* user dialog history
* user dialog management (delete dialog and messages)
* user may continue dialog
* tool support (if enabled)
* python execution (if enabled)

## Installation

Using uv and pip

```bash
git clone https://github.com/diversen/ollama-client.git
cd ollama-client
uv venv
source .venv/bin/activate
uv pip install -r requirements.txt
uv pip install -e .
```

## Configuration

You need to edit the following configuration file:

```bash
cp config-dist.py config.py

# Check the config.py file for more information
# If using SMTP then at least change the SMTP settings
```

## Running the client server

```bash
ollama-client --help

# Run the client server
ollama-client server-dev

# Ignore SMTP and just create a user
ollama-client create-user
```
