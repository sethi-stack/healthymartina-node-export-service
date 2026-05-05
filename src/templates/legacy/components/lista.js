const { esc } = require('./utils');

const CATEGORIES_PER_PAGE = 4;

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function renderLista(model) {
  const categories = model.lista?.categories || [];
  const taken = new Set(model.lista?.takenIds || []);
  if (!categories.length) return '';

  const renderCol = (arr) => arr.map((cat) => {
    const items = (cat.items || []).map((item) => {
      const isTaken = item.id && taken.has(item.id);
      return `<div class="lista-item-row">
        <span class="checkbox-cell">${isTaken ? '&#9745;' : '&#9744;'}</span>
        <span class="item-amount ${isTaken ? 'item-taken' : ''}">${esc(item.amount || '')}</span>
        <span class="item-name ${isTaken ? 'item-taken' : ''}">${esc(item.name)}</span>
      </div>`;
    }).join('');

    return `<div class="lista-category"><div class="lista-cat-title">${esc(cat.name)}</div><div class="lista-items">${items}</div></div>`;
  }).join('');

  const pages = chunk(categories, CATEGORIES_PER_PAGE);
  return pages.map((pageCategories) => {
    const half = Math.ceil(pageCategories.length / 2);
    const cols = [pageCategories.slice(0, half), pageCategories.slice(half)];
    return `<section class="pdf-page section-break"><div class="section-title">Lista de Compras</div>
      <table class="lista-grid"><tr><td>${renderCol(cols[0])}</td><td>${renderCol(cols[1])}</td></tr></table>
    </section>`;
  }).join('');
}

module.exports = { renderLista };
