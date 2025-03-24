import logging
from logging import Logger
import config
from config import TOOLS_AVAILABLE, TOOL_MODELS

logger: Logger = logging.getLogger(__name__)


def is_tools_available(model: str):
    if not TOOLS_AVAILABLE:
        logger.debug("No tools available in config")
        return False

    tools_available = False
    if model in TOOL_MODELS:
        logger.debug(f"Tools available for model: {model}")
        tools_available = True
    else:
        logger.debug(f"No tools available for model: {model}")

    return tools_available


def is_tool_part(part_dict: dict):
    """
    Check if response part contains tool calls
    """

    if not TOOLS_AVAILABLE:
        return False

    if "tool_calls" in part_dict["message"] and part_dict["message"]["tool_calls"]:
        return True


def call_tools(tools_called: list):
    """
    Call the tools defined in the response parts
    reponse is in the same format as response parts from ollama
    """
    for tool in tools_called:
        try:
            logger.debug(f"Calling tool: {tool}")
            tool_definition = tool["function"]
            function_name = tool_definition["name"]
            arguments = tool_definition["arguments"]
            function = getattr(config, function_name, None)

            if function:
                result = function(**arguments)

                response = {
                    "message": {"content": f"{result}"},
                    "done": True,
                }

                return response
            else:
                logger.error(f"Tool not found: {function_name}")
                response = {
                    "message": {"content": f"Tool not found: {function_name}"},
                    "error": False,
                    "done": True,
                }
                return response

        except Exception as e:
            logger.exception(f"Tool call failed: {e}")
            response = {
                "message": {"content": f"Tool call failed for function: {function_name}"},
                "error": False,
                "done": True,
            }
            return response
