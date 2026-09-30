"""Made-up data for the component section of the style catalog."""

from components.item_browser import Item
from components.step_tracker import StepState

STEPS: list[tuple[str, StepState]] = [("Upload", "completed"), ("Analyze", "active"), ("Review", "pending")]

SCORES: dict[str, int | None] = {
    "A-01": 86,
    "A-02": 72,
    "A-03": 41,
    "B-01": 64,
    "B-02": 90,
    "C-01": 55,
    "C-02": None,
    "D-01": 78,
    "D-02": None,
    "E-01": None,
}

SCORE_CARD_SUMMARY = (
    "Most checks pass. The two that don't are both about response time."
)
SCORE_CARD_DETAILS = (
    "Cache the slowest query, then run the checks again before the next review."
)

TAG_PANEL_TEXT = (
    "Tags describe the work this item does most, with related work beside it."
)
MAIN_TAG = "Build"
RELATED_TAGS = ["Design", "Test", "Review", "Ship"]

ITEM_GROUPS = ["Passed", "Partly passed", "Failed"]
ITEMS = [
    Item("C-01", "Passed", {"Area": "Quality", "Check": "Pages load without errors."}),
    Item("C-02", "Passed", {"Area": "Quality", "Check": "Forms validate their input."}),
    Item("C-03", "Passed", {"Area": "Access", "Check": "Every image has alt text."}),
    Item("C-04", "Partly passed", {"Area": "Speed", "Check": "Search answers in under a second."}),
    Item("C-05", "Failed", {"Area": "Speed", "Check": "Reports export in under five seconds."}),
]

HEATMAP_VALUES: dict[str, dict[str, int | None]] = {
    "Alpha": {"Quality": 92, "Speed": 64, "Access": 80, "Cost": 71},
    "Bravo": {"Quality": 75, "Speed": 88, "Access": None, "Cost": 52},
    "Charlie": {"Quality": 58, "Speed": 70, "Access": 66, "Cost": 90},
    "Delta": {"Quality": 81, "Speed": None, "Access": 94, "Cost": 60},
}

BARS = {
    "Alpha": (71.4, 14.3),
    "Bravo": (57.1, 28.6),
    "Charlie": (42.9, 28.6),
    "Delta": (85.7, 0.0),
    "Echo": (28.6, 42.9),
}
