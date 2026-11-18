---
paths:
  - "src/components/**"
  - "src/app/**/*.tsx"
  - "src/app/globals.css"
---

# UI rules (Apple Human Interface Guidelines)

- Use the kit in `src/components/ui/` before writing new markup. Use `cn()` to join class names.
- Colors come only from the semantic tokens in `globals.css` (`--label`, `--bg-grouped`, `--accent`, …). Never hard-code hex values in components. Light and dark mode follow the OS.
- Use the glass material only for the navigation layer (tab bar, sidebar, nav bars). Content uses solid grouped backgrounds.
- Font sizes are in rem, so the browser's text-size setting works. Tap targets are at least 44×44 px.
- Accessibility: every icon-only button has a `label`, and decorative icons get `aria-hidden`.
- To check the HIG, fetch the JSON under `developer.apple.com/tutorials/data/design/human-interface-guidelines/`. The HTML pages need JavaScript and come back empty.
