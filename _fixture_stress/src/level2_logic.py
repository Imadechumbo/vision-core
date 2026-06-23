# STRESS LEVEL 2: Logic bugs — PatchEngine must diagnose and fix

def apply_discount(price, discount_pct):
    # BUG-L2-001: wrong formula — returns fraction of discount, not discounted price
    # Should be: price * (1 - discount_pct / 100)
    return price * discount_pct / 100

def is_valid_cpf(cpf):
    # BUG-L2-002: always returns True — unreachable correct branch
    if len(cpf) == 11:
        return True
    return True  # should be: return False

def paginate(items, page, page_size):
    # BUG-L2-003: off-by-one — page 1 skips first page_size items
    # Should be: start = (page - 1) * page_size
    start = page * page_size
    end = start + page_size
    return items[start:end]

def merge_dicts(a, b):
    # BUG-L2-004: mutates 'a' in place — caller's dict gets corrupted
    # Should be: result = {**a}; result.update(b); return result
    a.update(b)
    return a

def count_words(text):
    # BUG-L2-005: counts empty string as a word when text is whitespace-only
    return len(text.split())  # split() handles this, but:

def safe_divide(a, b):
    # BUG-L2-006: no check for b == 0
    return a / b
