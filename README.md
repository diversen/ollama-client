# Ollama html client

A simple multi-user html client for the Ollama API.

## Stack

* starlette, 
* jinja2 html templates
* plain javascript.
* sqlite3 for data storage
* uvicorn or gunicorn for running a server

## Requirements

You will need an instance of the ollama service running.

## Features

* user authentication and registration
* user profile
* user dialog history
* user dialog management (delete dialog and messages)
* user may continue dialogs
* tool support (if enabled)
* python execution (if enabled)

## Installation pipx

Install latest version of ollama-client globaly:

<!-- LATEST-VERSION-PIPX -->
	pipx install git+https://github.com/diversen/ollama-client@v0.1.15

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


## Installation uv and pip

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

# Ignore SMTP and just create a user
ollama-client create-user

# Run the client server
ollama-client server-dev

# If data dir is not created then it will be created
# Default is ./data with default sqlite3 database ./data/database.db
# Logs are placed in ./data/main.log


```
