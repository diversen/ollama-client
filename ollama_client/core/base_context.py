from starlette.requests import Request
import logging
from ollama_client import __version__
from ollama_client.core import flash
from ollama_client.core import session
from ollama_client.models import user_model
import config


logger: logging.Logger = logging.getLogger(__name__)


async def get_context(request: Request, variables):

    user_id = await session.is_logged_in(request)
    profile = await user_model.get_profile(user_id)
    use_katex = getattr(config, "USE_KATEX", False)

    default_context = {
        "logged_in": user_id,
        "user_id": user_id,
        "profile": profile,
        "request": request,
        "version": __version__,
        "use_katex": use_katex,
        "flash_messages": flash.get_messages(request=request),
    }

    context = {**default_context, **variables}
    return context
