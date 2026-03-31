# Performance Optimization & Batch Render Options

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Optimize the app to handle 20+ images without lag (thumbnail quality optimization) and add two render modes when multiple media are selected: "Combine into single video" vs "Render each separately".

**Architecture:** Create a thumbnail generation utility that produces low-res versions of images for grid display (keeping originals for render/export). Add a render mode picker to the RemotionPlayerModal when multi-slide is detected, with a "Render Separately" option that enqueues individual jobs via the existing RenderQueue.

**Tech Stack:** Canvas API (thumbnail generation), existing RenderQueue service, existing design system components.

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/utils/thumbnail.ts` | Create | Generate optimized thumbnails from data URLs via OffscreenCanvas |
| `src/hooks/useThumbnail.ts` | Create | React hook to lazily generate & cache thumbnails per image |
| `src/App.tsx` | Modify | Store thumbnail URLs on CroppedImage, pass to BentoItem |
| `src/types.ts` | Modify | Add `thumbnailUrl` to CroppedImage |
| `src/components/features/BentoItem.tsx` | Modify | Display thumbnail instead of full-res in grid |
| `src/components/features/RemotionPlayerModal.tsx` | Modify | Add render mode picker (combined vs separate) |
| `src/components/features/BatchRenderModal.tsx` | No change | Already handles separate renders correctly |

---

### Task 1: Thumbnail Generation Utility

**Files:**
- Create: `src/utils/thumbnail.ts`

This utility takes a data URL and returns a smaller version (max 400px on longest side) as an object URL. Uses OffscreenCanvas for off-main-thread processing when available, falls back to regular canvas.

- [ ] **Step 1: Create the thumbnail utility**

```typescript
// src/utils/thumbnail.ts

const THUMB_MAX_SIZE = 400;
const cache = new Map<string, string>();

export function getThumbnailFromCache(key: string): string | undefined {
  return cache.get(key);
}

export async function generateThumbnail(dataUrl: string, cacheKey: string): Promise<string> {
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const img = new Image();
  img.src = dataUrl;
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = reject;
  });

  const ratio = Math.min(THUMB_MAX_SIZE / img.width, THUMB_MAX_SIZE / img.height, 1);
  const w = Math.round(img.width * ratio);
  const h = Math.round(img.height * ratio);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, w, h);

  const blob = await new Promise<Blob>((resolve) =>
    canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.7)
  );

  const thumbUrl = URL.createObjectURL(blob);
  cache.set(cacheKey, thumbUrl);
  return thumbUrl;
}

export function revokeThumbnail(cacheKey: string) {
  const url = cache.get(cacheKey);
  if (url) {
    URL.revokeObjectURL(url);
    cache.delete(cacheKey);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/utils/thumbnail.ts
git commit -m "feat: add thumbnail generation utility with object URL caching"
```

---

### Task 2: Add thumbnailUrl to CroppedImage Type

**Files:**
- Modify: `src/types.ts:3-14`

- [ ] **Step 1: Add thumbnailUrl field**

In `src/types.ts`, add `thumbnailUrl?: string;` to the `CroppedImage` interface:

```typescript
export interface CroppedImage {
  id: string;
  url: string;
  thumbnailUrl?: string;          // <-- add this line
  upscaledUrl?: string;
  isUpscaling: boolean;
  upscaleStartTime?: number;
  videoUrl?: string;
  isAnimating: boolean;
  animationStartTime?: number;
  animationPrompt?: string;
  suggestedPreset?: AnimationPreset;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/types.ts
git commit -m "feat: add thumbnailUrl field to CroppedImage type"
```

---

### Task 3: Generate Thumbnails on Image Add in App.tsx

**Files:**
- Modify: `src/App.tsx:65-110` (processFiles function)
- Modify: `src/App.tsx:153-206` (splitImage function)
- Modify: `src/App.tsx:452-458` (removeImage function)

Generate thumbnails right after creating CroppedImage entries. Also revoke on remove.

- [ ] **Step 1: Add import at top of App.tsx**

Add this import after the existing imports:

```typescript
import { generateThumbnail, revokeThumbnail } from './utils/thumbnail';
```

- [ ] **Step 2: Update processFiles to generate thumbnails**

In the `processFiles` function, after creating `newItems` and before `setCroppedImages`, add thumbnail generation:

```typescript
      // After the for loop that creates newItems, before setCroppedImages:
      if (newItems.length > 0) {
        // Generate thumbnails in parallel
        await Promise.all(
          newItems.map(async (item) => {
            try {
              item.thumbnailUrl = await generateThumbnail(item.url, item.id);
            } catch { /* fallback to full url */ }
          })
        );

        setCroppedImages(prev => [...prev, ...newItems]);
        setError(null);
        handleAISuggest(newItems);
      }
```

Replace the existing `if (newItems.length > 0)` block (lines 104-109) with the above.

- [ ] **Step 3: Update splitImage to generate thumbnails**

In the `splitImage` function, after the for loop that creates `newCrops` and before `setCroppedImages(newCrops)`, add:

```typescript
      // Generate thumbnails for crops
      await Promise.all(
        newCrops.map(async (item) => {
          try {
            item.thumbnailUrl = await generateThumbnail(item.url, item.id);
          } catch { /* fallback to full url */ }
        })
      );

      setCroppedImages(newCrops);
```

- [ ] **Step 4: Update removeImage to revoke thumbnail**

In the `removeImage` function, add revoke before filtering:

```typescript
  const removeImage = (id: string) => {
    const crop = croppedImages.find(c => c.id === id);
    if (crop) revokeThumbnail(crop.id);
    setCroppedImages(prev => prev.filter(c => c.id !== id));
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };
```

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx
git commit -m "feat: generate optimized thumbnails on image add/split"
```

---

### Task 4: Use Thumbnails in BentoItem Grid Display

**Files:**
- Modify: `src/components/features/BentoItem.tsx:54-61`

The key optimization: display the small thumbnail in the grid, but still use the full-res URL for fullscreen/download/render.

- [ ] **Step 1: Update the img src in BentoItem**

Replace the current `<img>` tag (line 57-61):

```typescript
        <img
          src={crop.thumbnailUrl || crop.url}
          alt={`Crop ${index}`}
          className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
          onClick={() => onFullscreen(crop.upscaledUrl || crop.url)}
          loading="lazy"
          decoding="async"
        />
```

Key: `src` uses `thumbnailUrl` for display, `onClick` still opens full-res. Added `decoding="async"` for additional non-blocking decode.

- [ ] **Step 2: Commit**

```bash
git add src/components/features/BentoItem.tsx
git commit -m "perf: display optimized thumbnails in grid, full-res on click"
```

---

### Task 5: Add Render Mode Picker to RemotionPlayerModal

**Files:**
- Modify: `src/components/features/RemotionPlayerModal.tsx`

When `slides.length > 1`, show two render buttons instead of one: "Render Combined" and "Render Separately". "Render Separately" enqueues N individual jobs, one per slide.

- [ ] **Step 1: Add state and separate render handler**

Add a `renderMode` concept and a handler for separate rendering. Update the modal footer.

In `RemotionPlayerModal.tsx`, replace the `handleEnqueueRender` function and footer section:

```typescript
  const handleRenderCombined = () => {
    const composition: RenderComposition = {
      id: `render-${Date.now()}`,
      slides,
      fps,
      transition: (isMulti ? transition : 'none') as TransitionType,
      transitionDurationFrames: isMulti ? transitionDurationFrames : 0,
    };
    enqueue(composition);
    onClose();
  };

  const handleRenderSeparately = () => {
    slides.forEach((slide, i) => {
      const composition: RenderComposition = {
        id: `render-${Date.now()}-${i}`,
        slides: [slide],
        fps,
        transition: 'none' as TransitionType,
        transitionDurationFrames: 0,
      };
      enqueue(composition);
    });
    onClose();
  };
```

- [ ] **Step 2: Update the footer with two buttons when multi-slide**

Replace the footer `<div>` (the one containing the "Render MP4" Button) with:

```typescript
          <div className="p-6 bg-white/[0.02] border-t border-white/10 flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <p className="text-[10px] text-white/20 uppercase tracking-[0.3em]">
                Format: H.264 (AVC) &bull; {outputWidth}x{outputHeight}
              </p>
              <p className="text-[10px] text-white/40 uppercase tracking-[0.3em]">
                {fps} FPS &bull; {(totalFrames / fps).toFixed(1)}s
                {isMulti && ` \u00B7 ${transition} transitions`}
              </p>
            </div>

            {isMulti ? (
              <div className="flex items-center gap-3">
                <Button
                  onClick={handleRenderSeparately}
                  variant="secondary"
                  size="md"
                  icon={<Video size={18} />}
                >
                  {slides.length} Separate
                </Button>
                <Button
                  onClick={handleRenderCombined}
                  variant="primary"
                  size="md"
                  icon={<Video size={18} />}
                >
                  Combined
                </Button>
              </div>
            ) : (
              <Button
                onClick={handleRenderCombined}
                variant="primary"
                size="md"
                icon={<Video size={18} />}
              >
                Render MP4
              </Button>
            )}
          </div>
```

- [ ] **Step 3: Commit**

```bash
git add src/components/features/RemotionPlayerModal.tsx
git commit -m "feat: add combined vs separate render options for multi-slide"
```

---

### Task 6: Optimize Grid Re-renders with React.memo

**Files:**
- Modify: `src/components/features/BentoItem.tsx`

Wrap BentoItem in `React.memo` to prevent unnecessary re-renders when sibling items change state (e.g., one item upscaling shouldn't re-render all 20 items).

- [ ] **Step 1: Wrap export with React.memo**

At the bottom of BentoItem.tsx, change the export:

```typescript
export const BentoItem: React.FC<BentoItemProps> = React.memo(({ ... }) => {
  // ... existing component body unchanged
});

BentoItem.displayName = 'BentoItem';
```

Note: The actual change is wrapping the component function in `React.memo()`. The destructured props and body stay exactly the same.

- [ ] **Step 2: Commit**

```bash
git add src/components/features/BentoItem.tsx
git commit -m "perf: memoize BentoItem to prevent cascading re-renders"
```

---

### Task 7: Cleanup - Revoke Thumbnails on Reset

**Files:**
- Modify: `src/App.tsx` (handleReset function)

- [ ] **Step 1: Revoke all thumbnails on reset**

Update `handleReset` in App.tsx:

```typescript
  const handleReset = () => {
    croppedImages.forEach(c => revokeThumbnail(c.id));
    setSourceImage(null);
    setCroppedImages([]);
    setSelectedIds(new Set());
    setError(null);
    setShowSourcePrompt(false);
    setSourcePrompt("");
  };
```

- [ ] **Step 2: Commit**

```bash
git add src/App.tsx
git commit -m "fix: revoke thumbnail object URLs on reset to prevent memory leaks"
```

---

## Summary

| Change | Impact |
|--------|--------|
| Thumbnail utility (400px, JPEG 0.7 quality, Object URLs) | ~95% less memory per grid image |
| `decoding="async"` + `loading="lazy"` | Non-blocking image decode |
| `React.memo` on BentoItem | Prevents N re-renders when 1 item changes |
| Revoke on remove/reset | Prevents object URL memory leaks |
| Combined vs Separate render buttons | User choice for multi-media render mode |
| Separate render = N individual RenderQueue jobs | Leverages existing queue, toast, download system |
