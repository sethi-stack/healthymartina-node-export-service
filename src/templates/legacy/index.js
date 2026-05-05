const { renderStyles } = require('./styles');
const { renderCover } = require('./components/cover');
const { renderWeeklyPlan } = require('./components/weeklyPlan');
const { renderNutritionSummary } = require('./components/nutrition');
const { renderLista } = require('./components/lista');
const { renderRecipes } = require('./components/recipes');
const { buildLegacyBoldModel } = require('./model');

const SECTION_FLAGS = {
  CALENDAR: 1,
  LISTA: 2,
  NUTRITION: 4,
};

function resolveExportProfile(payload) {
  const exportParams = Array.isArray(payload.export_param) ? payload.export_param.map(Number) : [];
  const hasFlag = (flag) => exportParams.includes(flag);
  const selectedRecipes = Array.isArray(payload.selected_recipes) ? payload.selected_recipes : [];

  const isListaOnly =
    exportParams.length === 1 &&
    hasFlag(SECTION_FLAGS.LISTA);

  const isSingleRecipeExport =
    hasFlag(SECTION_FLAGS.CALENDAR) &&
    !hasFlag(SECTION_FLAGS.LISTA) &&
    !hasFlag(SECTION_FLAGS.NUTRITION) &&
    selectedRecipes.length === 1;

  if (isListaOnly) return 'lista_only';
  if (isSingleRecipeExport) return 'recipe_single';
  return 'calendar_bundle';
}

function renderLegacyBoldDocument(job) {
  const model = buildLegacyBoldModel(job);
  const payload = job?.payload || {};
  const exportParams = Array.isArray(payload.export_param) ? payload.export_param.map(Number) : [];
  const hasFlag = (flag) => exportParams.includes(flag);
  const hasSelectedRecipes = Array.isArray(payload.selected_recipes) && payload.selected_recipes.length > 0;
  const hasRecipePages = Array.isArray(payload.recipePages) && payload.recipePages.length > 0;
  const profile = resolveExportProfile(payload);

  const showCalendar = profile === 'calendar_bundle' && hasFlag(SECTION_FLAGS.CALENDAR);
  const showLista =
    profile === 'lista_only' ||
    (profile === 'calendar_bundle' && hasFlag(SECTION_FLAGS.LISTA));
  const showNutrition =
    profile === 'calendar_bundle' && hasFlag(SECTION_FLAGS.NUTRITION);
  const showRecipes =
    (profile === 'calendar_bundle' || profile === 'recipe_single') &&
    hasRecipePages &&
    hasSelectedRecipes;
  const showCover = profile === 'calendar_bundle' && showCalendar && !!model.cover?.image;

  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"/><title>${model.cover.title}</title>${renderStyles()}</head><body>
    ${showCover ? renderCover(model) : ''}
    ${showCalendar ? renderWeeklyPlan(model) : ''}
    ${showNutrition ? renderNutritionSummary(model) : ''}
    ${showLista ? renderLista(model) : ''}
    ${showRecipes ? renderRecipes(model) : ''}
  </body></html>`;

  return { html, model };
}

module.exports = { renderLegacyBoldDocument };
