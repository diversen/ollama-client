import logging
from pathlib import Path


# SMTP
class ConfigSMTP:

    HOST = "smtp-relay.brevo.com"
    PORT = 587
    USERNAME = "mail@mail.dk"
    PASSWORD = "password"
    DEFAULT_FROM = "Server <mail@10kilobyte.com>"


# Default model
DEFAULT_MODEL = "deepseek-r1:14b"

# Logging
LOG_LEVEL = logging.INFO
RELOAD = True

# Data path for logs and database
DATA_DIR = "data"
DATABASE = Path(DATA_DIR) / Path("database.db")

# A docker image that can be used to execute python code safely
PYTHON_EXEC_TEMPLATE = (
    "docker run --network none --init --rm --memory=256m --memory-swap=256m "
    "--cpus='0.5' --ulimit nproc=2000:2000 --ulimit stack=67108864 "
    "-v {filename}:/sandbox/script.py secure-python script.py"
)

# Very simple PYTHON_EXEC_TEMPLATE but unasafe
# PYTHON_EXEC_TEMPLATE = "python3 {filename}"

# Not enabled
PYTHON_EXEC_TEMPLATE = ""

# Tools that can be called from the frontend
TOOLS_CALLBACK = {
    # this tool may be called on /tools/python
    # The tool will call the function execute in the module ollama_client.tools.python_exec
    # The result will be added to the dialog
    "python": {
        "module": "ollama_client.tools.python_exec",
        "def": "execute",
    }
}

HOSTNAME_WITH_SCHEME = "http://localhost:8000"
SITE_NAME = "localhost"

SECRET_KEY = "SECRET_KEY_9E22443E1889947E8BFC31138C967"


# Model tools configuration
# In my expirence most models are not very good at handling tools
# And also: If using tools with a model you loss the ability to stream the response
# The response will be returned as a single response
# But anyway here is an example of how to use tools with models


def add_two_numbers(a: int, b: int) -> str:
    """
    Add two numbers

    Args:
      a: The first integer number
      b: The second integer number

    Returns:
      str: The sum of the two numbers
    """
    return f"The result of adding {a} and {b} is: {a + b}"


# Models that may use tools
# Leave empty if no models may use tools
TOOL_MODELS = ["mistral-nemo:latest"]

# Tools available
TOOLS_AVAILABLE = [add_two_numbers]
