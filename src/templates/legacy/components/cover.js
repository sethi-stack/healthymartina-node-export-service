const { esc } = require('./utils');

function renderCover(model) {
  if (!model.cover) return '';
  const c = model.cover;

  return `<section class="pdf-page page-cover section-break">
    <div class="cover-photo"><img src="${esc(c.image)}" alt="${esc(c.title)}" /></div>
    <div class="cover-footer">
      <h1 class="cover-title">${esc(c.title)}</h1>
      <div class="cover-rule"></div>
      <div class="cover-brand">${esc(c.brandName)}</div>
      <div class="cover-email">${esc(c.brandEmail)}</div>
      <div class="cover-mark">•</div>
    </div>
  </section>`;
}

module.exports = { renderCover };
