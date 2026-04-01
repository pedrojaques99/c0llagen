# Collagen Memory

## Design Patterns
- **Essentialist Aesthetics**: Focus on whitespace, high-contrast typography, and subtle glass backgrounds (`--glass`). No generic colors; use semantic tokens.
- **Micro-interactions**: Use `framer-motion` for all transitions. Hover effects should feel "alive" but not extravagant.
- **Component Reusability**: Favor extending existing UI components (`Button`, `IconButton`, `Badge`) rather than creating ad-hoc styles.

## Core Features
- **Generative Cards**: All media cards should support a 2-column layout on deskops to prioritize access to generative properties (Remotion, Upscale, Video Prompt).
- **Batch Operations**: A specialized `BatchToolbar` handles multiple selections. Floating action buttons should respect its visibility.
- **AI-First UI**: All AI-powered features should wear the "AI" badge via the `Button` or `IconButton` component.

## Recurring Issues & Solutions
- **Card Layout**: Transition from 1 to 2 columns in grids to balance density with interaction surface area for generative controls.
- **Manual Asset Correction**: Manual cards should offer a clear "Add Image" fallback before enabling generative controls.
