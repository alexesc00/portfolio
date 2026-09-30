from typing import Any, Dict

import yaml
from yaml.loader import SafeLoader


def load_yaml(path: str) -> Dict[str, Any]:
    """Loads in the input yaml file. If the file path is not found, raises a FileNotFoundError

    Args:
        path (str): File path for the yaml file. Can use relative file path if yaml file is in the current working
        directory, otherwise you must use the absolute file path of the yaml file.

    Returns:
        dict: A dictionary that emulates the structure and content of the yaml file through nested dictionaries

     Usage Example:
        ```python
        config_yaml_path = "config.yaml"
        config_yaml_dict = load_yaml(config_yaml_path)
        ```
    """
    try:
        with open(path) as file:
            config: Dict[str, Any] = yaml.load(file, Loader=SafeLoader)
            return config
    except FileNotFoundError:
        raise FileNotFoundError("load_yaml function failed, file not found")
