# Recall Voice visual system

Derived from the implemented interface. Desktop and mobile overview screenshots were reviewed on 2026-10-23.

An editorial interview workspace: restrained warm-white/charcoal surfaces, cobalt actions, compact navigation and spacious conversation content. The landing surface explains the mechanism; operational views prioritize connection truth, transcripts and user-owned records.

DM Sans serves UI text; Newsreader provides the landing's secondary display phrase. Both are packaged locally through Fontsource, avoiding font-network build dependencies. CSS variables define light/dark surfaces, text, dividers and accent roles. Controls use 8px radii, content panels 12–14px, and Lucide icons. The illustrative waveform is explicitly labeled and does not pretend to be live microphone data.

The desktop sidebar becomes horizontal navigation below 760px. Conversation inspection stacks below the transcript on intermediate widths. Reduced-motion preferences suppress animation. Native focus outlines, named controls, alerts and live transcript regions carry accessibility behavior.

Playwright captured desktop and mobile Chromium screenshots. Overview typography, stacking, spacing and navigation were visually inspected; responsive navigation checks passed in both viewport sizes. Physical-device speech testing, all-state visual inspection and an independent finish review remain outstanding.
