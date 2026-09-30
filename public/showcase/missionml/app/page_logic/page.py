import streamlit as st

from components import (
    render_heatmap,
    render_item_browser,
    render_score_card,
    render_score_grid,
    render_stacked_bar_chart,
    render_step_tracker,
    render_tag_panel,
    render_title_section,
)
from components.scoring import is_passing
from page_logic import sample_data
from polydelta_streamlit_helpers.style import add_vertical_space


def my_page() -> None:
    """Render every surface styled by assets/style_light.css."""
    _sidebar()
    add_vertical_space(2)
    st.title("Light style catalog")
    st.write(
        "Every section below maps to a block in `assets/style_light.css`. "
        "Nothing is wired up."
    )

    _typography()
    _buttons()
    _containers()
    _tables()
    _inputs()
    _pills_and_segments()
    _feedback()
    _messaging()
    _tabs()
    _expanders()
    _unstyled_widgets()
    _components()


def _sidebar() -> None:
    with st.sidebar:
        st.markdown("### Style catalog")
        # An external link: Streamlit 1.44 (used by the stlite build) can't link
        # back to the main script of a single-page app. Same widget, same styling.
        st.page_link("https://docs.streamlit.io", label="Streamlit docs")
        st.radio("Sidebar radio", ["All", "Buttons", "Tables"], key="sc_sidebar_radio")


def _typography() -> None:
    st.header("6. Typography")
    st.subheader("6.1 Headings")
    st.markdown("#### Heading 4")
    st.markdown("##### Heading 5")
    st.markdown("###### Heading 6")
    st.write(
        "Body paragraph. Lists, labels, and spans also pick up Manrope from the sheet."
    )
    st.markdown("- List item one\n- List item two")


def _buttons() -> None:
    st.header("4. Buttons & actions")
    c1, c2, c3, c4 = st.columns(4)
    with c1:
        st.button("Primary", type="primary", key="sc_btn_primary")
        st.button("Primary disabled", type="primary", disabled=True, key="sc_btn_primary_off")
    with c2:
        st.button("Secondary", type="secondary", key="sc_btn_secondary")
        st.button("Secondary disabled", type="secondary", disabled=True, key="sc_btn_secondary_off")
    with c3:
        st.button("Tertiary", type="tertiary", key="sc_btn_tertiary")
        st.button("Tertiary disabled", type="tertiary", disabled=True, key="sc_btn_tertiary_off")
    with c4:
        st.link_button("Link button", "https://docs.streamlit.io")
        with st.popover("Popover"):
            st.write("Popover body")

    with st.form("sc_form"):
        st.text_input("Form field", placeholder="Placeholder in a form", key="sc_form_field")
        st.form_submit_button("Form submit")


def _containers() -> None:
    st.header("5. Containers & surfaces")
    c1, c2 = st.columns(2)
    with c1:
        with st.container(key="primary"):
            st.markdown("#### Primary")
            st.write("White surface, light border.")
        add_vertical_space(1)
        with st.container(key="accent"):
            st.markdown("#### Accent")
            st.text_input("Accent field", placeholder="Placeholder on accent", key="sc_accent_input")
    with c2:
        with st.container(key="agent"):
            st.markdown("#### Agent")
            st.write("Grey surface.")
        add_vertical_space(1)
        with st.container(key="transparent"):
            st.markdown("#### Transparent")
            st.write("No fill, no border.")


def _tables() -> None:
    st.header("3. Tables")
    st.write("Custom HTML table using `.table-wrapper` and `.custom-table`.")
    st.html(
        """
        <div class="table-wrapper">
          <table class="custom-table">
            <thead>
              <tr>
                <th>Source</th>
                <th>Status</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Alpha</td>
                <td>Open</td>
                <td>Longer notes so the last-column wrap rule is visible on this row.</td>
              </tr>
              <tr>
                <td>Bravo</td>
                <td>Review</td>
                <td>Hover a row to see the body hover fill.</td>
              </tr>
              <tr>
                <td>Charlie</td>
                <td>Closed</td>
                <td>Sticky header stays put if the wrapper scrolls.</td>
              </tr>
              <tr>
                <td>Delta</td>
                <td>Open</td>
                <td>Another row for scrollbar height.</td>
              </tr>
              <tr>
                <td>Echo</td>
                <td>Hold</td>
                <td>Final row, rounded bottom corners.</td>
              </tr>
            </tbody>
          </table>
        </div>
        """
    )


def _inputs() -> None:
    st.header("6.2 / 6.3 Body, inputs, widget labels")
    c1, c2, c3 = st.columns(3)
    with c1:
        st.text_input("Text input", placeholder="Italic placeholder", key="sc_text")
        st.text_area("Text area", placeholder="Type here", key="sc_area")
    with c2:
        st.selectbox("Selectbox", ["Alpha", "Bravo", "Charlie"], key="sc_select")
        st.radio("Radio", ["One", "Two"], key="sc_radio")
    with c3:
        st.slider("Slider", 0, 100, 40, key="sc_slider")
        st.toggle("Toggle", key="sc_toggle")


def _pills_and_segments() -> None:
    st.header("7. Pills & segmented controls")
    st.segmented_control(
        "Segmented control",
        ["Day", "Week", "Month"],
        default="Week",
        key="sc_segmented",
    )
    st.pills(
        "Pills",
        ["Alpha", "Bravo", "Charlie"],
        default="Alpha",
        key="sc_pills",
    )


def _feedback() -> None:
    st.header("8. Feedback & status")
    st.progress(0.65, text="Progress")
    if st.button("Show toast", key="sc_toast_btn"):
        st.toast("Styled toast")


def _messaging() -> None:
    st.header("9. Messaging & communication")
    with st.chat_message("user"):
        st.write("User message. Avatar is hidden; the bubble uses the user fill.")
    with st.chat_message("assistant"):
        st.write("Assistant message. Avatar is hidden; the bubble is transparent.")
    st.code("print('styled code block')\nvalue = 42", language="python")
    st.chat_input("Chat input placeholder")


def _tabs() -> None:
    st.header("10. Tabs")
    tab_a, tab_b, tab_c = st.tabs(["Active", "Inactive", "Third"])
    with tab_a:
        st.write("Active tab content.")
    with tab_b:
        st.write("Inactive tab content.")
    with tab_c:
        st.write("Third tab content.")


def _expanders() -> None:
    st.header("11. Expanders")
    with st.expander("Open expander", expanded=True):
        st.write("Open state: grey fill, green border.")
    with st.expander("Closed expander", expanded=False):
        st.write("Closed state. Hover the summary to see the hover border.")


@st.dialog("Unstyled dialog")
def _show_unstyled_dialog() -> None:
    st.write("Dialog body. Dismiss with X, ESC, or click outside.")
    if st.button("Close dialog", key="sc_dialog_close"):
        st.rerun()


def _unstyled_widgets() -> None:
    """Interactive widgets with no component-specific rules in style_light.css."""
    st.header("Unstyled in style_light.css")
    st.write("These 1.43 widgets have no dedicated selectors in the sheet.")

    c1, c2, c3 = st.columns(3)
    with c1:
        st.checkbox("Checkbox", key="sc_u_checkbox")
        st.toggle("Toggle", key="sc_u_toggle")
        st.slider("Slider", 0, 100, 40, key="sc_u_slider")
        st.select_slider("Select slider", ["Low", "Medium", "High"], value="Medium", key="sc_u_select_slider")
    with c2:
        st.number_input("Number input", min_value=0, max_value=100, value=12, key="sc_u_number")
        st.date_input("Date input", key="sc_u_date")
        st.time_input("Time input", key="sc_u_time")
        st.color_picker("Color picker", value="#33B574", key="sc_u_color")
    with c3:
        st.multiselect("Multiselect", ["Alpha", "Bravo", "Charlie"], default=["Alpha"], key="sc_u_multi")
        st.file_uploader("File uploader", key="sc_u_upload")
        if st.button("Open dialog", key="sc_u_dialog"):
            _show_unstyled_dialog()


def _components() -> None:
    """Custom components built on the template, rendered with made-up data."""
    st.header("Components")

    st.subheader("Title section")
    render_title_section(
        eyebrow="Sample report",
        title="Quarterly review",
        subtitle="Example Organization",
        details=["Owner: Example Team", "Reference: REF-00123"],
    )

    st.subheader("Step tracker")
    add_vertical_space(1)
    render_step_tracker(sample_data.STEPS)

    st.subheader("Score grid")
    render_score_grid(sample_data.SCORES)
    passing = [
        label
        for label, score in sample_data.SCORES.items()
        if score is not None and is_passing(score)
    ]
    st.markdown(f"**{len(passing)} passed:** {', '.join(passing)}")

    st.subheader("Score card")
    render_score_card(
        title="Alpha",
        score=71,
        bar_label="71% of checks passed",
        summary=sample_data.SCORE_CARD_SUMMARY,
        details_label="Next steps",
        details=sample_data.SCORE_CARD_DETAILS,
        key="primary_score_card",
    )

    st.subheader("Tag panel")
    with st.container(key="primary_tag_panel_card"):
        text_column, tags_column = st.columns(2)
        with text_column:
            st.markdown("#### Tags")
            st.write(sample_data.TAG_PANEL_TEXT)
        with tags_column:
            render_tag_panel(
                main_label="Main tag",
                main_tag=sample_data.MAIN_TAG,
                related_label="Related tags",
                related_tags=sample_data.RELATED_TAGS,
                key="agent_tag_panel",
            )

    st.subheader("Item browser")
    render_item_browser(
        title="Checks",
        groups=sample_data.ITEM_GROUPS,
        items=sample_data.ITEMS,
        key="primary_item_browser",
    )

    st.subheader("Charts")
    render_heatmap(
        title="Scores by area",
        values=sample_data.HEATMAP_VALUES,
        x_title="Team",
        y_title="Area",
        value_title="Score",
        key="primary_heatmap",
    )
    render_stacked_bar_chart(
        title="Checks by team",
        bars=sample_data.BARS,
        series=("Passed", "Partly passed"),
        x_title="%",
        y_title="Team",
        key="primary_bar_chart",
    )
