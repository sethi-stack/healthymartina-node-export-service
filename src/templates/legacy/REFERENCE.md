# Legacy Bold Reference Mapping

Source-of-truth artifact:
- `src/templates/legacy/assets/reverse_engineered_healthy_martina_pdf.html`

This template system must map all sections from that file:
1. Cover
2. Weekly Plan (day cards with meal image strips + text blocks)
3. Nutrition Summary
4. Lista de Compras
5. Recipe Detail pages

Component files and reference intent:
- `components/cover.js` -> cover page composition
- `components/weeklyPlan.js` -> weekly day-card layout with meal image stacks
- `components/nutrition.js` -> nutrition summary section
- `components/lista.js` -> ingredient/category list layout
- `components/recipes.js` -> repeating recipe detail pages

When adjusting visuals, use the reverse-engineered file before introducing new styles/layouts.
