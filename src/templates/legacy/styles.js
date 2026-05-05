function renderStyles() {
  return `
  <style>
  @page { size: A4 portrait; margin: 0; }
  *{box-sizing:border-box;font-family:DejaVu Sans,Helvetica,Arial,sans-serif}
  html,body{margin:0;padding:0;background:#fff;color:#111}
  .pdf-page{position:relative;width:210mm;min-height:297mm;padding:12mm;page-break-after:always;break-after:page;background:#fff}
  .pdf-page:last-child{page-break-after:auto;break-after:auto}
  .section-break{break-before:page;page-break-before:always}
  .section-break:first-child{break-before:auto;page-break-before:auto}
  .recipe-avoid-break{break-inside:avoid;page-break-inside:avoid}
  .doc-header{border-bottom:3px solid #111;padding-bottom:8px;margin-bottom:14px}
  .doc-header h1{margin:0 0 2px;font-size:20px;color:#111;font-weight:700}
  .brand-note{float:right;text-align:right;font-size:8px;color:#555;padding-top:2px}
  .section-title{font-size:12px;font-weight:700;color:#111;margin:14px 0 8px;padding-bottom:4px;border-bottom:1px solid #ececec;text-transform:uppercase;letter-spacing:.04em}
  .weekly-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px 22px}
  .day-card{break-inside:avoid;page-break-inside:avoid}
  .day-title{margin:0 0 8px;font-size:16px;line-height:1;font-weight:800;color:#36544e;text-transform:uppercase}
  .meal-row{display:flex;align-items:flex-start;gap:8px;margin-bottom:10px}
  .meal-images{width:62px;display:flex;flex-direction:column;gap:2px;flex:0 0 62px}
  .meal-images img{width:62px;height:36px;object-fit:cover;display:block}
  .meal-image-fallback{width:62px;height:36px;background:#fafafa;border:1px solid #eee}
  .meal-copy{min-width:0;flex:1}
  .meal-name{font-size:11px;font-weight:800;color:#36544e;text-transform:uppercase;margin-bottom:2px}
  .meal-desc{font-size:8px;line-height:1.3;color:#111}
  .item-taken{color:#bbb;text-decoration:line-through}
  .nutrition-reference-page{background:#fff}
  .nutrition-day-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px 18px;padding-right:6mm}
  .nutrition-day-card{break-inside:avoid;page-break-inside:avoid;margin-bottom:12px}
  .nutrition-day-title{margin:0 0 6px;font-size:12pt;font-weight:700;color:#36544e;line-height:1}
  .nutrition-macros-line{display:flex;gap:4px 8px;flex-wrap:wrap;margin-bottom:6px;font-size:6.6pt;font-weight:700;line-height:1.12}
  .macro-carb,.macro-protein,.macro-fat{white-space:nowrap}
  .macro-carb{color:#b279eb}.macro-protein{color:#3afe72}.macro-fat{color:#e79ccd}
  .nutrition-rows{font-size:6.8pt;line-height:1.22;color:#000}
  .nutrition-row{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:3px}
  .nutrition-cell{font-weight:400}
  .nutrition-bold{font-weight:700}
  .lista-grid{width:100%;border-collapse:collapse}.lista-grid td{width:50%;vertical-align:top;padding:0 8px 0 0}
  .lista-category{margin-bottom:11px;break-inside:avoid;page-break-inside:avoid}.lista-cat-title{font-size:10px;font-weight:700;color:#111;text-transform:uppercase;letter-spacing:.04em;border-bottom:1px solid #ececec;padding-bottom:3px;margin-bottom:5px}
  .lista-items{width:100%}
  .lista-item-row{display:flex;align-items:flex-start;gap:4px;margin:0 0 3px;font-size:9px;line-height:1.18}
  .checkbox-cell{display:inline-block;width:12px;min-width:12px;text-align:center}
  .item-amount{display:inline-block;color:#555;font-size:8px;font-weight:700;min-width:46px;white-space:nowrap}
  .item-name{display:inline-block;flex:1 1 auto;text-align:left}
  .page-cover{padding:0;background:#e5e5e5}.cover-photo{height:74vh;padding:34px 26px 0}.cover-photo img{width:100%;height:100%;object-fit:cover;display:block}
  .cover-footer{height:26vh;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;padding-top:36px}
  .cover-title{font-size:38px;line-height:1.05;letter-spacing:.04em;margin:0 0 12px;text-transform:uppercase;font-weight:800;color:#37544e}
  .cover-rule{width:360px;height:2px;background:#444;margin-bottom:12px}.cover-brand{font-size:31px;line-height:1.1;font-weight:700;color:#37544e;margin-bottom:6px}
  .cover-email{font-size:31px;line-height:1.1;font-weight:800;color:#101010}.cover-mark{margin-top:14px;font-size:34px;line-height:1;color:#d8b242}
  .recipe-top-image{width:100%;height:357pt;overflow:hidden;margin:0 0 12px}
  .recipe-top-image img{width:100%;height:100%;object-fit:cover;display:block}
  .recipe-content-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px 16px;align-items:start}
  .recipe-content-grid-top{margin-bottom:20mm}
  .recipe-content-grid-bottom{margin-bottom:20mm}
  .recipe-grid-card{break-inside:avoid;page-break-inside:avoid;min-height:120px}
  .recipe-grid-card .section-title{margin-top:0}
  .recipe-grid-card p{margin:0;font-size:9px;line-height:1.35}
  .tip-block{margin:0 0 10px}
  .tip-title{margin:0 0 2px;font-size:10px;line-height:1.2;font-weight:700;color:#36544e}
  .tip-desc{margin:0;font-size:9px;line-height:1.35}
  .ingredient-list,.instruction-list{margin:0;padding-left:18px}.ingredient-list li,.instruction-list li{margin:0 0 4px}
  .ingredient-list li{display:flex;justify-content:space-between;gap:8px;font-size:9px;line-height:1.25}
  .instruction-list li{font-size:9px;line-height:1.3}
  .right{text-align:right;white-space:nowrap}
  .nutrition-table{width:100%;border-collapse:collapse;font-size:9px}.nutrition-table td{padding:5px 0;border-bottom:1px solid rgba(0,0,0,.06)}
  .recipe-footer{position:absolute;left:12mm;right:12mm;bottom:10mm;display:flex;justify-content:flex-end;gap:6px;font-size:8.2pt}
  .recipe-footer-brand{font-weight:700;color:#36544e}
  .recipe-footer-email{color:#000}
  </style>`;
}

module.exports = { renderStyles };
