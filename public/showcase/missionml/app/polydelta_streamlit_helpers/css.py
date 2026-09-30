"""Custom CSS injection.

Every custom <style> block goes through inject_css(), which tags it with a
`data-brand-css` attribute. A page that embeds this app (for example the
portfolio site running it with stlite) can then switch the branding off by
disabling exactly those blocks, without rerunning the app.
"""

import re

import streamlit as st

BRAND_CSS_ATTR = "data-brand-css"

# Streamlit hides an st.html block that holds only CSS, but stops hiding it
# while the script reruns. Each block then takes the 16px gap between
# elements, and the page below it drops and jumps back when the run ends.
# This keeps the blocks hidden throughout. It's left untagged so it stays on
# when a host page switches the brand off.
_KEEP_HIDDEN = (
    f'<style>[data-testid="stElementContainer"]:has(style[{BRAND_CSS_ATTR}])'
    " { display: none; }</style>"
)


def inject_css(css: str) -> None:
    """Add a tagged <style> block to the page.

    Args:
        css (str): CSS rules, with or without a surrounding <style> tag

    Usage Example:
        ```python
        inject_css(".my-card { border-radius: 8px; }")
        ```
    """
    css = css.strip()
    if css.startswith("<style"):
        css = re.sub(r"^<style\b", f"<style {BRAND_CSS_ATTR}", css, count=1)
    else:
        css = f"<style {BRAND_CSS_ATTR}>{css}</style>"
    st.html(_KEEP_HIDDEN + css)
