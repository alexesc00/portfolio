from typing import Callable

import streamlit as st

from polydelta_streamlit_helpers.css import inject_css
from polydelta_streamlit_helpers.style import generic_page_config
from polydelta_streamlit_helpers.utils import load_yaml


def run_page(page_logic_function: Callable[[], None]) -> None:
    """Set up the page and execute the provided page logic.

    This function sets up page configuration and applies base styling
    before executing the provided page logic. Use it in every file that
    leads users to a page, whether the entry point or a multipage file.

    Args:
        page_logic_function (Callable): function of the user's page as defined in page_logic directory

    Usage Example

        ```python
        from polydelta_streamlit_helpers.run_page import run_page
        from page_logic.page import my_page

        run_page(page_logic_function=my_page)
        ```
    """
    params = load_yaml("params.yaml")
    # Page config has to be set before any other streamlit commands, such as caching!
    st.set_page_config(
        page_title=params["page_config"]["page_title"],
        initial_sidebar_state=params["page_config"]["initial_sidebar_state"],
    )

    with open("assets/style_light.css") as f:
        inject_css(f.read())

    generic_page_config(page_width=params["page_config"]["page_width"])
    st.logo(
        "assets/missionml-light.svg",
        size="large",
        link=None,
        icon_image="assets/missionml-light.svg",
    )

    page_logic_function()  # run your page
