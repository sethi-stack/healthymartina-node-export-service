const { esc } = require('./utils');

function renderIngredientList(model) {
  const categories = model.ingredientList?.categories || [];
  const taken = new Set(model.ingredientList?.takenIds || []);
  if (!categories.length) return '';

  const half = Math.ceil(categories.length / 2);
  const cols = [categories.slice(0, half), categories.slice(half)];

  const renderCol = (arr) => arr.map((cat) => {
    const items = (cat.items || []).map((item) => {
      const isTaken = item.id && taken.has(item.id);
      return `<tr><td class="checkbox-cell">${isTaken ? '&#9745;' : '&#9744;'}</td><td class="${isTaken ? 'item-taken' : ''}">${esc(item.name)}</td><td class="item-amount ${isTaken ? 'item-taken' : ''}">${esc(item.amount || '')}</td></tr>`;
    }).join('');

    return `<div class="lista-category"><div class="lista-cat-title">${esc(cat.name)}</div><table class="lista-items">${items}</table></div>`;
  }).join('');

  return `<section class="pdf-page section-break"><div class="section-title">Lista de Compras</div>
    <table class="lista-grid"><tr><td>${renderCol(cols[0])}</td><td>${renderCol(cols[1])}</td></tr></table>
  </section>`;
}

module.exports = { renderIngredientList };
