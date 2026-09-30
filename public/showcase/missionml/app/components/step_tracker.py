"""A row of numbered steps with slanted joins, each pending, active or completed."""

import html
from typing import Literal

import streamlit as st

from polydelta_streamlit_helpers.css import inject_css

StepState = Literal["pending", "active", "completed"]

_STYLES = """
<style>
/* Pull the tracker up into the space Streamlit leaves above markdown */
div[data-testid="stMarkdownContainer"]:has(.step-tracker) {
    margin-top: -1rem !important;
    padding-top: 0 !important;
}

.step-tracker {
    --step-slant: 20px;
    --step-overlap: -12px;
    --step-radius: 20px;
    display: flex;
    justify-content: center;
    width: 100%;
    margin: -1rem 0 2rem 0;
}

.step-tracker-track {
    display: flex;
    width: 100%;
    max-width: 600px;
    padding: 8px;
    border: 3px solid #CCCCCC;
    border-radius: 28px;
    overflow: hidden;
    box-sizing: border-box;
}

.step {
    flex: 1;
    padding: 14px 0 12px 0;
    text-align: center;
}

.step:not(:first-child) {
    margin-left: var(--step-overlap);
}

/* Each step is a trapezoid; the outer ends are straight and rounded */
.step {
    clip-path: polygon(var(--step-slant) 0, 100% 0, calc(100% - var(--step-slant)) 100%, 0 100%);
}

.step:first-child {
    clip-path: polygon(0 0, 100% 0, calc(100% - var(--step-slant)) 100%, 0 100%);
    border-radius: var(--step-radius) 0 0 var(--step-radius);
}

.step:last-child {
    clip-path: polygon(var(--step-slant) 0, 100% 0, 100% 100%, 0 100%);
    border-radius: 0 var(--step-radius) var(--step-radius) 0;
}

.step-number {
    font-size: 1.05rem;
    line-height: 1.05rem;
    font-weight: 600;
    color: inherit;
}

.step.active .step-number {
    font-size: 1.15rem;
    line-height: 1.15rem;
    font-weight: 700;
}

.step-label {
    margin-top: 2px;
    font-size: 0.75rem;
    line-height: 1.2;
    letter-spacing: 0.02em;
    color: inherit;
}

.step.pending {
    background: #E5E5E5 !important;
    color: #262626 !important;
}

.step.active {
    background: #00A85F !important;
    color: #FFFFFF !important;
}

.step.completed {
    background: #000000 !important;
    color: #FFFFFF !important;
}
</style>
"""


def render_step_tracker(steps: list[tuple[str, StepState]]) -> None:
    """Render a step tracker, numbering the steps in order.

    Args:
        steps: One (label, state) pair per step, where state is
            "pending", "active" or "completed"

    Example:
        >>> render_step_tracker([
        ...     ("Upload", "completed"),
        ...     ("Analyze", "active"),
        ...     ("Review", "pending"),
        ... ])
    """
    inject_css(_STYLES)
    steps_html = "".join(
        f'<div class="step {state}">'
        f'<div class="step-number">{number}</div>'
        f'<div class="step-label">{html.escape(label)}</div>'
        "</div>"
        for number, (label, state) in enumerate(steps, start=1)
    )
    st.markdown(
        f'<div class="step-tracker"><div class="step-tracker-track">{steps_html}</div></div>',
        unsafe_allow_html=True,
    )
