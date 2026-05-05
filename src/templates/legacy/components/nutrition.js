const { esc } = require('./utils');

const MACRO_IDS = { carbs: 96, protein: 97, fat: 99 };
const LEFT_ORDER = [
  'calorias',
  'carbohidratos',
  'fibra',
  'azucar',
  'proteina',
  'grasa total',
  'saturada',
  'poliinsaturada',
  'monoinsaturada',
  'colesterol',
  'calcio',
  'hierro',
  'magnesio',
  'fosforo',
  'potasio',
];
const RIGHT_ORDER = [
  'sodio',
  'zinc',
  'selenio',
  'vitamina a',
  'vit b1 tiamina',
  'vit b2 riboflavina',
  'vit b3 niacina',
  'vitamina b6',
  'vitamina b12',
  'vitamina c',
  'vitamina d',
  'vitamina e',
  'vitamina k',
  'folato',
  'colina',
];

function formatAmount(amount, unit) {
  if (amount == null || Number.isNaN(Number(amount))) return '-';
  const value = Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${value} ${unit || ''}`.trim();
}

function normalizeName(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function pickOrderedRows(rows, orderedNames) {
  const remaining = [...rows];
  const picked = [];

  orderedNames.forEach((name) => {
    const idx = remaining.findIndex((row) => normalizeName(row.name) === normalizeName(name));
    if (idx >= 0) {
      picked.push(remaining[idx]);
      remaining.splice(idx, 1);
    }
  });

  return { picked, remaining };
}

function dayCard(day) {
  const rows = day.rows || [];
  const byId = new Map(rows.map((r) => [r.id, r]));
  const carbs = byId.get(MACRO_IDS.carbs);
  const protein = byId.get(MACRO_IDS.protein);
  const fat = byId.get(MACRO_IDS.fat);

  const { picked: leftPicked, remaining: afterLeft } = pickOrderedRows(rows, LEFT_ORDER);
  const { picked: rightPicked, remaining: afterRight } = pickOrderedRows(afterLeft, RIGHT_ORDER);
  const leftovers = afterRight || [];
  const leftRows = [...leftPicked, ...leftovers.filter((_r, i) => i % 2 === 0)];
  const rightRows = [...rightPicked, ...leftovers.filter((_r, i) => i % 2 === 1)];
  const maxRows = Math.max(leftRows.length, rightRows.length);
  const nutrientRows = Array.from({ length: maxRows }).map((_, idx) => {
    const left = leftRows[idx] || null;
    const right = rightRows[idx] || null;
    const isLeftMacro = left?.id === MACRO_IDS.carbs || left?.id === MACRO_IDS.protein || left?.id === MACRO_IDS.fat;
    const isRightMacro = right?.id === MACRO_IDS.carbs || right?.id === MACRO_IDS.protein || right?.id === MACRO_IDS.fat;
    return `<div class="nutrition-row">
      <div class="nutrition-cell ${isLeftMacro ? 'nutrition-bold' : ''}">
        ${left ? `${esc(left.name)} ${esc(formatAmount(left.amount, left.unit))}` : ''}
      </div>
      <div class="nutrition-cell ${isRightMacro ? 'nutrition-bold' : ''}">
        ${right ? `${esc(right.name)} ${esc(formatAmount(right.amount, right.unit))}` : ''}
      </div>
    </div>`;
  }).join('');

  return `<article class="nutrition-day-card">
    <h3 class="nutrition-day-title">${esc(day.label || '')}</h3>
    <div class="nutrition-macros-line">
      <span class="macro macro-carb">Carbohidratos ${esc(carbs?.percentage != null ? `${Number(carbs.percentage).toFixed(2)}%` : '')}</span>
      <span class="macro macro-protein">Proteína ${esc(protein?.percentage != null ? `${Number(protein.percentage).toFixed(2)}%` : '')}</span>
      <span class="macro macro-fat">Grasa total ${esc(fat?.percentage != null ? `${Number(fat.percentage).toFixed(2)}%` : '')}</span>
    </div>
    <div class="nutrition-rows">${nutrientRows}</div>
  </article>`;
}

function renderNutritionSummary(model) {
  const days = model.nutritionSummary?.days || [];
  if (!days.length) return '';

  const cards = days.map(dayCard).join('');
  return `<section class="pdf-page section-break nutrition-reference-page"><div class="nutrition-day-grid">${cards}</div></section>`;
}

module.exports = { renderNutritionSummary };
