# Adaptive Height Implementation Plan for Doubao Translator

## Problem Statement
Current input/output boxes have fixed min-height and hidden scrollbars. Need to:
1. Remove scrollbars from both boxes
2. Allow boxes to grow vertically with long text
3. Maintain a minimum height (200px) when empty
4. Keep responsive behavior

---

## Exact CSS Modifications Needed

### 1. Input Textarea (class: `text-area`)
**File:** `src/translator/main.css`
**Lines:** ~306 in App.tsx (CSS class applied)

```css
.text-area {
  /* Remove fixed min-height */
  min-height: 200px !important; /* Reduce from 420px to 200px */
  /* Remove scroll properties */
  overflow-y: visible !important;
  overflow-x: hidden !important;
  /* Keep other properties */
  resize: none;
  border: 2px solid #333;
  background: #2d2d2d;
  color: #e0e0e0;
  /* ... other existing styles ... */
}
```

### 2. Output Markdown Container (class: `markdown-body`)
**File:** `src/translator/main.css`
**Lines:** ~384 in App.tsx (CSS class applied)

```css
.markdown-body {
  /* Remove scroll properties */
  overflow-y: visible !important;
  overflow-x: hidden !important;
  /* Add minimum height */
  min-height: 200px !important;
  /* Keep other properties */
  border: 2px solid #333;
  background: #252525;
  color: #e0e0e0;
  /* ... other existing styles ... */
}
```

### 3. Parent Container (class: `translation-area`)
**File:** `src/translator/main.css`
**Lines:** ~35 in main.css

```css
.translation-area {
  /* Remove max-height constraint */
  max-height: none !important;
  /* Keep flex properties for responsiveness */
  display: flex;
  flex: 1;
  position: relative;
  min-height: 0;
}
```

### 4. Input/Output Sections (classes: `input-section`, `output-section`)
**File:** `src/translator/main.css`
**Lines:** ~43-44 in main.css

```css
.input-section,
.output-section {
  /* Ensure flex direction allows vertical growth */
  flex-direction: column;
  min-height: 0;
  /* Remove any max-width constraints */
  max-width: 100%;
}
```

---

## Verification Steps
After implementation, verify:
1. ✅ No scrollbars appear in either input/output box
2. ✅ Boxes grow vertically with long text (test with 1000+ characters)
3. ✅ Minimum height (200px) is maintained when empty
4. ✅ Responsive behavior works on different screen sizes
5. ✅ Markdown/KaTeX rendering remains intact
6. ✅ Auto-translate functionality still works