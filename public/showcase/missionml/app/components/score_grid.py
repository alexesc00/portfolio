"""A grid of square cells, one per item, colored by whether its score passes."""

import html

import streamlit as st

from components.scoring import is_passing, score_colors
from polydelta_streamlit_helpers.css import inject_css

_STYLES = """
<style>
.score-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(50px, 1fr));
    gap: 6px;
    width: 100%;
}

.score-grid-cell {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    aspect-ratio: 1;
    box-sizing: border-box;
}

.score-grid-cell-text {
    font-size: 12px !important;
    letter-spacing: -0.02em !important;
    white-space: nowrap;
}

.score-grid-cell.is-passing .score-grid-cell-text {
    color: #FFFFFF !important;
    font-weight: 600;
}

/* A cell with no score yet: outlined, with animated dots */
.score-grid-cell.is-pending {
    background-color: #FFFFFF;
    border: 1px solid #E0E0E0;
}

.score-grid-cell.is-pending .score-grid-cell-text {
    color: #000000;
}

.score-grid-cell.is-pending::before {
    content: "...";
    position: absolute;
    top: -4px;
    left: 4px;
    font-size: 13px;
    color: #666666;
    animation: score-grid-dots 1.5s steps(3, end) infinite;
}

@keyframes score-grid-dots {
    0%, 20% { content: "."; }
    40% { content: ".."; }
    60%, 100% { content: "..."; }
}
</style>
"""


def render_score_grid(scores: dict[str, int | None]) -> None:
    """Render one square cell per item, filling the row and wrapping as needed.

    Cells whose score passes are green, the rest grey. An item whose score is
    None has no result yet and shows as an outlined cell with animated dots.

    Args:
        scores: Item label to score (0-100), or None if it has no score yet

    Example:
        >>> render_score_grid({"A-01": 86, "A-02": 41, "B-01": None})
    """
    inject_css(_STYLES)
    cells = "".join(_cell_html(label, score) for label, score in scores.items())
    st.markdown(f'<div class="score-grid">{cells}</div>', unsafe_allow_html=True)


def _cell_html(label: str, score: int | None) -> str:
    text = f'<span class="score-grid-cell-text">{html.escape(label)}</span>'
    if score is None:
        return f'<div class="score-grid-cell is-pending">{text}</div>'
    fill, _ = score_colors(score)
    state = " is-passing" if is_passing(score) else ""
    return (
        f'<div class="score-grid-cell{state}" '
        f'style="background-color: {fill};">{text}</div>'
    )
