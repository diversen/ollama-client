"""
Add the path of the project to the system path so that the a config file can
be imported from where the execution is taking place.

"""

import sys
import os


sys.path.append(os.path.join(os.path.dirname(__file__), "../../"))


def get_system_paths():
    """
    Get system paths
    """
    return sys.path
