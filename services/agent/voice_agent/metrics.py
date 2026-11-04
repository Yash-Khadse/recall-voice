"""Content-free timing summaries. No user text, audio, tokens or identities."""

import math
from collections import defaultdict, deque


class Metrics:
    def __init__(self):
        self.samples = defaultdict(lambda: deque(maxlen=1000))

    def observe(self, name, milliseconds):
        if math.isfinite(milliseconds) and milliseconds >= 0:
            self.samples[name].append(milliseconds)

    def summary(self):
        result = {}
        for name, values in self.samples.items():
            ordered = sorted(values)
            result[name] = {
                "count": len(ordered),
                "p50_ms": ordered[math.ceil(0.5 * len(ordered)) - 1],
                "p95_ms": ordered[math.ceil(0.95 * len(ordered)) - 1],
            }
        return result
