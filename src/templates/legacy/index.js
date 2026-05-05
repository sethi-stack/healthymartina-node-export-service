const { renderStyles } = require('./styles');
const { renderCover } = require('./components/cover');
const { renderWeeklyPlan } = require('./components/weeklyPlan');
const { renderNutritionSummary } = require('./components/nutrition');
const { renderLista } = require('./components/lista');
const { renderRecipes } = require('./components/recipes');
const { buildLegacyBoldModel } = require('./model');

function renderLegacyBoldDocument(job) {
  const model = buildLegacyBoldModel(job);

  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"/><title>${model.cover.title}</title>${renderStyles()}</head><body>
    ${renderCover(model)}
    ${renderWeeklyPlan(model)}
    ${renderNutritionSummary(model)}
    ${renderLista(model)}
    ${renderRecipes(model)}
  </body></html>`;

  return { html, model };
}

module.exports = { renderLegacyBoldDocument };
