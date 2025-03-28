# Ollama client

A simple multi-user HTML client for the Ollama API.

## Requirements

You will need an instance of the ollama service running.

## Features

* user authentication and registration
* user profile
* user dialog history
* user dialog management (delete dialogs)
* user may continue dialogs
* tool support (if enabled)
* python execution (if enabled)

## Installation pipx

Install latest version of ollama-client globaly:

<!-- LATEST-VERSION-PIPX -->
	pipx install git+https://github.com/diversen/ollama-client@v0.1.16

Make a dir for configuration and data:

```bash
mkdir ollama_test
cd ollama_test
```

Initialize the configuration and data dir:

```bash
ollama-client
ollama-client init-system
ollama-client create-user
ollama-client server-dev
```


## Installation using uv and pip

```bash
git clone https://github.com/diversen/ollama-client.git
cd ollama-client
uv venv
source .venv/bin/activate
uv pip install -r requirements.txt
uv pip install -e .
```

## Stack

* starlette, 
* jinja2 html templates
* plain javascript.
* sqlite3 for data storage
* uvicorn or gunicorn for running a server

```

MIT © [Dennis Iversen](https://github.com/diversen)
