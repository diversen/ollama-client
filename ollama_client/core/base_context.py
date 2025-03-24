from starlette.requests import Request
import logging
from ollama_client import __version__
import uuid
from ollama_client.core import flash
from ollama_client.core import session
from ollama_client.models import user_model


from config import RELOAD


logger: logging.Logger = logging.getLogger(__name__)


async def get_context(request: Request, variables):
    logger.debug(f"RELOAD: {RELOAD}")
    if not RELOAD:
        version = __version__
    else:
        version = uuid.uuid4().hex[:8]

    version = __version__

    user_id = await session.is_logged_in(request)
    profile = await user_model.get_profile(user_id)

    default_context = {
        "logged_in": user_id,
        "user_id": user_id,
        "profile": profile,
        "request": request,
        "version": version,
        "flash_messages": flash.get_messages(request=request),
    }

    context = {**default_context, **variables}
    return context
