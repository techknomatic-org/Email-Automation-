import os
import logging
from logging.handlers import RotatingFileHandler

LOG_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "logs")
os.makedirs(LOG_DIR, exist_ok=True)

ERROR_LOG_PATH = os.path.join(LOG_DIR, "error.log")
APP_LOG_PATH = os.path.join(LOG_DIR, "app.log")

def setup_logging():
    """Configures persistent rotating file loggers for application errors and general activity."""
    log_formatter = logging.Formatter(
        "[%(asctime)s] [%(levelname)s] [%(name)s:%(lineno)d] - %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )

    # General App Logger
    app_logger = logging.getLogger()
    app_logger.setLevel(logging.INFO)

    # Error File Handler (Stores ERROR and CRITICAL logs only)
    error_file_handler = RotatingFileHandler(
        ERROR_LOG_PATH, maxBytes=10 * 1024 * 1024, backupCount=5, encoding="utf-8"
    )
    error_file_handler.setLevel(logging.ERROR)
    error_file_handler.setFormatter(log_formatter)

    # App File Handler (Stores INFO, WARNING, and ERROR logs)
    app_file_handler = RotatingFileHandler(
        APP_LOG_PATH, maxBytes=10 * 1024 * 1024, backupCount=5, encoding="utf-8"
    )
    app_file_handler.setLevel(logging.INFO)
    app_file_handler.setFormatter(log_formatter)

    # Add handlers if not already added
    if not any(isinstance(h, RotatingFileHandler) and h.baseFilename == ERROR_LOG_PATH for h in app_logger.handlers):
        app_logger.addHandler(error_file_handler)
    if not any(isinstance(h, RotatingFileHandler) and h.baseFilename == APP_LOG_PATH for h in app_logger.handlers):
        app_logger.addHandler(app_file_handler)

    logging.info(f"Logging initialized. Error log path: {ERROR_LOG_PATH}")

setup_logging()
logger = logging.getLogger("openoutreach")
