"""A horizontal stacked bar chart card with a sort menu."""

import altair as alt
import pandas as pd
import streamlit as st

_SORT_OPTIONS = ["Highest first", "Lowest first", "A to Z", "Z to A"]


def render_stacked_bar_chart(
    title: str,
    bars: dict[str, tuple[float, float]],
    series: tuple[str, str],
    x_title: str,
    y_title: str,
    key: str,
) -> None:
    """Render one bar per row, split into two stacked parts, with a sort menu.

    "Highest first" and "Lowest first" sort by the first part.

    Args:
        title: Card heading
        bars: Row label to the sizes of its two parts, as percentages
        series: Names of the two parts, in stacking order
        x_title: Axis title for the percentages
        y_title: Axis title for the row labels
        key: Unique container key, also used to key the sort menu. Start it
            with "primary" to get the stylesheet's primary card surface.

    Example:
        >>> render_stacked_bar_chart(
        ...     title="Checks by team",
        ...     bars={"Alpha": (60.0, 20.0), "Bravo": (40.0, 30.0)},
        ...     series=("Passed", "Partly passed"),
        ...     x_title="%",
        ...     y_title="Team",
        ...     key="primary_bar_chart",
        ... )
    """
    with st.container(key=key):
        st.subheader(title)
        sort = st.selectbox("Sort by", _SORT_OPTIONS, key=f"{key}_sort")
        order = _sorted_labels(bars, sort)

        first, second = series
        chart_rows = pd.DataFrame(
            [
                {"label": label, "part": name, "percent": size, "stack": position}
                for label, sizes in bars.items()
                for position, (name, size) in enumerate(zip(series, sizes))
            ]
        )
        chart = (
            alt.Chart(chart_rows)
            .mark_bar()
            .encode(
                x=alt.X("percent:Q", title=x_title, scale=alt.Scale(domain=[0, 100])),
                y=alt.Y(
                    "label:N",
                    title=y_title,
                    sort=order,
                    scale=alt.Scale(paddingInner=0.4),  # bars fill 60% of each row
                    axis=alt.Axis(labelLimit=300),
                ),
                color=alt.Color(
                    "part:N",
                    title=None,
                    scale=alt.Scale(domain=[first, second], range=["#4D99D9", "#A6C8E8"]),
                    legend=alt.Legend(orient="top", direction="vertical"),
                ),
                order=alt.Order("stack:Q"),
                tooltip=[
                    alt.Tooltip("label:N", title=y_title),
                    alt.Tooltip("part:N", title="Part"),
                    alt.Tooltip("percent:Q", title=x_title),
                ],
            )
            # Tall enough for every label, and never shorter than 400px
            .properties(height=max(400, len(bars) * 25))
        )
        with st.container():  # see render_heatmap: keeps the chart inside the card
            st.altair_chart(chart, use_container_width=True)


def _sorted_labels(bars: dict[str, tuple[float, float]], sort: str | None) -> list[str]:
    """Row labels in top-to-bottom order for the chosen sort."""
    if sort == "Lowest first":
        return sorted(bars, key=lambda label: bars[label][0])
    if sort == "A to Z":
        return sorted(bars)
    if sort == "Z to A":
        return sorted(bars, reverse=True)
    return sorted(bars, key=lambda label: bars[label][0], reverse=True)
