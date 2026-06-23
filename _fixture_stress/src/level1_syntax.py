# STRESS LEVEL 1: Syntax bugs — Scanner must detect these
# BUG-L1-001: missing colon after function def
def calculate_total(items)
    total = 0
    # BUG-L1-002: missing colon after for
    for item in items
        total += item.price
    return total

# BUG-L1-003: unclosed f-string brace
def format_price(price):
    return f"R${price:.2f"

class Order:
    def __init__(self, id, items):
        self.id = id
        self.items = items
        # BUG-L1-004: missing closing paren
        self.total = calculate_total(items
