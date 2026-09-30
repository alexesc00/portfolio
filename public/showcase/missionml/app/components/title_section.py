"""A page title block: a small label, the title, a subtitle and detail lines."""

import html

import streamlit as st

from polydelta_streamlit_helpers.css import inject_css

_STYLES = """
<style>
.title-section .eyebrow {
    margin: 0 0 0.25rem 0;
    font-size: 12px;
    font-weight: 600;
    line-height: 1.2;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: #6A6A6A;
}

.title-section h1 {
    margin-bottom: 0.15rem;
    padding: 0;
    font-size: 30px !important;
    font-weight: 700 !important;
    line-height: 1.15;
    letter-spacing: -0.02em;
    color: #000000 !important;
}

.title-section h2 {
    margin-bottom: 0.35rem;
    padding: 0;
    font-size: 18px !important;
    font-weight: 600;
    line-height: 1.25;
    letter-spacing: -0.01em;
    color: #1A1A1A !important;
}

.title-section .details {
    margin-top: 0.35rem;
}

.title-section h3 {
    margin-bottom: 0.15rem;
    padding: 0;
    font-size: 14px !important;
    font-weight: 500;
    line-height: 1.3;
    letter-spacing: -0.005em;
    color: #2A2F35 !important;
}
</style>
"""


def render_title_section(
    eyebrow: str, title: str, subtitle: str, details: list[str]
) -> None:
    """Render a title block for the top of a page or report.

    Args:
        eyebrow: Short label above the title, shown in capitals
        title: The main title
        subtitle: A line under the title, such as the owner's name
        details: Smaller lines under the subtitle, one per fact

    Example:
        >>> render_title_section(
        ...     eyebrow="Sample report",
        ...     title="Quarterly review",
        ...     subtitle="Example Organization",
        ...     details=["Owner: Example Team", "Reference: REF-00123"],
        ... )
    """
    inject_css(_STYLES)
    details_html = "".join(f"<h3>{html.escape(line)}</h3>" for line in details)
    st.markdown(
        f"""
        <div class="title-section">
            <div class="eyebrow">{html.escape(eyebrow)}</div>
            <h1>{html.escape(title)}</h1>
            <h2>{html.escape(subtitle)}</h2>
            <div class="details">{details_html}</div>
        </div>
        """,
        unsafe_allow_html=True,
    )
