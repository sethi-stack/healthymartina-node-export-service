function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function mealDefaultLabels() {
  return {
    meal_1: 'Desayuno',
    meal_2: 'Lunch',
    meal_3: 'Comida',
    meal_4: 'Snack',
    meal_5: 'Cena',
    meal_6: 'Otros',
  };
}

function dayDefaultLabels() {
  return {
    day_1: 'Lunes',
    day_2: 'Martes',
    day_3: 'Miércoles',
    day_4: 'Jueves',
    day_5: 'Viernes',
    day_6: 'Sábado',
    day_7: 'Domingo',
  };
}

function theme() {
  return {
    accent: '#111111',
    accentSoft: '#ececec',
    bg: '#ffffff',
    headerBorder: '#111111',
    text: '#111111',
    muted: '#555555',
  };
}

function renderHeroCover(model) {
  if (!model.heroRecipe) return '';
  const r = model.heroRecipe;
  const title = esc(model.calendarTitle || r.titulo || 'MENÚ VIP');
  const image = esc(r.imagen_principal || model.placeholderImage || '');
  const brand = esc(model.brandName || 'Healthy Martina');
  const email = esc(model.brandEmail || 'cristina@healthymartina.com');

  return `
  <section class="page page-cover">
    <div class="cover-photo">
      <img src="${image}" alt="${title}" />
    </div>
    <div class="cover-footer">
      <h1 class="cover-title">${title}</h1>
      <div class="cover-rule"></div>
      <div class="cover-brand">${brand}</div>
      <div class="cover-email">${email}</div>
      <div class="cover-mark">•</div>
    </div>
  </section>`;
}

function renderRecipeDetailPage(model, recipePage) {
  const r = recipePage.recipe || {};
  const title = esc(r.titulo || 'Receta');
  const image = esc(r.imagen_principal || model.placeholderImage || '');
  const ingredients = Array.isArray(recipePage.ingredients) ? recipePage.ingredients : [];
  const instructions = Array.isArray(r.instrucciones) ? r.instrucciones : [];
  const nutrition = Array.isArray(recipePage.nutrition) ? recipePage.nutrition : [];

  const ingredientRows = ingredients
    .map((i) => `<li><span>${esc(i.ingrediente || i.nombre || 'Ingrediente')}</span><span class="right">${esc(i.cantidad || '')} ${esc(i.medida || i.unidad || '')}</span></li>`)
    .join('');

  const instructionRows = instructions.map((s) => `<li>${esc(s)}</li>`).join('');
  const nutritionRows = nutrition
    .map((n) => `<tr><td>${esc(n.nombre || 'Nutriente')}</td><td class="right">${esc(n.cantidad || '')} ${esc(n.unidad_medida || '')}</td></tr>`)
    .join('');

  return `
  <section class="page page-recipe">
    <div class="doc-header">
      <div class="brand-note">Healthy Martina</div>
      <h1>${title}</h1>
    </div>
    <div class="recipe-hero">
      <div class="recipe-image"><img src="${image}" alt="${title}" /></div>
      <div class="recipe-content">
        <h2 class="section-title">Ingredientes</h2>
        <ul class="ingredient-list">${ingredientRows}</ul>

        ${instructionRows ? `<h2 class="section-title">Preparación</h2><ol class="instruction-list">${instructionRows}</ol>` : ''}

        ${nutritionRows ? `<h2 class="section-title">Información nutricional</h2><table class="nutrition-table">${nutritionRows}</table>` : ''}
      </div>
    </div>
  </section>`;
}

function renderCalendar(model) {
  const dayLabels = { ...dayDefaultLabels(), ...(model.labels?.days || {}) };
  const mealLabels = { ...mealDefaultLabels(), ...(model.labels?.meals || {}) };
  const main = model.main_schedule || {};
  const sides = model.sides_schedule || {};
  const mainRacion = model.main_racion || {};
  const sidesRacion = model.sides_racion || {};
  const mainLeftovers = model.main_leftovers || {};
  const sidesLeftovers = model.sides_leftovers || {};
  const recipesMap = model.recipes_map || {};

  const visibleDayKeys = Object.keys(dayLabels).filter((d) => {
    return Object.keys(mealLabels).some((m) => main?.[d]?.[m] || sides?.[d]?.[m]);
  });
  const visibleMealKeys = Object.keys(mealLabels).filter((m) => {
    return visibleDayKeys.some((d) => main?.[d]?.[m] || sides?.[d]?.[m]);
  });

  const head = visibleDayKeys.map((d) => `<th>${esc(dayLabels[d])}</th>`).join('');
  const rows = visibleMealKeys.map((mealKey) => {
    const cells = visibleDayKeys.map((dayKey) => {
      const mainId = main?.[dayKey]?.[mealKey] || '';
      const sideId = sides?.[dayKey]?.[mealKey] || '';
      const mainRecipe = mainId ? recipesMap[String(mainId)] : null;
      const sideRecipe = sideId ? recipesMap[String(sideId)] : null;
      const mainName = mainRecipe?.titulo || mainId || '-';
      const sideName = sideRecipe?.titulo || sideId || '-';
      const mainQty = mainRacion?.[dayKey]?.[mealKey] ? ` · x${esc(mainRacion?.[dayKey]?.[mealKey])}` : '';
      const sideQty = sidesRacion?.[dayKey]?.[mealKey] ? ` · x${esc(sidesRacion?.[dayKey]?.[mealKey])}` : '';
      const mainClass = mainLeftovers?.[dayKey]?.[mealKey] ? ' item-taken' : '';
      const sideClass = sidesLeftovers?.[dayKey]?.[mealKey] ? ' item-taken' : '';

      return `<td><div class="calendar-cell"><div class="recipe-title${mainClass}">${esc(mainName)}</div><div class="recipe-meta">Principal${mainQty}</div><div class="recipe-title${sideClass}" style="margin-top:4px;">${esc(sideName)}</div><div class="recipe-meta">Acompañante${sideQty}</div></div></td>`;
    }).join('');

    return `<tr><th class="meal-head"><span>${esc(mealLabels[mealKey])}</span></th>${cells}</tr>`;
  }).join('');

  return `
  <section class="page page-section">
    <div class="section-title">Calendario Semanal</div>
    <table class="calendar-table">
      <thead><tr><th width="72"></th>${head}</tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </section>`;
}

function renderNutrition(model) {
  const rows = Array.isArray(model.nutritionByDay) ? model.nutritionByDay : [];
  if (!rows.length) return '';
  const trs = rows.map((r) => `<tr><td>${esc(r.label || '')}</td><td class="cal-value">${esc(r.calories || 0)}</td></tr>`).join('');
  return `
  <section class="page page-section">
    <div class="section-title">Información Nutricional</div>
    <table class="nutri-table"><thead><tr><th>Día</th><th>Calorías</th></tr></thead><tbody>${trs}</tbody></table>
  </section>`;
}

function renderLista(model) {
  const categories = model.listaData?.categories || [];
  const taken = new Set(model.listaData?.taken_ids || []);
  if (!categories.length) return '';
  const half = Math.ceil(categories.length / 2);
  const cols = [categories.slice(0, half), categories.slice(half)];

  const renderCol = (arr) => arr.map((cat) => {
    const items = (cat.items || []).map((item) => {
      const takenItem = item.ingrediente_id && taken.has(item.ingrediente_id);
      return `<tr><td class="checkbox-cell">${takenItem ? '&#9745;' : '&#9744;'}</td><td class="${takenItem ? 'item-taken' : ''}">${esc(item.nombre || item.ingrediente || 'Ingrediente')}</td><td class="item-amount ${takenItem ? 'item-taken' : ''}">${esc(item.cantidad || '')} ${esc(item.unidad || '')}</td></tr>`;
    }).join('');
    return `<div class="lista-category"><div class="lista-cat-title">${esc(cat.name || cat.nombre || 'Categoría')}</div><table class="lista-items">${items}</table></div>`;
  }).join('');

  return `
  <section class="page page-section">
    <div class="section-title">Lista de Compras</div>
    <table class="lista-grid"><tr><td>${renderCol(cols[0])}</td><td>${renderCol(cols[1])}</td></tr></table>
  </section>`;
}

function buildLegacyBoldBundleHtml(model) {
  const t = theme();
  const recipePages = Array.isArray(model.recipePages) ? model.recipePages : [];

  const recipeSections = recipePages.map((rp) => renderRecipeDetailPage(model, rp)).join('\n');
  const html = `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8" /><title>${esc(model.calendarTitle || 'Calendario')}</title>
<style>
*{box-sizing:border-box;font-family:DejaVu Sans,Helvetica,Arial,sans-serif}body{margin:0;padding:0;color:${t.text};font-size:9px;background:${t.bg}}
.page{page-break-before:always;break-before:page;padding:12mm}.page:first-child{page-break-before:auto;break-before:auto}
.doc-header{border-bottom:3px solid ${t.headerBorder};padding-bottom:8px;margin-bottom:14px}.doc-header h1{margin:0 0 2px;font-size:20px;color:${t.accent};font-weight:700}
.brand-note{float:right;text-align:right;font-size:8px;color:${t.muted};padding-top:2px}
.section-title{font-size:12px;font-weight:700;color:${t.accent};margin:14px 0 8px;padding-bottom:4px;border-bottom:1px solid ${t.accentSoft};text-transform:uppercase;letter-spacing:.04em}
.calendar-table{width:100%;border-collapse:collapse;table-layout:fixed}.calendar-table th,.calendar-table td{border:1px solid #dcdcdc;vertical-align:top;overflow:hidden}
.calendar-table thead th{background:${t.accentSoft};font-size:9px;font-weight:700;padding:7px 5px;text-align:center}.meal-head{width:72px;background:${t.accentSoft};padding:0;text-align:center;position:relative;height:78px;overflow:hidden}
.meal-head span{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-90deg);white-space:nowrap;font-size:9px;font-weight:700}.calendar-cell{padding:5px 4px;min-height:76px}
.recipe-title{font-size:8px;line-height:1.15;font-weight:700}.recipe-meta{display:block;margin-top:2px;font-size:6.5px;line-height:1.1;color:${t.muted}}
.nutri-table{width:100%;border-collapse:collapse}.nutri-table th{background:#f7f7f7;font-size:9px;color:#777;font-weight:700;text-transform:uppercase;padding:5px 8px;border:1px solid #ededed;text-align:left}.nutri-table td{padding:5px 8px;border:1px solid #ededed;font-size:10px}
.cal-value{font-weight:700;color:${t.accent};font-size:12px}.lista-grid{width:100%;border-collapse:collapse}.lista-grid td{width:50%;vertical-align:top;padding:0 6px 0 0}
.lista-cat-title{font-size:10px;font-weight:700;color:${t.accent};text-transform:uppercase;letter-spacing:.04em;border-bottom:1px solid ${t.accentSoft};padding-bottom:3px;margin-bottom:5px}.lista-items{width:100%;border-collapse:collapse}
.lista-items td{padding:3px 4px;font-size:9px;vertical-align:middle}.checkbox-cell{width:14px;text-align:center}.item-taken{color:#bbb;text-decoration:line-through}.item-amount{color:#777;font-size:8px;width:88px;text-align:right}
.page-cover{padding:0;background:#e5e5e5}.cover-photo{height:74vh;padding:34px 26px 0}.cover-photo img{width:100%;height:100%;object-fit:cover;display:block}
.cover-footer{height:26vh;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;padding-top:36px}
.page-cover .cover-title{font-size:38px;line-height:1.05;letter-spacing:.04em;margin:0 0 12px;text-transform:uppercase;font-weight:800;color:#37544e}
.cover-rule{width:360px;height:2px;background:#444;margin-bottom:12px}.cover-brand{font-size:31px;line-height:1.1;font-weight:700;color:#37544e;margin-bottom:6px}
.cover-email{font-size:31px;line-height:1.1;font-weight:800;color:#101010}.cover-mark{margin-top:14px;font-size:34px;line-height:1;color:#d8b242}
.recipe-hero{display:table;width:100%}.recipe-image,.recipe-content{display:table-cell;vertical-align:top}.recipe-image{width:38%;padding-right:14px}.recipe-image img{width:100%;height:250px;object-fit:cover;border-radius:12px;border:1px solid rgba(0,0,0,.08)}
.ingredient-list,.instruction-list{margin:0;padding-left:18px}.ingredient-list li,.instruction-list li{margin:0 0 4px}.ingredient-list li{display:flex;justify-content:space-between;gap:8px}.right{text-align:right;white-space:nowrap}
.nutrition-table{width:100%;border-collapse:collapse;font-size:9px}.nutrition-table td{padding:5px 0;border-bottom:1px solid rgba(0,0,0,.06)}
</style></head><body>
${renderHeroCover(model)}
${recipeSections}
${renderCalendar(model)}
${renderNutrition(model)}
${renderLista(model)}
</body></html>`;

  return html;
}

module.exports = {
  buildLegacyBoldBundleHtml,
};
