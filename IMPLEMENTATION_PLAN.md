# Action Plan - Add Manual Generative Card

The objective is to implement a minimalist and elegant floating "+" button at the bottom of the page in **Collagen**. This button will allow users to manually add a card with a two-column layout: media on the left, generative properties on the right.

---

## 1. Floating Add Button
- **Placement**: Fixed at the bottom center (`bottom-12`).
- **Aesthetic**: Minimalist glassmorphic circular button with a "+" icon.
- **Micro-animation**: Subtle scale on hover and tap.
- **Feature**: On click, it adds a new entry to the `croppedImages` array in `App.tsx`.

## 2. Two-Column Card Layout (`ActionCard.tsx`)
This card will maintain the project's **Essentialist** design guidelines:
- **Left Column** (`40%`): Image/Media preview area with a fallback "add image" state if empty.
- **Right Column** (`60%`):
  - **Remotion Section**: Immediate access to animation presets (zoom-in, pan-lr, etc.).
  - **Upscale Row**: Small "4K" upscale button with AI badge.
  - **Veo 3 Section**: A minimal prompt input for direct video generation.

## 3. Implementation Workflow

### Step 1: UI Foundation
- Create `src/components/ui/IconButton.tsx` (if needed, but already exists).
- Implement the `FloatingAddButton` in `App.tsx`.

### Step 2: Component Logic
- Create `src/components/features/ActionCard.tsx` designed for a full-row or half-row layout (not a square bento item).
- Add functionality for manual image selection within the card.

### Step 3: State Integration
- Update `App.tsx` state (`croppedImages`) to handle these manual cards.
- Ensure the grid can accommodate the new multi-column format (perhaps a separate section or a flexible grid layout).

### Step 4: Refinement
- Ensure theme-aware styling (light/dark modes).
- Clean up any unused temporary code.
- Optimize with `React.memo` and `framer-motion`.
