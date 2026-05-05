const { esc } = require('./utils');

function nl2br(value) {
  return esc(value || '').replace(/\n/g, '<br/>');
}

function renderRecipes(model, options = {}) {
  const onRecipeRendered = typeof options.onRecipeRendered === 'function'
    ? options.onRecipeRendered
    : null;
  const recipes = model.recipes || [];
  const brandName = model.cover?.brandName || 'Healthy Martina';
  const brandEmail = model.cover?.brandEmail || 'cristina@healthymartina.com';
  if (!recipes.length) return '';

  return recipes.map((r, index) => {
    if (onRecipeRendered) {
      onRecipeRendered(index + 1, recipes.length, r);
    }
    const ingredients = (r.ingredients || []).map((i) => `<li><span>${esc(i.name)}</span><span class="right">${esc(i.amount || '')}</span></li>`).join('');
    const instructions = (r.instructions || []).map((s) => `<li>${esc(s)}</li>`).join('');
    const nutrition = (r.nutrition || []).map((n) => `<tr><td>${esc(n.name)}</td><td class="right">${esc(n.amount || '')}</td></tr>`).join('');
    const tipsBlocks = (r.tipsBlocks || []).length
      ? (r.tipsBlocks || []).map((tip) => `<div class="tip-block">
          ${tip.title ? `<h3 class="tip-title">${esc(tip.title)}</h3>` : ''}
          ${tip.description ? `<p class="tip-desc">${nl2br(tip.description)}</p>` : ''}
        </div>`).join('')
      : (r.tips ? `<p class="tip-desc">${nl2br(r.tips)}</p>` : '');

    return `<section class="pdf-page section-break recipe-page-primary">
      <div class="doc-header"><div class="brand-note">Healthy Martina</div><h1>${esc(r.title)}</h1></div>
      <div class="recipe-top-image"><img src="${esc(r.image || '')}" alt="${esc(r.title)}" /></div>
      <div class="recipe-content-grid recipe-content-grid-top">
        <article class="recipe-grid-card">
          <h2 class="section-title">Ingredientes</h2>
          <ul class="ingredient-list">${ingredients}</ul>
        </article>
        <article class="recipe-grid-card">
          <h2 class="section-title">Instrucciones</h2>
          <ol class="instruction-list">${instructions}</ol>
        </article>
      </div>
      <div class="recipe-footer">
        <span class="recipe-footer-brand">${esc(brandName)}</span>
        <span class="recipe-footer-email">${esc(brandEmail)}</span>
      </div>
    </section>

    <section class="pdf-page section-break recipe-page-secondary">
      <div class="doc-header"><div class="brand-note">Healthy Martina</div><h1>${esc(r.title)}</h1></div>
      <div class="recipe-content-grid recipe-content-grid-bottom">
        <article class="recipe-grid-card">
          <h2 class="section-title">Información nutricional</h2>
          <table class="nutrition-table">${nutrition}</table>
        </article>
        <article class="recipe-grid-card">
          <h2 class="section-title">Tips</h2>
          ${tipsBlocks}
        </article>
      </div>
      <div class="recipe-footer">
        <span class="recipe-footer-brand">${esc(brandName)}</span>
        <span class="recipe-footer-email">${esc(brandEmail)}</span>
      </div>
    </section>`;
  }).join('');
}

module.exports = { renderRecipes };
