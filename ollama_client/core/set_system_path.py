"""
Add the path of the project to the system path so that the a config file can
be imported from where the execution is taking place.

"""

import sys
import os


# add "." to the system path
sys.path.insert(0, ".")


def get_system_paths():
    """
    Get system paths
    """
    return sys.path
