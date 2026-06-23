import pytest

def test_syntax_errors_detected():
    """level1_syntax.py should have SyntaxError — scanner must catch this."""
    try:
        import importlib.util
        spec = importlib.util.spec_from_file_location(
            "level1_syntax", "src/level1_syntax.py"
        )
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        assert False, "Expected SyntaxError was not raised"
    except SyntaxError:
        pass  # Expected — bugs are present

def test_placeholder():
    assert 1 + 1 == 2
