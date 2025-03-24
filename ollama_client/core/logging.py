import logging
import os
from pathlib import Path
from config import DATA_DIR


logger: logging.Logger = logging.getLogger(__name__)

# check if data dir exists and create it if not
if not os.path.exists(DATA_DIR):
    os.makedirs(DATA_DIR)


def setup_logging(log_level: int = logging.INFO):
    """
    Configures the logging setup with the specified log level.
    """

    logger = logging.getLogger()
    logger.setLevel(log_level)
    logger.propagate = False

    # Remove existing handlers
    while logger.handlers:
        logger.handlers.pop()

    # Console Handler
    console_handler = logging.StreamHandler()
    console_handler.setLevel(log_level)
    console_formatter = logging.Formatter("%(asctime)s - %(levelname)s - %(message)s")
    console_handler.setFormatter(console_formatter)
    logger.addHandler(console_handler)

    # File Handler
    log_file = Path(DATA_DIR) / "main.log"
    file_handler = logging.FileHandler(log_file, mode="a", encoding="utf-8")
    file_handler.setLevel(log_level)
    file_formatter = logging.Formatter("%(asctime)s - %(levelname)s - %(message)s")
    file_handler.setFormatter(file_formatter)
    logger.addHandler(file_handler)

    logger.debug("Logging setup complete. Log level: %s", log_level)
