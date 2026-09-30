import streamlit as st

from polydelta_streamlit_helpers.css import inject_css


def generic_page_config(page_width: int) -> None:
    """Generic page config for streamlit apps.

    Args:
        page_width (int): Page width proportion. Takes value 1-100
    """
    # hide red-yellow ribbon header
    HIDE_DECORATION_BAR_STYLE = """
        <style>
            header {visibility: hidden;}
        </style>
    """
    inject_css(HIDE_DECORATION_BAR_STYLE)
    # Updated in 1.40: https://discuss.streamlit.io/t/css-for-controlling-app-width-no-longer-works-in-streamlit-1-40/86205
    PAGE_WIDTH_CSS = f"""<style>
                section[data-testid="stMain"] > div[data-testid="stMainBlockContainer"]{{
            max-width: {page_width}rem;
        }}
        </style>"""
    inject_css(PAGE_WIDTH_CSS)


def add_vertical_space(num_lines: int = 1) -> None:
    """Adds vertical space between two elements.

    Args:
        num_lines (int, optional): The number of h6 lines of spacing to add. Defaults to 1.

    Usage Example:
        ```python
        st.header("This is my header")
        add_vertical_space(num_lines=10)
        st.write("This text is far below the header")
        ```
    """
    for i in range(0, num_lines + 1):
        st.markdown(" ###### ")
