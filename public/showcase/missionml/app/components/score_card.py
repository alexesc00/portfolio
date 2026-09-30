"""A card that shows one score as a labelled bar with a pass/below chip."""

import html

import streamlit as st

from components.scoring import is_passing, score_colors
from polydelta_streamlit_helpers.css import inject_css

_STYLES = """
<style>
.score-bar {
    position: relative;
    width: 100%;
    height: 24px;
    margin: 0 !important;
    overflow: hidden;
    border-radius: 100px;
    background-color: #E0E0E0;
}

.score-bar-fill {
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    border-radius: 10px;
    transition: width 0.3s ease;
}

.score-bar-text {
    position: absolute;
    inset: 0;
    z-index: 1;
    display: flex;
    align-items: center;
    padding-left: 8px;
    font-size: 14px;
    font-weight: bold;
    pointer-events: none;
}

.score-chip {
    float: left;
    clear: both;
    display: inline-block;
    box-sizing: border-box;
    height: 24px;
    padding: 4px 12px;
    border-radius: 8px;
    font-size: 12px;
    font-weight: bold;
    line-height: 16px;
    letter-spacing: 0.5px;
    text-transform: uppercase;
}
</style>
"""


def render_score_card(
    title: str,
    score: int,
    bar_label: str,
    summary: str,
    details_label: str,
    details: str,
    key: str,
) -> None:
    """Render a card with a score bar, a pass/below chip, a summary and details.

    Args:
        title: Card heading
        score: Score from 0 to 100; it sets the bar's length and color
        bar_label: Text shown inside the bar, such as "71% of checks passed"
        summary: Paragraph under the bar
        details_label: Label of the expander that holds the details
        details: Text inside the expander
        key: Unique container key. Start it with "primary" to get the
            stylesheet's primary card surface.

    Example:
        >>> render_score_card(
        ...     title="Alpha",
        ...     score=71,
        ...     bar_label="71% of checks passed",
        ...     summary="Most checks pass.",
        ...     details_label="Next steps",
        ...     details="Fix the two failing checks.",
        ...     key="primary_score_card",
        ... )
    """
    inject_css(_STYLES)
    fill, text_color = score_colors(score)
    status = "Met" if is_passing(score) else "Not met"

    with st.container(key=key):
        st.markdown(f"### {title}")
        bar_column, chip_column = st.columns([5, 1])
        with bar_column:
            st.markdown(
                f"""<div class="score-bar">
                    <div class="score-bar-fill" style="width: {score}%; background-color: {fill};"></div>
                    <div class="score-bar-text" style="color: {text_color};">{html.escape(bar_label)}</div>
                </div>""",
                unsafe_allow_html=True,
            )
        with chip_column:
            st.markdown(
                f'<span class="score-chip" style="background-color: {fill}; color: {text_color};">'
                f"{status}</span>",
                unsafe_allow_html=True,
            )
        st.markdown(f"<p>{_paragraph(summary)}</p>", unsafe_allow_html=True)
        with st.expander(details_label):
            st.markdown(f"<p>{_paragraph(details)}</p>", unsafe_allow_html=True)


def _paragraph(text: str) -> str:
    return html.escape(text).replace("\n", "<br>")
