# Recall Voice Visual Design System

## Design Philosophy
An editorial workspace aesthetic: restrained warm-white and charcoal surfaces, cobalt action accents, compact navigation, and spacious conversation layouts. The interface prioritizes clarity, real connection status, live transcripts, and user-owned data records.

## Typography
- **DM Sans**: Primary interface font for navigation, controls, forms, and transcripts.
- **Newsreader**: Editorial secondary display font for landing headers and section intros.
Both fonts are bundled locally via Fontsource, eliminating third-party font CDN dependencies.

## Color & Theming
CSS custom variables define light and dark themes:
- **Light Theme**: Warm neutral background (`#f8f9fb`), white surfaces (`#ffffff`), charcoal ink (`#20232c`), muted secondary text (`#626a78`), subtle borders (`#e3e6ec`), cobalt primary accent (`#345bdb`), soft hover/active fills (`#edf1fc`).
- **Dark Theme**: Deep charcoal background (`#15171c`), dark slate surface (`#1c1f26`), high-contrast ink (`#eceef5`), muted gray text (`#a3abba`), dark slate borders (`#333845`), periwinkle accent (`#9aafff`), soft dark fills (`#282f46`).

## Layout & Components
- **Sidebar Navigation**: Desktop sidebar transforms into a clean horizontal navigation bar on mobile viewports (<760px).
- **Inspection Panels**: Tool execution traces and memory inspection stack smoothly beneath transcripts on medium and narrow screens.
- **Controls & Radii**: Interactive controls use consistent 8px radii, while content and card containers use 12–14px radii.
- **Waveform & Status**: Audio activity displays a clear, explicitly labeled visualizer indicating listening and speaking states.

## Accessibility
- Native visible focus outlines for all interactive elements.
- Accessible form controls with descriptive labels and ARIA attributes.
- Reduced-motion preferences (`prefers-reduced-motion`) are fully respected, disabling non-essential transitions.
- High contrast compliance across both light and dark themes.
