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

# Reloading when code changes
RELOAD = True

# Data path for logs and database
DATA_DIR = "data"
DATABASE = Path(DATA_DIR) / Path("database.db")

# Used when sending emails
HOSTNAME_WITH_SCHEME = "https://home.10kilobyte.com"
SITE_NAME = "home.10kilobyte.com"

# NOTE: Session secret key. Change this to a more random string
SECRET_KEY = "SOME_SECRET_KEY"

# A docker image that can be used to execute python code in a secure environment
# See: https://github.com/diversen/secure-python
PYTHON_EXEC_TEMPLATE = (
    "docker run --network none --init --rm --memory=256m --memory-swap=256m "
    "--cpus='0.5' --ulimit nproc=2000:2000 --ulimit stack=67108864 "
    "-v {filename}:/sandbox/script.py secure-python script.py"
)

# NOTE: This is not a secure way to run arbitrary python code
PYTHON_EXEC_TEMPLATE = "python3 {filename}"

# Tools that can be called from the frontend
TOOLS_CALLBACK: dict = {
    # this tool may be called on /tools/python
    # The tool will call the function execute in the module ollama_client.tools.python_exec
    # The result will be added to the dialog
    # Uncomment in order to run python code.
    # This is an button option when python code is generated
    # "python": {
    #     "module": "ollama_client.tools.python_exec",
    #     "def": "execute",
    # }
}


# Model tools configuration

# In my expirence most models are not very good at handling tools
# And also: If using tools with a model you loss the ability to stream the response
# The response will be returned as a single response
# But anyway here is an example of how to use tools with models

# def add_two_numbers(a: int, b: int) -> str:
#     """
#     Add two numbers

#     Args:
#       a: The first integer number
#       b: The second integer number

#     Returns:
#       str: The sum of the two numbers
#     """
#     return f"The result of adding {a} and {b} is: {a + b}"


# # Models that may use ollama tools
# # Leave empty if no models may use tools
# TOOL_MODELS: list = ["mistral-nemo:latest"]

# # Tools available
# TOOLS_AVAILABLE: list = [add_two_numbers]

TOOL_MODELS: list = []
TOOLS_AVAILABLE: list = []
