"""One highlighted tag above a grid of related tags, each under its own label."""

import html

import streamlit as st

from polydelta_streamlit_helpers.css import inject_css

_STYLES = """
<style>
.tag-panel-label {
    margin: 0;
    padding: 16px 0 8px 0;
    font-size: 16px;
    font-weight: 600;
    line-height: 16px;
    color: #333333;
}

.tag-panel-label.first {
    padding-top: 0;
}

.tag-panel-tag {
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    width: 100% !important;
    min-width: 100%;
    padding: 12px;
    border-radius: 4px;
}

.tag-panel-tag p {
    margin: 0;
    font-size: 15px;
    text-align: center;
    text-transform: capitalize;
}

.tag-panel-tag.is-main {
    height: 56px;
    background-color: #424242;
}

.tag-panel-tag.is-main p {
    font-weight: 600;
    color: #FFFFFF;
}

.tag-panel-tag.is-related {
    height: 40px;
    background-color: #CACCCE;
}

.tag-panel-tag.is-related p {
    font-weight: 500;
    color: #333333;
}

.tag-panel-row-gap {
    height: 8px;
}

/* Streamlit gives markdown blocks a fixed height; let the tags set their own.
   Scoped to the page content: an unscoped div:has() also matches the app
   shell (every ancestor div), which collapses the whole app under stlite. */
div[data-testid="stMarkdownContainer"]:has(.tag-panel-tag),
div[data-testid="stMarkdownContainer"]:has(.tag-panel-label),
[data-testid="stMainBlockContainer"] div:has(.tag-panel-tag),
[data-testid="stMainBlockContainer"] div:has(.tag-panel-label) {
    min-height: auto !important;
    height: auto !important;
}

[data-testid="stMainBlockContainer"] div:has(.tag-panel-tag),
[data-testid="stMainBlockContainer"] div:has(.tag-panel-label) {
    width: 100% !important;
}
</style>
"""


def render_tag_panel(
    main_label: str,
    main_tag: str,
    related_label: str,
    related_tags: list[str],
    key: str,
    columns: int = 3,
) -> None:
    """Render a highlighted tag, then related tags in rows.

    Args:
        main_label: Label above the highlighted tag
        main_tag: The highlighted tag
        related_label: Label above the related tags
        related_tags: Tags shown in rows under the highlighted one
        key: Unique container key. Start it with "agent" to get the
            stylesheet's grey surface.
        columns: Tags per row

    Example:
        >>> render_tag_panel(
        ...     main_label="Main tag",
        ...     main_tag="Build",
        ...     related_label="Related tags",
        ...     related_tags=["Design", "Test", "Review", "Ship"],
        ...     key="agent_tag_panel",
        ... )
    """
    inject_css(_STYLES)
    with st.container(key=key):
        st.markdown(
            f'<p class="tag-panel-label first">{html.escape(main_label)}</p>'
            f"{_tag_html(main_tag, 'is-main')}",
            unsafe_allow_html=True,
        )
        st.markdown(
            f'<p class="tag-panel-label">{html.escape(related_label)}</p>',
            unsafe_allow_html=True,
        )
        rows = [
            related_tags[start : start + columns]
            for start in range(0, len(related_tags), columns)
        ]
        for row in rows:
            for column, tag in zip(st.columns(columns), row):
                with column:
                    st.markdown(_tag_html(tag, "is-related"), unsafe_allow_html=True)
            st.markdown('<div class="tag-panel-row-gap"></div>', unsafe_allow_html=True)


def _tag_html(tag: str, variant: str) -> str:
    return f'<div class="tag-panel-tag {variant}"><p>{html.escape(tag)}</p></div>'
