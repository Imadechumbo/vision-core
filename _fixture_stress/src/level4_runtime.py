# STRESS LEVEL 4: Runtime bugs — crash conditions
import json
from pathlib import Path

# BUG-L4-001: no error handling — FileNotFoundError crash if path missing
def load_config(path):
    with open(path) as f:
        return json.load(f)

# BUG-L4-002: ZeroDivisionError when items is empty list
def process_batch(items):
    avg = sum(items) / len(items)
    return avg

# BUG-L4-003: unbounded recursion — stack overflow on circular or deep refs
def deep_merge(base, override, depth=0):
    if isinstance(base, dict) and isinstance(override, dict):
        for k, v in override.items():
            base[k] = deep_merge(base.get(k), v, depth + 1)
    return override if override is not None else base

# BUG-L4-004: resource leak — file handle never closed
def read_lines(filepath):
    f = open(filepath, 'r')
    return f.readlines()

# BUG-L4-005: IndexError — no bounds check before access
def get_first_element(lst):
    return lst[0]

# BUG-L4-006: KeyError — no .get() or key check
def get_config_value(config, key):
    return config[key]

# BUG-L4-007: TypeError — no type check before arithmetic
def double_value(x):
    return x * 2  # crashes if x is None or non-numeric string

class DataProcessor:
    def __init__(self):
        self.data = None  # BUG-L4-008: attribute used before assignment possible

    def process(self):
        # BUG: AttributeError if data not set before calling process()
        return [item * 2 for item in self.data]
