import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

def test_discount_logic():
    from src.level2_logic import apply_discount
    result = apply_discount(100, 10)
    # BUG: returns 10.0 instead of 90.0
    assert result == 90.0, f"Expected 90.0, got {result} (BUG-L2-001)"

def test_cpf_validation():
    from src.level2_logic import is_valid_cpf
    assert is_valid_cpf("") == False, "Empty CPF should be invalid (BUG-L2-002)"

def test_pagination_first_page():
    from src.level2_logic import paginate
    items = list(range(10))
    page1 = paginate(items, 1, 3)
    # With bug: paginate(items, 1, 3) returns items[3:6] = [3,4,5]
    # Expected: items[0:3] = [0,1,2]
    assert page1 == [0, 1, 2], f"Page 1 should be [0,1,2], got {page1} (BUG-L2-003)"

def test_safe_divide_zero():
    from src.level2_logic import safe_divide
    try:
        result = safe_divide(10, 0)
        assert False, f"Expected ZeroDivisionError, got {result} (BUG-L2-006)"
    except ZeroDivisionError:
        pass  # Expected
