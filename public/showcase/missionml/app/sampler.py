"""One screen of restyled widgets, sized for the portfolio's works table.

The portfolio runs this in the browser (with stlite) in a box about 870 by
550 pixels, twice, side by side: once with the brand and once with it
switched off. It shows only Streamlit's own widgets, the ones
assets/style_light.css restyles, so both copies have something to compare.

    streamlit run sampler.py
"""

import streamlit as st

from polydelta_streamlit_helpers.css import inject_css
from polydelta_streamlit_helpers.style import generic_page_config

st.set_page_config(page_title="Style sampler")
with open("assets/style_light.css") as f:
    inject_css(f.read())
generic_page_config(page_width=75)
st.logo(
    "assets/missionml-light.svg",
    size="large",
    link=None,
    icon_image="assets/missionml-light.svg",
)

# Spacing for the small box. It goes through st.html, not inject_css, so it
# stays on when the portfolio switches the brand off: it belongs to the box,
# not the brand.
st.html(
    """<style data-frame-css>
    [data-testid="stElementContainer"]:has(style[data-frame-css]) {
        display: none;
    }
    [data-testid="stMainBlockContainer"] {
        padding: 4.5rem 2rem 2rem !important;
        max-width: none !important;
    }
    [data-testid="stHeader"] { display: none; }
    [data-testid="stLogo"] { visibility: hidden; }
    </style>"""
)
# The logo is part of the brand: hidden above, shown again by this tagged
# block, so it goes when the portfolio switches the brand off. Hidden rather
# than removed, so both copies keep the same layout. There's no sidebar for
# the same reason: its open button sits beside the logo, and opening it
# knocks the two copies out of step.
inject_css(
    '[data-testid="stSidebarCollapsedControl"] [data-testid="stLogo"]'
    " { visibility: visible; }"
)

c1, c2, c3, c4 = st.columns(4)
with c1:
    st.button("Primary", type="primary", key="primary")
with c2:
    st.button("Secondary", key="secondary")
with c3:
    st.button("Tertiary", type="tertiary", key="tertiary")
with c4:
    st.toggle("Failing only", key="failing_only")

c1, c2 = st.columns(2)
with c1:
    st.text_input("Search", placeholder="Search checks", key="search")
    st.segmented_control(
        "Period", ["Day", "Week", "Month"], default="Week", key="period"
    )
with c2:
    st.selectbox("Team", ["Alpha", "Bravo", "Charlie"], key="team")
    st.pills(
        "Areas", ["Quality", "Speed", "Access"], default="Quality", key="areas"
    )

c1, c2 = st.columns(2)
with c1:
    # The primary_ key prefix gives the container the brand's white card
    with st.container(key="primary_review_card"):
        summary, details = st.tabs(["Summary", "Details"])
        with summary:
            st.progress(0.65, text="65% reviewed")
        with details:
            st.write("Two checks failed, both on response time.")
with c2:
    with st.expander("Next steps", expanded=True):
        st.write("Cache the slowest query.")

with st.chat_message("user"):
    st.write("Which checks failed this quarter?")
