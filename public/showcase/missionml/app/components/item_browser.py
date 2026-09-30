"""Browse items by group: a segmented filter, pills for the items, a details panel."""

from dataclasses import dataclass

import streamlit as st


@dataclass(frozen=True)
class Item:
    """One item in the browser.

    Attributes:
        label: Short ID shown on its pill
        group: The filter group it belongs to
        details: Field name to text, shown in the details panel in order
    """

    label: str
    group: str
    details: dict[str, str]


@st.fragment
def render_item_browser(
    title: str, groups: list[str], items: list[Item], key: str
) -> None:
    """Render a two-column browser: pick a group, then an item, to see its details.

    Runs as a fragment, so changing the selection only redraws this block.

    Args:
        title: Heading above the filter
        groups: Filter options, in order; the first is selected to start
        items: Everything that can be shown
        key: Unique container key, also used to key the widgets. Start it
            with "primary" to get the stylesheet's primary card surface.
    """
    with st.container(key=key):
        filter_column, details_column = st.columns(2)

        with filter_column:
            st.subheader(title)
            group = st.segmented_control(
                "Filter",
                groups,
                default=groups[0],
                label_visibility="collapsed",
                key=f"{key}_group",
            ) or groups[0]
            in_group = {item.label: item for item in items if item.group == group}
            selected = None
            if in_group:
                selected_label = st.pills(
                    "Item",
                    list(in_group),
                    default=next(iter(in_group)),
                    label_visibility="collapsed",
                    key=f"{key}_item_{group}",
                )
                # Clicking the selected pill clears it; fall back to the first item
                selected = in_group.get(selected_label or "") or next(
                    iter(in_group.values())
                )
            else:
                st.write("Nothing in this group.")

        with details_column:
            if selected:
                with st.container(height=400):
                    st.markdown(f"**{selected.label}**")
                    for field, text in selected.details.items():
                        st.markdown(f"**{field}:** {text}")
