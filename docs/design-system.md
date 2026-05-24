# Design System Specification

## 1. Overview & Creative North Star: "DevControl"

This design system is engineered to move beyond the static, box-bound layouts of traditional CRM platforms. The Creative North Star is **"DevControl"**—a visual metaphor where data isn't just stored; it flows through a high-precision, deep-space environment.

By prioritizing depth over lines and illumination over borders, we create a high-fidelity interface that feels like a professional command center. We break the "template" look through:
* **Intentional Asymmetry:** Using the `24 (6rem)` spacing scale to create breathing room that guides the eye, rather than boxing it in.
* **Luminous Connectivity:** Utilizing the `secondary` (#5de6ff) and `cyan-glow` accents as "data pulses" that connect disparate nodes of information.
* **Atmospheric Depth:** A UI that feels like layered obsidian glass, where the background isn't just a color, but a vast, reachable space.

---

## 2. Colors & Surface Philosophy

The palette is rooted in the "Deep Black" and "Navy" spectrums, designed to reduce eye strain while emphasizing high-contrast "data points."

### The "No-Line" Rule
**Standard 1px solid borders are strictly prohibited for sectioning.**
Structural boundaries must be defined through tonal shifts. A sidebar is not "lined off"; it is simply `surface-container-low` sitting against a `surface` background. This creates a sophisticated, seamless transition that feels architectural rather than "web-like."

### Surface Hierarchy & Nesting
Depth is achieved by "stacking" the following tiers. Each inner layer must move toward a higher container value to signify "lift":
* **Base Layer:** `surface` (#11131a) - The canvas.
* **Sectioning:** `surface-container-low` (#191b22) - Large layout blocks.
* **Active Elements:** `surface-container` (#1d1f26) - Standard card backgrounds.
* **Prominence:** `surface-container-highest` (#32353c) - Popovers and active selection states.

### The Glass & Gradient Rule
To achieve the "Premium SaaS" feel of Linear and Stripe, use Glassmorphism for floating UI (modals, dropdowns):
* **Backdrop:** Use `surface_container` at 70% opacity.
* **Effect:** Apply a `blur(12px)` and a subtle `0.5px` stroke using `outline_variant` at 15% opacity.
* **Signature Gradient:** Main CTAs should utilize a linear gradient: `primary_container` (#2563eb) to `secondary_container` (#00cbe6) at a 135° angle.

---

## 3. Typography: Technical Authority

We use **Inter** for its neutral, high-legibility architecture, paired with **Space Grotesk** for technical data labels.

* **Display (lg/md):** Reserved for high-impact dashboards. Use `display-lg` (3.5rem) with `-0.02em` letter spacing to feel "tight" and engineered.
* **Headlines:** `headline-sm` (1.5rem) should be used for section titles. Keep them `on_surface` (High Contrast).
* **Subtitles:** Use `title-sm` (1rem) but set to `on_surface_variant` (Medium Contrast). This creates the "technical/light" aesthetic requested.
* **Labels:** Use `label-md` (0.75rem) in **Space Grotesk**. All caps with `0.05em` tracking for a monospaced, "developer-tool" feel.

---

## 4. Elevation & Depth: Tonal Layering

Traditional drop shadows are too "heavy" for this system. We use **Ambient Illumination**.

* **The Layering Principle:** Instead of shadows, use background shifts. A `surface-container-lowest` card placed on a `surface-container-low` background creates a "sunken" or "carved" effect, which feels more integrated.
* **Ambient Shadows:** For floating elements (Modals), use a massive blur: `0px 24px 48px rgba(0, 0, 0, 0.5)`. The shadow color is never pure black; it is a tinted version of `surface_container_lowest`.
* **The "Ghost Border" Fallback:** If a container sits on an identical color background, use a "Ghost Border": `outline-variant` (#434655) at **12% opacity**. It should be felt, not seen.
* **Glow Accents:** Use the `secondary` (#5de6ff) color with a `blur(20px)` at 10% opacity behind "Core Nodes" to simulate energy emission.

---

## 5. Components

### Buttons
* **Primary:** Gradient (`primary_container` to `secondary_container`). `0.375rem (md)` corner radius. No border. Text is `on_primary_container`.
* **Secondary:** Background `surface_container_high`. Ghost Border (15% opacity).
* **Tertiary:** Transparent background. Text is `primary`. On hover, background becomes `primary` at 8% opacity.

### Clean Tables (CRM Focus)
* **Header:** `label-sm` (Space Grotesk) on `surface-container-low`.
* **Rows:** No horizontal dividers. Use `1rem (4)` vertical padding.
* **Hover State:** On hover, the row background shifts to `surface-container-highest` with a `secondary` (#5de6ff) 2px vertical "pulse" line on the far left.

### Elevated Cards
* **Styling:** Background `surface_container`. `0.5rem (lg)` corner radius.
* **Connectivity:** Top-right corner features a "Node" (a 6px circle of `secondary`). If the node is "Active," apply a `2px` outer glow.

### Status Badges
* **Architecture:** Pill shape (`9999px`). Background is the status color at 10% opacity (e.g., `error_container`). Text is the solid color (`error`). No borders.

---

## 6. Do's and Don'ts

### Do
* **DO** use whitespace as a separator. Use the `12 (3rem)` and `16 (4rem)` increments to separate major data clusters.
* **DO** use "Technical Caps" (Space Grotesk) for all data headers and metadata.
* **DO** use nested surfaces to show hierarchy. The more "important" an item, the higher its surface tier.

### Don't
* **DON'T** use 100% opaque borders. They clutter the "DevControl" feel and make the UI look like a legacy spreadsheet.
* **DON'T** use pure white (#FFFFFF). Always use `on_surface` (#e1e2ec) to maintain the premium dark-mode depth.
* **DON'T** use traditional "Material" shadows. If it doesn't look like it's emitting or absorbing light, it doesn't belong in the system.