from starlette.requests import Request
from starlette.routing import Route
from starlette.responses import StreamingResponse, JSONResponse, RedirectResponse
from ollama import AsyncClient
import json
from ollama_client.core import base_context
from ollama_client.core import flash
import config
import logging
from ollama_client.core import session
from ollama_client.core.templates import get_templates
from ollama_client.models import chat_model, user_model
from ollama_client.core.exceptions import UserValidate
from config import TOOLS_AVAILABLE, TOOLS_CALLBACK
from ollama_client.tools import tools_utils


logger: logging.Logger = logging.getLogger(__name__)
templates = get_templates()


async def chat_page(request: Request):
    logged_in = await session.is_logged_in(request)
    if not logged_in:
        flash.set_notice(request, "You must be logged in to access the chat")
        return RedirectResponse("/user/login")

    model_names = await _get_model_names()

    context = {
        "chat": True,
        "model_names": model_names,
        "default_model": config.DEFAULT_MODEL,
        "request": request,
        "title": "Ollama Chat",
    }

    context = await base_context.get_context(request, context)
    return templates.TemplateResponse("home/chat.html", context)


async def _chat_response_stream(messages, model, logged_in):
    profile = await user_model.get_profile(logged_in)
    if "system_message" in profile and profile["system_message"]:
        system_message = profile["system_message"]
        logger.debug(f"System message: {system_message}")

        system_message_dict = {
            "role": "system",
            "content": system_message,
        }
        messages.insert(0, system_message_dict)

    try:
        client = AsyncClient()
        chat_args = {
            "model": model,
            "options": {
                # "top_k": 100, #  Limits the sampling pool to the top k tokens
                # "top_p": 0.0001,  # 0 - 1 limits sampling to tokens with cumulative probability ≤ p
                # "num_predict": 10,  # Max number of tokens to generate
                # "temperature": 1,  # 0 to 1 (default is 0.8)
                # "seed": 123,  # Seed in order to get the same results
                # "presence_penalty": 2,
                # "frequency_penalty": 2,
            },
            "messages": messages,
            "stream": True,
        }

        if tools_utils.is_tools_available(model):
            logger.info(f"Tools available for model: {model}")
            chat_args["tools"] = TOOLS_AVAILABLE
        else:
            logger.info(f"No tools available for model: {model}")

        response = await client.chat(**chat_args)
        first_part = True
        async for part in response:
            part_dict = part.model_dump()

            # Tools are detected in the first part
            if first_part and tools_utils.is_tool_part(part_dict):
                first_part = False
                data = tools_utils.call_tools(part_dict["message"]["tool_calls"])
                yield f"data: {json.dumps(data)}\n\n"
            else:
                part_json = json.dumps(part_dict)
                logger.info(f"Part: {part_json}")
                yield f"data: {part_json}\n\n"

    except Exception:
        logger.exception("Streaming error")
        yield json.dumps({"error": "Streaming failed"})


async def chat_response_stream(request: Request):
    logged_in = await session.is_logged_in(request)
    if not logged_in:
        return JSONResponse({"error": True, "message": "You must be logged in to use the chat"}, status_code=401)

    data = await request.json()
    messages = data["messages"]
    model = data["model"]
    return StreamingResponse(
        _chat_response_stream(messages, model, logged_in),
        media_type="text/event-stream",
    )


async def config_(request: Request):
    """
    Get frontend configuration
    """
    config_ = {
        "default_model": config.DEFAULT_MODEL,
        "tools_callback": config.TOOLS_CALLBACK,
    }

    return JSONResponse(config_)


async def json_tools(request: Request):
    """
    A tool can call this endpoint using JSON data.
    The server will then call a function
    The JSON data is in the form of which specify the tool to call

    {
        "module": "ollama_serv.tools.python_exec",
        "def": "execute",
    }

    """

    # Get JSON data
    data = await request.json()
    tool = request.path_params["tool"]

    # Get tool definition
    tool_def = TOOLS_CALLBACK.get(tool, None)
    if not tool_def:
        return JSONResponse({"tool": tool, "text": "Tool not found"}, status_code=404)

    try:
        # import module and call function
        module = __import__(tool_def["module"], fromlist=[tool_def["def"]])
        function = getattr(module, tool_def["def"])
        ret_data = function(data)

    except Exception:
        logger.exception(f"Error calling tool {tool}")

    return JSONResponse({"tool": tool, "text": ret_data})


async def _get_model_names(sort_by_name=True):
    try:
        client = AsyncClient()
        data = await client.list()

        model_names = []
        model_list = data.models

        for model in model_list:
            model_names.append(model.model)

        if sort_by_name:
            model_names.sort()

        return model_names
    except Exception:
        raise Exception("System could not get Ollama model names from Ollama API")


async def list_models(request: Request):
    model_names = await _get_model_names()
    return JSONResponse({"model_names": model_names})


async def create_dialog(request: Request):
    """
    Save dialog to database
    """
    try:
        dialog_id = await chat_model.create_dialog(request)
        return JSONResponse({"error": False, "dialog_id": dialog_id, "message": "Dialog saved"})
    except UserValidate as e:
        return JSONResponse({"error": True, "message": str(e)})
    except Exception:
        logger.exception("Error saving dialog")
        return JSONResponse({"error": True, "message": "Error saving dialog"})


async def create_message(request: Request):
    """
    Save message to database
    """
    try:
        message_id = await chat_model.create_message(request)
        return JSONResponse({"message_id": message_id})
    except UserValidate as e:
        return JSONResponse({"error": True, "message": str(e)})
    except Exception:
        logger.exception("Error saving message")
        return JSONResponse({"error": True, "message": "Error saving message"})


async def get_dialog(request: Request):
    """
    Get dialog from database
    """
    try:
        dialog = await chat_model.get_dialog(request)
        return JSONResponse(dialog)
    except UserValidate as e:
        return JSONResponse({"error": True, "message": str(e)})
    except Exception:
        logger.exception("Error getting dialog")
        return JSONResponse({"error": True, "message": "Error getting dialog"})


async def get_messages(request: Request):
    """
    Get messages from database
    """
    try:
        messages = await chat_model.get_messages(request)
        return JSONResponse(messages)
    except UserValidate as e:
        return JSONResponse({"error": True, "message": str(e)})
    except Exception:
        logger.exception("Error getting messages")
        return JSONResponse({"error": True, "message": "Error getting messages"})


async def delete_dialog(request: Request):
    """
    Delete dialog from database
    """
    try:
        await chat_model.delete_dialog(request)
        flash.set_success(request, "Dialog deleted")
        return JSONResponse({"error": False, "redirect": "/user/dialogs"})
    except UserValidate as e:
        return JSONResponse({"error": True, "message": str(e)})
    except Exception:
        logger.exception("Error deleting dialog")
        return JSONResponse({"error": True, "message": "Error deleting dialog"})


routes_chat: list = [
    Route("/", chat_page),
    Route("/chat/{dialog_id:str}", chat_page),
    Route("/chat", chat_response_stream, methods=["POST"]),
    Route("/tools/{tool:str}", json_tools, methods=["POST"]),
    Route("/config", config_),
    Route("/list", list_models, methods=["GET"]),
    Route("/chat/create-dialog", create_dialog, methods=["POST"]),
    Route("/chat/create-message/{dialog_id}", create_message, methods=["POST"]),
    Route("/chat/delete-dialog/{dialog_id}", delete_dialog, methods=["POST"]),
    Route("/chat/get-dialog/{dialog_id}", get_dialog, methods=["GET"]),
    Route("/chat/get-messages/{dialog_id}", get_messages, methods=["GET"]),
]
