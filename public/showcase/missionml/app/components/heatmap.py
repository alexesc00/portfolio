"""A heatmap card: rows by columns, each cell colored by a 0-100 value."""

import altair as alt
import pandas as pd
import streamlit as st


def render_heatmap(
    title: str,
    values: dict[str, dict[str, int | None]],
    x_title: str,
    y_title: str,
    value_title: str,
    key: str,
) -> None:
    """Render a heatmap inside a card. Cells with no value get a flat grey fill.

    Args:
        title: Card heading
        values: One entry per column (x axis), mapping each row (y axis) to
            a value from 0 to 100, or None where the pair doesn't apply.
            Columns and rows keep the order given.
        x_title: Axis title for the columns
        y_title: Axis title for the rows
        value_title: Legend title for the color scale
        key: Unique container key. Start it with "primary" to get the
            stylesheet's primary card surface.

    Example:
        >>> render_heatmap(
        ...     title="Scores by area",
        ...     values={"Alpha": {"Quality": 80, "Speed": None}},
        ...     x_title="Team",
        ...     y_title="Area",
        ...     value_title="Score",
        ...     key="primary_heatmap",
        ... )
    """
    columns = list(values)
    rows = list(dict.fromkeys(row for cells in values.values() for row in cells))
    cells = pd.DataFrame(
        [
            {
                "column": column,
                "row": row,
                "value": value,
                "label": "N/A" if value is None else f"{value}%",
            }
            for column, cells_in_column in values.items()
            for row, value in cells_in_column.items()
        ]
    )
    base = alt.Chart(cells).encode(
        x=alt.X("column:N", title=x_title, sort=columns, axis=alt.Axis(labelAngle=0, labelLimit=200)),
        y=alt.Y("row:N", title=y_title, sort=rows),
        tooltip=[
            alt.Tooltip("row:N", title=y_title),
            alt.Tooltip("column:N", title=x_title),
            alt.Tooltip("label:N", title=value_title),
        ],
    )
    scored = base.transform_filter("isValid(datum.value)").mark_rect().encode(
        color=alt.Color(
            "value:Q",
            title=value_title,
            # A fixed 0-100 domain keeps colors comparable between datasets
            scale=alt.Scale(domain=[0, 100], range=["#CAE2FD", "#3182CE"], interpolate="rgb"),
        ),
    )
    missing = base.transform_filter("!isValid(datum.value)").mark_rect(color="#F2F4F7")

    with st.container(key=key):
        st.subheader(title)
        # Streamlit sizes charts from the enclosing block's outer width, which
        # includes the card's padding. A plain inner container measures the
        # inner width instead, so the chart doesn't overflow the card.
        with st.container():
            st.altair_chart((scored + missing).properties(height=300), use_container_width=True)
