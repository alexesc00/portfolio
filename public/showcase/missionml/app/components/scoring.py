"""The pass mark and the colors that show whether a score meets it."""

PASS_MARK = 70
PASSING_COLOR = "#009E84"
BELOW_COLOR = "#AEB8C2"


def is_passing(percentage: int) -> bool:
    return percentage >= PASS_MARK


def score_colors(percentage: int) -> tuple[str, str]:
    """Fill and text color for a score: green with white text if it passes."""
    if is_passing(percentage):
        return PASSING_COLOR, "#FFFFFF"
    return BELOW_COLOR, "#000000"
