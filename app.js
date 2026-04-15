/* ══════════════════════════════════════════════════════════
   Crystal Bracelet Designer — app.js  (v5)
   ══════════════════════════════════════════════════════════ */

// ─── Constants ───────────────────────────────────────────
const CANVAS_SIZE = 520;
const CX = CANVAS_SIZE / 2;
const CY = CANVAS_SIZE / 2;

// The inner raised platform ("Empathya Crystals" logo circle) outer edge
// sits at this fraction of (CANVAS_SIZE/2) when the tray image is at scale=1.
// This circle's circumference = wrist circumference; beads rest just outside.
const INNER_CIRCLE_FRAC = 0.58;

// ─── Tray Image ──────────────────────────────────────────
const trayImg = new Image();
trayImg.src = '水晶托盤.png';
let trayImgLoaded = false;
trayImg.onload = () => { trayImgLoaded = true; drawScene(); };

// Tray visual scale: 13 cm → 0.72,  20 cm → 1.0
function getTrayScale() {
  return 0.72 + ((wristCm - 13) / (20 - 13)) * 0.28;
}

// Inner circle outer-edge radius in canvas pixels.
function getInnerCircleRadiusPx() {
  return (CANVAS_SIZE / 2) * INNER_CIRCLE_FRAC * getTrayScale();
}

// Pixel-per-mm ratio derived consistently from wrist size & tray scale.
// innerCircle_mm = wristCm*10 / (2π)  →  S = innerCircle_px / innerCircle_mm
function getPixelsPerMm() {
  const innerR_mm = (wristCm * 10) / (2 * Math.PI);
  return getInnerCircleRadiusPx() / innerR_mm;
}

// Bead centre radius = inner circle outer edge + one bead radius (touching).
function getBeadCenterRadius() {
  return getInnerCircleRadiusPx() + (globalBeadMm / 2) * getPixelsPerMm();
}

// ─── i18n ────────────────────────────────────────────────
const I18N = {
  zh: {
    logo:        '曦雅水晶設計助手',
    wristLabel:  '手圍',
    beadLabel:   '珠子大小',
    emptyHint:   '點擊右側水晶<br/>珠子將依序放入凹槽',
    canvasHint:  '左鍵拖曳調整位置 · 右鍵調整大小或移除 · 停留顯示名稱',
    ctxTitle:    '珠子調整',
    ctxRemove:   '✕ 移除此珠子',
    catNames:    ['愛情與人際','事業與財富','平靜與療癒','辟邪與防護','智慧與靈性'],
    overLimit:   '超過手圍上限，請調整手圍或移除其他水晶',
    statsTitle:  '已放置水晶',
    statsPieces: '顆',
    clearBtn:    '清除盤面',
    sectionCrystal: '水晶',
    sectionAccessory: '配飾',
    accNames: ['純銀','合金','鋯石'],
    guideTitle:  '使用指南',
    guideStep1:  '上方滑桿選擇<b>手圍尺寸</b>（13–20 cm）',
    guideStep2:  '選擇<b>珠子大小</b>（6–16 mm）',
    guideStep3:  '點擊右側<b>水晶</b>分類，選取水晶放入凹槽',
    guideStep4:  '點擊右側<b>配飾</b>（純銀／合金／鋯石）加入飾品',
    guideStep5:  '<b>拖曳</b>珠子可調整順序；<b>右鍵</b>可調整大小或移除',
    guideStep6:  '盤面下方按鈕可<b>清除</b>全部珠子',
    expandGuide: '展開使用指南',
    collapseGuide: '收起使用指南'
  },
  en: {
    logo:        'Empathya Crystals Design',
    wristLabel:  'Wrist Size',
    beadLabel:   'Bead Size',
    emptyHint:   'Click crystals on the right<br/>to place them in the groove',
    canvasHint:  'Drag to reorder · Right-click to resize or remove · Hover to identify',
    ctxTitle:    'Bead Settings',
    ctxRemove:   '✕ Remove this bead',
    catNames:    ['Love & Relationships','Career & Wealth','Calm & Healing','Protection & Warding','Wisdom & Spirituality'],
    overLimit:   'Exceeds wrist limit. Adjust wrist size or remove other beads.',
    statsTitle:  'Beads on bracelet',
    statsPieces: 'pcs',
    clearBtn:    'Clear Tray',
    sectionCrystal: 'Crystals',
    sectionAccessory: 'Accessories',
    accNames: ['Sterling Silver','Alloy','Zircon'],
    guideTitle:  'User Guide',
    guideStep1:  'Select <b>Wrist Size</b> (13–20 cm) with the slider',
    guideStep2:  'Select <b>Bead Size</b> (6–16 mm)',
    guideStep3:  'Click <b>Crystal</b> categories to place beads in the tray',
    guideStep4:  'Click <b>Accessories</b> (Silver/Alloy/Zircon) to add charms',
    guideStep5:  '<b>Drag</b> beads to reorder; <b>Right-click</b> to resize or remove',
    guideStep6:  'Click the button below to <b>clear</b> the tray completely',
    expandGuide: 'Expand Guide',
    collapseGuide: 'Collapse Guide'
  }
};
let currentLang = 'zh';
function t(key) { return I18N[currentLang][key] ?? key; }

function setLang(lang) {
  currentLang = lang;
  document.getElementById('btnZh').classList.toggle('active', lang === 'zh');
  document.getElementById('btnEn').classList.toggle('active', lang === 'en');
  document.documentElement.lang = lang === 'zh' ? 'zh-TW' : 'en';
  document.title = t('logo');
  applyI18n();
  buildSidePanel();
  drawScene();
}

function applyI18n() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (I18N[currentLang][key] !== undefined) el.innerHTML = I18N[currentLang][key];
  });
  document.getElementById('contextMenuTitle').textContent = t('ctxTitle');
  document.getElementById('ctxRemoveBtn').textContent = t('ctxRemove');
  const clearBtn = document.getElementById('clearTrayBtn');
  if (clearBtn) clearBtn.textContent = t('clearBtn');
  const toggleBtn = document.getElementById('leftToggleBtn');
  if (toggleBtn) {
    const isCollapsed = document.getElementById('leftHint').classList.contains('collapsed');
    toggleBtn.title = isCollapsed ? t('expandGuide') : t('collapseGuide');
  }
}

// ─── Crystal Database ────────────────────────────────────
const CATEGORIES = [
  {
    icon: '💗', zhName: '愛情與人際', enName: 'Love & Relationships',
    crystals: [
      { zh:'玫瑰石英',   en:'Rose Quartz',          c:['#ffcdd8','#f0859a','#c85070','#ff8aaa','#ffe0e8'] },
      { zh:'紅紋石',     en:'Rhodochrosite',         c:['#ffaab8','#e06070','#b83050','#ff8090','#ffd0d8'] },
      { zh:'月光石',     en:'Moonstone',             c:['#f0eaff','#c8c0e8','#9088c8','#e8e4ff','#ffffff'] },
      { zh:'草莓晶',     en:'Strawberry Quartz',     c:['#ffb0b0','#e87080','#c04060','#ff9090','#ffd8d8'] },
      { zh:'粉色碧璽',   en:'Pink Tourmaline',       c:['#ffb8e0','#e070b0','#b83888','#ff90c8','#ffd8f0'] },
      { zh:'粉色蛋白石', en:'Pink Opal',             c:['#ffd8ec','#f8a0c8','#e06898','#ffc0de','#fff0f8'] },
      { zh:'芙蓉晶',     en:'Pink Crystal',          c:['#fcc8d5','#eda8b8','#d07888','#fcb8c8','#ffe8ee'] },
      { zh:'摩根石',     en:'Morganite',             c:['#fad8c8','#f0a898','#c87068','#fac8b8','#fff0ea'] },
      { zh:'菱錳礦',     en:'Rhodonite',             c:['#e8a0b8','#c86890','#a04068','#e890b0','#f8d0e0'] },
      { zh:'紅玉髓',     en:'Red Carnelian',         c:['#ff9878','#e06040','#b03820','#ff8060','#ffd0c0'] },
      { zh:'石榴石',     en:'Garnet',                c:['#d04060','#a01828','#700010','#c03050','#f0a8b8'] },
      { zh:'粉晶髮晶',   en:'Pink Rutilated Quartz', c:['#ffb0c8','#e880a0','#c05078','#ff98b8','#ffd8e8'] },
      { zh:'天使石',     en:'Angelite',              c:['#c0d8f0','#90b0d8','#5880b8','#b0cce8','#e8f0fa'] },
      { zh:'孔賽石',     en:'Kunzite',               c:['#e8c0e8','#c090c8','#9060a0','#d8b0d8','#f8e8f8'] },
      { zh:'錳鋁榴石',   en:'Spessartine Garnet',   c:['#ff9050','#d06020','#a03808','#ff8040','#ffd0a8'] },
      { zh:'粉色方解石', en:'Pink Calcite',           c:['#ffd0d8','#f8a8b8','#e07888','#ffbccc','#fff0f4'] },
      { zh:'紅紋瑪瑙',   en:'Red Banded Agate',      c:['#e09090','#c05868','#904050','#d88090','#f0c8cc'] },
      { zh:'珊瑚',       en:'Coral',                 c:['#ff8878','#e06050','#c04038','#ff7868','#ffd0c8'] },
      { zh:'珍珠',       en:'Pearl',                 c:['#fefef8','#e8e8e0','#c8c8c0','#f8f8f0','#ffffff'] },
      { zh:'粉色東菱石', en:'Pink Aventurine',        c:['#ffd8e8','#f8a8c0','#e07898','#ffcade','#fff5f8'] },
    ]
  },
  {
    icon: '💰', zhName: '事業與財富', enName: 'Career & Wealth',
    crystals: [
      { zh:'黃水晶',   en:'Citrine',              c:['#ffe898','#f0c830','#c09800','#ffdf60','#fff8d8'] },
      { zh:'虎眼石',   en:"Tiger's Eye",           c:['#d0a860','#a07828','#785010','#c09848','#e8d0a8'] },
      { zh:'綠幽靈',   en:'Green Phantom Quartz',  c:['#a8f0b8','#58d070','#208840','#88e8a0','#d0f8dc'] },
      { zh:'黃鐵礦',   en:'Pyrite',               c:['#e8d888','#c8b848','#a09020','#ddd078','#f8f0c8'] },
      { zh:'孔雀石',   en:'Malachite',             c:['#58f0a0','#20c868','#108040','#40e888','#b0f8cc'] },
      { zh:'翡翠',     en:'Jade (Jadeite)',        c:['#78f0a8','#40d078','#18904a','#60e898','#c0f8d8'] },
      { zh:'東菱石',   en:'Green Aventurine',      c:['#98e8b0','#58c878','#309050','#80dca0','#c8f0d8'] },
      { zh:'金髮晶',   en:'Gold Rutilated Quartz', c:['#ffe898','#f0c840','#b89010','#ffd860','#fff0c0'] },
      { zh:'黃幽靈',   en:'Yellow Phantom Quartz', c:['#f8f090','#e8d850','#c0b020','#f0e870','#fffac0'] },
      { zh:'橄欖石',   en:'Peridot',              c:['#c8f870','#98e030','#68b010','#b0f050','#e0ffa8'] },
      { zh:'紅虎眼石', en:"Red Tiger's Eye",      c:['#d08868','#a85838','#804020','#c87858','#e8bca8'] },
      { zh:'藍虎眼石', en:"Blue Tiger's Eye",     c:['#7898c8','#4870a8','#284880','#6888b8','#b8cce0'] },
      { zh:'綠碧璽',   en:'Green Tourmaline',      c:['#68e898','#30c868','#108840','#50d888','#a8f8c8'] },
      { zh:'帝王玉',   en:'Imperial Jade',         c:['#50f0a8','#18d878','#08984a','#38e890','#a0f8d0'] },
      { zh:'黃玉',     en:'Yellow Topaz',          c:['#fff8b0','#f0e068','#c8b828','#f8f080','#ffffd0'] },
      { zh:'茶晶',     en:'Smoky Yellow Quartz',   c:['#d8c080','#b09040','#886818','#c8b060','#e8d8a0'] },
      { zh:'祖母綠',   en:'Emerald',               c:['#28e870','#10b848','#087830','#20d860','#88f4b0'] },
      { zh:'日長石',   en:'Sunstone',             c:['#ffd8a0','#f8b050','#e88018','#f8c878','#ffeec8'] },
      { zh:'透輝石',   en:'Diopside',              c:['#68d8a0','#38b070','#187848','#50c888','#a8e8c8'] },
      { zh:'棕色碧璽', en:'Brown Tourmaline',      c:['#c0a080','#907060','#605040','#b09070','#d8c4a8'] },
    ]
  },
  {
    icon: '🌿', zhName: '平靜與療癒', enName: 'Calm & Healing',
    crystals: [
      { zh:'紫水晶',    en:'Amethyst',           c:['#d898f8','#9840d8','#681098','#c070e8','#f0c8ff'] },
      { zh:'藍紋瑪瑙',  en:'Blue Lace Agate',    c:['#b0d8f8','#78a8e0','#4878c0','#98c8f0','#d8ecfc'] },
      { zh:'海藍寶',    en:'Aquamarine',         c:['#88e8f8','#40c8e0','#1898b8','#68d8f0','#c0f0fa'] },
      { zh:'白水晶',    en:'Clear Quartz',       c:['#f8f4ff','#e8e0f8','#c8c0e8','#f0ecfc','#ffffff'] },
      { zh:'葡萄石',    en:'Prehnite',           c:['#c8f0c8','#90d090','#609070','#b0e8b0','#e4f8e4'] },
      { zh:'藍玉髓',    en:'Blue Chalcedony',    c:['#98d0f0','#60a8d8','#3880b8','#80c0e8','#c8e8f8'] },
      { zh:'綠松石',    en:'Turquoise',          c:['#48e8d8','#18c0b0','#089888','#30d8c8','#98f0e8'] },
      { zh:'藍色方解石', en:'Blue Calcite',      c:['#a8c8e8','#7898d0','#5070b0','#98b8e0','#d0e4f4'] },
      { zh:'霰石',      en:'Aragonite',          c:['#f0d8b0','#c8b088','#a08858','#e0c898','#f8ecd8'] },
      { zh:'磷灰石',    en:'Apatite',            c:['#48d0d8','#18a8b8','#107898','#38c0cc','#90e8ec'] },
      { zh:'玉石',      en:'Nephrite Jade',      c:['#88d8a8','#60b880','#389060','#78c898','#bce8d0'] },
      { zh:'冰種水晶',  en:'Ice Quartz',         c:['#f0f8ff','#d8ecfc','#b8d8f0','#e8f4ff','#ffffff'] },
      { zh:'矽孔雀石',  en:'Chrysocolla',        c:['#40d8c8','#10b0a0','#088878','#30c8b8','#90e8e0'] },
      { zh:'紫玉髓',    en:'Purple Chalcedony',  c:['#d8b0f0','#b080d0','#8858a8','#ca98e8','#f0d8fc'] },
      { zh:'人參石',    en:'Serpentine',         c:['#b0e8b0','#80c880','#589858','#a0d8a0','#d0f0d0'] },
      { zh:'菊花石',    en:'Chrysanthemum Stone',c:['#e8e0d0','#c8c0b0','#a8a090','#d8d0c0','#f4f0e8'] },
      { zh:'粉色玉石',  en:'Pink Jade',          c:['#f8d0d8','#e8a0b0','#c87888','#f0bcc8','#fce8ee'] },
      { zh:'粉色薔薇輝石',en:'Rhodonite (Pink)', c:['#f8b0c8','#e07898','#c05078','#f0a0bc','#fcd8e8'] },
      { zh:'藍色托帕石', en:'Blue Topaz',        c:['#88c8f8','#4898e0','#2070c0','#78b8f0','#c8e4fc'] },
      { zh:'蠟石',      en:'Wax Stone',          c:['#f0e8d0','#d8d0b8','#b8b098','#e8e0c8','#f8f4ea'] },
    ]
  },
  {
    icon: '🛡️', zhName: '辟邪與防護', enName: 'Protection & Warding',
    crystals: [
      { zh:'黑曜石',    en:'Obsidian',              c:['#605868','#302830','#180818','#504858','#887898'] },
      { zh:'黑碧璽',    en:'Black Tourmaline',      c:['#504858','#282030','#100810','#403840','#706878'] },
      { zh:'煙晶',      en:'Smoky Quartz',          c:['#908090','#605860','#404048','#807878','#b0a8b0'] },
      { zh:'赤鐵礦',    en:'Hematite',              c:['#a0a0a8','#686870','#404048','#909098','#c8c8d0'] },
      { zh:'拉長石',    en:'Labradorite',           c:['#708aaa','#486090','#284878','#607898','#a0b8cc'] },
      { zh:'黑瑪瑙',    en:'Black Onyx',            c:['#504860','#281828','#0c080e','#403850','#706870'] },
      { zh:'黑尖晶石',  en:'Black Spinel',          c:['#484858','#202030','#080c18','#383848','#686878'] },
      { zh:'彩虹黑曜石', en:'Rainbow Obsidian',     c:['#584880','#301850','#180830','#483870','#7868a0'] },
      { zh:'雪花黑曜石', en:'Snowflake Obsidian',   c:['#686068','#403840','#180c20','#585058','#988890'] },
      { zh:'金曜石',    en:'Gold Sheen Obsidian',   c:['#806858','#503820','#280c08','#705848','#a89080'] },
      { zh:'黑色髮晶',  en:'Black Rutilated Quartz',c:['#504050','#281828','#0c0810','#403040','#706070'] },
      { zh:'鷹眼石',    en:"Hawk's Eye",            c:['#485870','#283848','#0c1e30','#384858','#688098'] },
      { zh:'虎鐵石',    en:'Tiger Iron',            c:['#906050','#604028','#402010','#805040','#b09080'] },
      { zh:'黑膽石',    en:'Jet Stone',             c:['#3c3840','#200e18','#080408','#2c2830','#564e58'] },
      { zh:'黑色瑪瑙',  en:'Black Agate',           c:['#484050','#24182c','#0c0812','#382c40','#6c6070'] },
      { zh:'深色石榴石', en:'Dark Garnet',          c:['#701020','#400810','#200004','#600818','#a04060'] },
      { zh:'磁石',      en:'Magnetite',             c:['#686870','#404048','#202028','#585860','#888890'] },
      { zh:'隕石',      en:'Meteorite',             c:['#706858','#484030','#281810','#605848','#908070'] },
      { zh:'電氣石',    en:'Elbaite Tourmaline',    c:['#505060','#282838','#101018','#404050','#706878'] },
      { zh:'銀灰拉長石', en:'Spectrolite',          c:['#607898','#385878','#183050','#507090','#90aac0'] },
    ]
  },
  {
    icon: '🔮', zhName: '智慧與靈性', enName: 'Wisdom & Spirituality',
    crystals: [
      { zh:'青金石',    en:'Lapis Lazuli',       c:['#3858d8','#1830b0','#081880','#2848c8','#7888f0'] },
      { zh:'螢石',      en:'Fluorite',           c:['#b868e8','#7828d0','#4808a0','#9848d8','#d8a0f8'] },
      { zh:'天青石',    en:'Celestite',          c:['#98c8f0','#68a0d8','#3878b8','#88b8e8','#c8dff8'] },
      { zh:'舒俱徠石',  en:'Sugilite',           c:['#b840c8','#8018a0','#500870','#a030b8','#d880e0'] },
      { zh:'紫龍晶',    en:'Charoite',           c:['#9858c8','#6830a8','#400880','#8848b8','#c090e0'] },
      { zh:'紫鋰輝石',  en:'Lepidolite',         c:['#c898e0','#a070c8','#7848a0','#b888d8','#e0c0f0'] },
      { zh:'藍晶石',    en:'Kyanite',            c:['#4878d0','#2058b0','#0c3890','#3868c0','#88a0e0'] },
      { zh:'透石膏',    en:'Selenite',           c:['#f8f4f0','#e8e0d8','#c8c0b8','#f0ece8','#ffffff'] },
      { zh:'紫色螢石',  en:'Purple Fluorite',    c:['#a050e0','#7020c0','#480890','#9040d0','#c888f0'] },
      { zh:'坦桑石',    en:'Tanzanite',          c:['#3848d0','#1828b0','#081088','#2838c0','#7880e8'] },
      { zh:'星光藍寶石', en:'Star Sapphire',     c:['#2858b0','#0e3888','#0c2870','#1e4898','#6888c8'] },
      { zh:'蘇打石',    en:'Sodalite',           c:['#3058b8','#183898','#082880','#2848a8','#6888d0'] },
      { zh:'莫爾達維石', en:'Moldavite',          c:['#38b860','#18904a','#086030','#28a850','#78d898'] },
      { zh:'彩虹螢石',  en:'Rainbow Fluorite',   c:['#c070e8','#9040d0','#6018a0','#b060d8','#e098f8'] },
      { zh:'紫黃晶',    en:'Ametrine',           c:['#e0c070','#c0a840','#a08018','#d0b858','#f0d8a0'] },
      { zh:'彩虹月光石', en:'Rainbow Moonstone', c:['#e8e0ff','#c8c0f0','#a098e0','#d8d0fc','#f8f4ff'] },
      { zh:'白紋石',    en:'Howlite',            c:['#f0ecf8','#d8d4e8','#b8b0d0','#e8e4f4','#ffffff'] },
      { zh:'藍色藍晶石', en:'Blue Kyanite',      c:['#4880d8','#2060b8','#0c4098','#3870c8','#80a8e0'] },
      { zh:'紫色方解石', en:'Purple Calcite',    c:['#d8a8f0','#b078d8','#8848b0','#c898e8','#ecccfc'] },
      { zh:'銀線方鉛礦', en:'Galena',            c:['#909898','#606868','#383e40','#808888','#b0b8b8'] },
    ]
  }
];

// ─── Accessories ─────────────────────────────────────────
const ACCESSORIES = [
  { zh:'純銀', en:'Sterling Silver', c:['#f8f8f8','#d8d8d8','#a8a8a8','#e8e8e8','#ffffff'] },
  { zh:'合金', en:'Alloy',           c:['#d8c898','#b8a868','#988848','#c8b888','#f0e8c8'] },
  { zh:'鋯石', en:'Zircon',          c:['#f0f8ff','#c8e0f8','#90b8e8','#e0f0ff','#ffffff'] },
];

// ─── State ───────────────────────────────────────────────
let wristCm      = 16;
let globalBeadMm = 8;
let beads        = [];   // [{ crystalKey, customMm, type }]  type: 'crystal'|'accessory'
let beadPositions= [];   // [{x,y,r}]  cached per draw
let totalSlots   = 0;    // total slots for current wrist+bead config

let dragIndex      = null;
let hoverBeadIndex = null;
let contextBeadIndex = null;

// crystal key = `${catIdx}-${crystalIdx}` or `acc-${accIdx}`
function getCrystalByKey(key) {
  if (key.startsWith('acc-')) {
    const idx = parseInt(key.slice(4));
    return ACCESSORIES[idx];
  }
  const [ci, ki] = key.split('-').map(Number);
  return CATEGORIES[ci].crystals[ki];
}
function crystalName(crystal) {
  return currentLang === 'zh' ? crystal.zh : crystal.en;
}

// ─── Bead Layout ─────────────────────────────────────────
function beadRadiusPx(bead) {
  const mm = bead.customMm ?? globalBeadMm;
  return (mm / 2) * getPixelsPerMm();
}

function calcBeadCount(circumCm, beadMm) {
  // Physics: beads touch each other on the circle just outside the inner ring.
  // Bead-centre circumference = inner_circum + π × bead_diam
  // N = floor( (inner_circum + π × bead_diam) / bead_diam )
  //   = floor( inner_circum / bead_diam  +  π )
  return Math.max(1, Math.floor((circumCm * 10) / beadMm + Math.PI));
}

// ─── Arc-contact bead layout ─────────────────────────────
// Each bead sits with its inner edge on the inner circle.
// Adjacent filled beads are nearly tangent (arc-length contact).
// After all filled beads, remaining empty ghost slots fill the rest.
function computeBeadPositions() {
  beadPositions = [];
  if (!beads.length && totalSlots === 0) return;

  const innerR = getInnerCircleRadiusPx();   // inner-circle edge
  const S      = getPixelsPerMm();            // px per mm

  // ── 1. Place filled beads with arc-contact rule ──────────
  // Each bead i has its own placement radius = innerR + r_i
  // The angle between bead i and bead i+1 is chosen so their
  // surfaces just touch along the arc:
  //   angularStep = (r_i + r_{i+1}) / midRadius
  // where midRadius = average of the two placement radii.
  // We start at 12 o'clock (angle = -π/2).

  const filledAngles = [];   // one angle per filled bead
  let angle = -Math.PI / 2;

  for (let i = 0; i < beads.length; i++) {
    const mm   = beads[i].customMm ?? globalBeadMm;
    const r    = (mm / 2) * S;
    const Rplacement = innerR + r;   // centre of this bead from canvas-centre
    filledAngles.push({ angle, Rplacement, r });

    if (i < beads.length - 1) {
      // Compute step toward next bead
      const mmNext = beads[i + 1].customMm ?? globalBeadMm;
      const rNext  = (mmNext / 2) * S;
      const Rnext  = innerR + rNext;
      const Rmid   = (Rplacement + Rnext) / 2;  // average radius
      const dAngle = (r + rNext) / Rmid;         // arc-contact angle step
      angle += dAngle;
    }
  }

  // ── 2. Compute leftover arc for empty ghost slots ─────────
  // Total arc consumed by filled beads (from first to last centre)
  // Empty slots share the remaining arc evenly.
  let filledArcUsed = 0;
  if (beads.length > 1) {
    // Arc from first bead centre to last bead centre already accumulated.
    // We also need half-step on each end to account for bead radii touching
    // the gap boundary.
    const rFirst    = filledAngles[0].r;
    const Rfirst    = filledAngles[0].Rplacement;
    const rLast     = filledAngles[filledAngles.length - 1].r;
    const Rlast     = filledAngles[filledAngles.length - 1].Rplacement;
    // Arc from last bead's outer edge to first bead's outer edge (the gap)
    filledArcUsed = (filledAngles[filledAngles.length - 1].angle - filledAngles[0].angle)
                   + rFirst / Rfirst + rLast / Rlast;  // half-step each end
  }

  const totalArc    = 2 * Math.PI;
  const emptyCount  = Math.max(0, totalSlots - beads.length);
  const leftoverArc = Math.max(0, totalArc - filledArcUsed);
  const defaultR    = (globalBeadMm / 2) * S;
  const defaultRP   = innerR + defaultR;

  // ── 3. Build beadPositions ────────────────────────────────
  // Filled beads
  filledAngles.forEach(({ angle: a, Rplacement, r }) => {
    beadPositions.push({
      x: CX + Rplacement * Math.cos(a),
      y: CY + Rplacement * Math.sin(a),
      r,
      filled: true
    });
  });

  // Empty ghost slots (evenly spaced in leftover arc)
  if (emptyCount > 0) {
    // Start angle = after the last filled bead's outer edge
    let emptyStartAngle = -Math.PI / 2;  // fallback for 0 filled beads
    if (beads.length > 0) {
      const last = filledAngles[filledAngles.length - 1];
      emptyStartAngle = last.angle + last.r / last.Rplacement;
    }
    const emptyStep = leftoverArc / emptyCount;
    for (let j = 0; j < emptyCount; j++) {
      const a = emptyStartAngle + emptyStep * (j + 0.5);
      beadPositions.push({
        x: CX + defaultRP * Math.cos(a),
        y: CY + defaultRP * Math.sin(a),
        r: defaultR,
        filled: false
      });
    }
  }
}

// ─── Canvas Setup ─────────────────────────────────────────
const canvas = document.getElementById('braceletCanvas');
canvas.width  = CANVAS_SIZE;
canvas.height = CANVAS_SIZE;
const ctx = canvas.getContext('2d');

// ─── Draw: Tray Image ────────────────────────────────────
function drawTray() {
  const scale = getTrayScale();
  const drawSize = CANVAS_SIZE * scale;
  const offsetX  = (CANVAS_SIZE - drawSize) / 2;
  const offsetY  = (CANVAS_SIZE - drawSize) / 2;

  if (trayImgLoaded) {
    ctx.save();
    ctx.drawImage(trayImg, offsetX, offsetY, drawSize, drawSize);
    ctx.restore();
  } else {
    // Fallback: draw wooden circle
    const trayR = (CANVAS_SIZE / 2) * 0.96 * scale;
    const woodGrad = ctx.createRadialGradient(
      CX - trayR * 0.25, CY - trayR * 0.20, trayR * 0.1,
      CX, CY, trayR
    );
    woodGrad.addColorStop(0,   '#6b4020');
    woodGrad.addColorStop(0.35,'#4a2810');
    woodGrad.addColorStop(0.65,'#321808');
    woodGrad.addColorStop(0.85,'#1e0e04');
    woodGrad.addColorStop(1,   '#0a0502');
    ctx.save();
    ctx.beginPath();
    ctx.arc(CX, CY, trayR, 0, Math.PI * 2);
    ctx.fillStyle = woodGrad;
    ctx.fill();

    // Draw two circles to represent the groove
    const grooveR = getInnerCircleRadiusPx() + (globalBeadMm / 2) * getPixelsPerMm();
    const beadDiam = globalBeadMm * getPixelsPerMm();
    const grooveW  = beadDiam * 1.22;
    ctx.beginPath();
    ctx.arc(CX, CY, grooveR, 0, Math.PI * 2);
    ctx.strokeStyle = '#100806';
    ctx.lineWidth = grooveW;
    ctx.stroke();
    ctx.restore();
  }
}

// ─── Draw: Empty Slot ────────────────────────────────────
function drawEmptySlot(x, y, r) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r * 0.72, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(180,140,80,0.22)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([3, 3]);
  ctx.stroke();
  ctx.restore();
}

// ─── Draw: Realistic Crystal Bead ────────────────────────
function drawCrystalBead(x, y, r, colors, isHover, isDragging) {
  const [cLight, cMid, cDark, cSpec, cRim] = colors;

  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.clip();

  // Layer 1: base dark fill
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = cDark;
  ctx.fill();

  // Layer 2: main volumetric gradient
  const mainGrad = ctx.createRadialGradient(
    x - r * 0.30, y - r * 0.32, r * 0.02,
    x + r * 0.28, y + r * 0.32, r * 1.15
  );
  mainGrad.addColorStop(0,   cLight);
  mainGrad.addColorStop(0.38, cMid);
  mainGrad.addColorStop(0.72, cDark);
  mainGrad.addColorStop(1,   '#000000');
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = mainGrad;
  ctx.fill();

  // Layer 3: Subsurface scattering
  const subGrad = ctx.createRadialGradient(
    x - r * 0.05, y + r * 0.08, 0,
    x - r * 0.05, y + r * 0.08, r * 0.78
  );
  subGrad.addColorStop(0,   cLight + 'aa');
  subGrad.addColorStop(0.4, cLight + '30');
  subGrad.addColorStop(1,   'transparent');
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = subGrad;
  ctx.globalAlpha = 0.45;
  ctx.fill();
  ctx.globalAlpha = 1;

  // Layer 4: Diffuse primary highlight
  const diff = ctx.createRadialGradient(
    x - r * 0.35, y - r * 0.38, 0,
    x - r * 0.35, y - r * 0.38, r * 0.72
  );
  diff.addColorStop(0,   'rgba(255,255,255,0.82)');
  diff.addColorStop(0.25,'rgba(255,255,255,0.48)');
  diff.addColorStop(0.60,'rgba(255,255,255,0.12)');
  diff.addColorStop(1,   'rgba(255,255,255,0)');
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = diff;
  ctx.fill();

  // Layer 5: Rim light
  const rimGrad = ctx.createRadialGradient(
    x + r * 0.55, y + r * 0.52, r * 0.3,
    x, y, r
  );
  rimGrad.addColorStop(0,   'rgba(255,255,255,0)');
  rimGrad.addColorStop(0.75,'rgba(255,255,255,0)');
  rimGrad.addColorStop(1,   'rgba(255,255,255,0.18)');
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = rimGrad;
  ctx.fill();

  // Layer 6: Pinpoint specular
  const specSize = r * 0.11;
  const specGrd = ctx.createRadialGradient(
    x - r * 0.28, y - r * 0.32, 0,
    x - r * 0.28, y - r * 0.32, specSize * 1.6
  );
  specGrd.addColorStop(0,   'rgba(255,255,255,1)');
  specGrd.addColorStop(0.4, 'rgba(255,255,255,0.8)');
  specGrd.addColorStop(1,   'rgba(255,255,255,0)');
  ctx.beginPath();
  ctx.arc(x - r * 0.28, y - r * 0.32, specSize * 1.6, 0, Math.PI * 2);
  ctx.fillStyle = specGrd;
  ctx.fill();

  ctx.restore(); // End clip

  // Drop shadow
  ctx.save();
  ctx.beginPath();
  ctx.arc(x + r * 0.15, y + r * 0.22, r * 0.88, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0)';
  ctx.shadowColor  = 'rgba(0,0,0,0.65)';
  ctx.shadowBlur   = r * 0.9;
  ctx.shadowOffsetX = r * 0.18;
  ctx.shadowOffsetY = r * 0.25;
  ctx.arc(x + r * 0.05, y + r * 0.10, r * 0.9, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Hover ring
  if (isHover || isDragging) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r + 3, 0, Math.PI * 2);
    ctx.strokeStyle = isDragging ? 'rgba(255,220,80,0.9)' : 'rgba(200,170,80,0.7)';
    ctx.lineWidth = 2.2;
    ctx.shadowColor = 'rgba(220,180,80,0.5)';
    ctx.shadowBlur  = 8;
    ctx.stroke();
    ctx.restore();
  }
}

function drawAllShadows() {
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  beadPositions.forEach(p => {
    if (!p.filled) return;
    const shadowGrd = ctx.createRadialGradient(
      p.x + p.r * 0.2, p.y + p.r * 0.3, p.r * 0.2,
      p.x + p.r * 0.2, p.y + p.r * 0.3, p.r * 1.1
    );
    shadowGrd.addColorStop(0,   'rgba(10,5,0,0.55)');
    shadowGrd.addColorStop(0.5, 'rgba(10,5,0,0.20)');
    shadowGrd.addColorStop(1,   'rgba(0,0,0,0)');
    ctx.beginPath();
    ctx.arc(p.x + p.r * 0.12, p.y + p.r * 0.20, p.r * 1.0, 0, Math.PI * 2);
    ctx.fillStyle = shadowGrd;
    ctx.fill();
  });
  ctx.restore();
}

// ─── Draw: Full Scene ─────────────────────────────────────
function drawScene() {
  ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  // Compute totalSlots dynamically based on actual bead sizes:
  // 1) Figure out arc consumed by all filled beads (arc-contact).
  // 2) Remaining arc → how many default-size empty slots fit.
  {
    const innerR = getInnerCircleRadiusPx();
    const S      = getPixelsPerMm();
    const defaultR  = (globalBeadMm / 2) * S;
    const defaultRP = innerR + defaultR;

    // Arc consumed by filled beads
    let consumedArc = 0;
    if (beads.length === 1) {
      const r  = ((beads[0].customMm ?? globalBeadMm) / 2) * S;
      const RP = innerR + r;
      consumedArc = 2 * r / RP;   // one bead: diameter arc
    } else if (beads.length > 1) {
      let arcAcc = 0;
      for (let i = 0; i < beads.length - 1; i++) {
        const mm  = beads[i].customMm ?? globalBeadMm;
        const r   = (mm / 2) * S;
        const RP  = innerR + r;
        const mmN = beads[i + 1].customMm ?? globalBeadMm;
        const rN  = (mmN / 2) * S;
        const RPN = innerR + rN;
        arcAcc += (r + rN) / ((RP + RPN) / 2);
      }
      // Add half-arc for first and last bead ends
      const rFirst = ((beads[0].customMm ?? globalBeadMm) / 2) * S;
      const RFirst  = innerR + rFirst;
      const rLast  = ((beads[beads.length-1].customMm ?? globalBeadMm) / 2) * S;
      const RLast   = innerR + rLast;
      consumedArc = arcAcc + rFirst / RFirst + rLast / RLast;
    }

    const leftoverArc = Math.max(0, 2 * Math.PI - consumedArc);
    const arcPerEmpty = (2 * defaultR) / defaultRP;   // arc for one default bead
    const emptySlots  = arcPerEmpty > 0 ? Math.floor(leftoverArc / arcPerEmpty) : 0;
    totalSlots = beads.length + emptySlots;
  }
  computeBeadPositions();

  drawTray();

  const hasBeads = beads.length > 0;

  // Draw empty slots first
  beadPositions.forEach((p, i) => {
    if (!p.filled) drawEmptySlot(p.x, p.y, p.r);
  });

  if (!hasBeads) { updateStats(); return; }

  drawAllShadows();
  beadPositions.forEach((p, i) => {
    if (!p.filled) return;
    const crystal = getCrystalByKey(beads[i].crystalKey);
    drawCrystalBead(p.x, p.y, p.r, crystal.c, hoverBeadIndex === i, dragIndex === i);
  });
  updateStats();
}

// ─── Controls ────────────────────────────────────────────
const wristSlider    = document.getElementById('wristSlider');
const wristDisplay   = document.getElementById('wristDisplay');
const beadSizeSelect = document.getElementById('beadSizeSelect');

// Compute how many MORE beads of globalBeadMm size fit after current beads.
// Returns total capacity (filled + available empty slots).
function computeMaxBeads() {
  const innerR    = getInnerCircleRadiusPx();
  const S         = getPixelsPerMm();
  const defaultR  = (globalBeadMm / 2) * S;
  const defaultRP = innerR + defaultR;

  let consumedArc = 0;
  if (beads.length === 1) {
    const r  = ((beads[0].customMm ?? globalBeadMm) / 2) * S;
    const RP = innerR + r;
    consumedArc = 2 * r / RP;
  } else if (beads.length > 1) {
    let arcAcc = 0;
    for (let i = 0; i < beads.length - 1; i++) {
      const r  = ((beads[i].customMm ?? globalBeadMm) / 2) * S;
      const RP = innerR + r;
      const rN = ((beads[i+1].customMm ?? globalBeadMm) / 2) * S;
      const RN = innerR + rN;
      arcAcc  += (r + rN) / ((RP + RN) / 2);
    }
    const rF  = ((beads[0].customMm ?? globalBeadMm) / 2) * S;
    const rL  = ((beads[beads.length-1].customMm ?? globalBeadMm) / 2) * S;
    consumedArc = arcAcc + rF / (innerR + rF) + rL / (innerR + rL);
  }

  const leftover = Math.max(0, 2 * Math.PI - consumedArc);
  const arcPerDefault = (2 * defaultR) / defaultRP;
  return beads.length + (arcPerDefault > 0 ? Math.floor(leftover / arcPerDefault) : 0);
}

function clampBeads() {
  // Temporarily remove custom sizes when re-computing base capacity
  const maxN = calcBeadCount(wristCm, globalBeadMm);
  if (beads.length > maxN) beads = beads.slice(0, maxN);
}

function updateWristDisplay() {
  const inches = (wristCm / 2.54).toFixed(1);
  wristDisplay.textContent = `${wristCm} cm / ${inches}"`;
  const pct = ((wristCm - 13) / (20 - 13)) * 100;
  wristSlider.style.setProperty('--pct', `${pct}%`);
}

wristSlider.addEventListener('input', () => {
  wristCm = parseFloat(wristSlider.value);
  updateWristDisplay();
  clampBeads();
  drawScene();
});

beadSizeSelect.addEventListener('change', () => {
  globalBeadMm = parseInt(beadSizeSelect.value);
  clampBeads();
  drawScene();
});

updateWristDisplay();

// ─── Side Panel ──────────────────────────────────────────
function buildSidePanel() {
  const panel  = document.getElementById('sidePanel');
  const names  = I18N[currentLang].catNames;
  // Preserve open states
  const opens  = CATEGORIES.map((_, ci) =>
    document.getElementById(`cat-body-${ci}`)?.classList.contains('open') ?? false
  );
  panel.innerHTML = '';

  // ── Section title: 水晶 ──
  const crystalTitle = document.createElement('div');
  crystalTitle.className = 'section-title';
  crystalTitle.textContent = t('sectionCrystal');
  panel.appendChild(crystalTitle);

  CATEGORIES.forEach((cat, ci) => {
    const block  = document.createElement('div');
    block.className = 'category-block';

    const header = document.createElement('div');
    header.className = 'cat-header' + (opens[ci] ? ' open' : '');
    header.id = `cat-header-${ci}`;
    header.innerHTML = `
      <span class="cat-icon">${cat.icon}</span>
      <span class="cat-name">${names[ci]}</span>
      <span class="cat-count">${cat.crystals.length}</span>
      <span class="cat-chevron">▼</span>`;

    // Floating dropdown body
    const body = document.createElement('div');
    body.className = 'cat-body' + (opens[ci] ? ' open' : '');
    body.id = `cat-body-${ci}`;

    const list = document.createElement('div');
    list.className = 'crystal-list';

    cat.crystals.forEach((crystal, ki) => {
      const key  = `${ci}-${ki}`;
      const item = document.createElement('div');
      item.className = 'crystal-item';
      item.id = `crystal-${key}`;

      item.appendChild(makeSVGBead(crystal.c, 28));

      const nameSpan = document.createElement('span');
      nameSpan.className = 'crystal-name';
      nameSpan.textContent = currentLang === 'zh' ? crystal.zh : crystal.en;
      item.appendChild(nameSpan);

      item.addEventListener('click', () => addCrystal(key));
      list.appendChild(item);
    });

    body.appendChild(list);
    block.appendChild(header);
    block.appendChild(body);
    panel.appendChild(block);

    header.addEventListener('click', () => toggleCategory(ci));
  });

  // ── Section title: 配飾 ──
  const accTitle = document.createElement('div');
  accTitle.className = 'section-title';
  accTitle.style.marginTop = '10px';
  accTitle.textContent = t('sectionAccessory');
  panel.appendChild(accTitle);

  // Accessory items
  ACCESSORIES.forEach((acc, ai) => {
    const key  = `acc-${ai}`;
    const item = document.createElement('div');
    item.className = 'crystal-item accessory-item';
    item.id = `accessory-${ai}`;

    item.appendChild(makeSVGBead(acc.c, 28));

    const nameSpan = document.createElement('span');
    nameSpan.className = 'crystal-name';
    nameSpan.textContent = currentLang === 'zh' ? acc.zh : acc.en;
    item.appendChild(nameSpan);

    item.addEventListener('click', () => addCrystal(key));
    panel.appendChild(item);
  });
}

function makeSVGBead(colors, size) {
  const ns  = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('width', size);
  svg.setAttribute('height', size);
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.setAttribute('class', 'crystal-bead-preview');

  const defs   = document.createElementNS(ns, 'defs');
  const id     = `g${Math.random().toString(36).slice(2,8)}`;
  const grad   = document.createElementNS(ns, 'radialGradient');
  grad.setAttribute('id', id);
  grad.setAttribute('cx', '35%'); grad.setAttribute('cy', '32%'); grad.setAttribute('r', '65%');

  [
    [0,   colors[0]],
    [0.38, colors[1]],
    [0.72, colors[2]],
    [1,    '#000000']
  ].forEach(([off, col]) => {
    const s = document.createElementNS(ns, 'stop');
    s.setAttribute('offset', off);
    s.setAttribute('stop-color', col);
    grad.appendChild(s);
  });

  const diffId = `d${Math.random().toString(36).slice(2,8)}`;
  const diff   = document.createElementNS(ns, 'radialGradient');
  diff.setAttribute('id', diffId);
  diff.setAttribute('cx', '35%'); diff.setAttribute('cy', '32%'); diff.setAttribute('r', '55%');
  [
    [0,   'rgba(255,255,255,0.88)'],
    [0.25,'rgba(255,255,255,0.50)'],
    [0.60,'rgba(255,255,255,0.12)'],
    [1,   'rgba(255,255,255,0)']
  ].forEach(([off, col]) => {
    const s = document.createElementNS(ns, 'stop');
    s.setAttribute('offset', off);
    s.setAttribute('stop-color', col);
    diff.appendChild(s);
  });
  defs.appendChild(grad);
  defs.appendChild(diff);

  const circle = document.createElementNS(ns, 'circle');
  circle.setAttribute('cx','50'); circle.setAttribute('cy','50'); circle.setAttribute('r','48');
  circle.setAttribute('fill', `url(#${id})`);

  const hiLayer = document.createElementNS(ns, 'circle');
  hiLayer.setAttribute('cx','50'); hiLayer.setAttribute('cy','50'); hiLayer.setAttribute('r','48');
  hiLayer.setAttribute('fill', `url(#${diffId})`);

  const dot = document.createElementNS(ns, 'ellipse');
  dot.setAttribute('cx','33'); dot.setAttribute('cy','28');
  dot.setAttribute('rx','12'); dot.setAttribute('ry','8');
  dot.setAttribute('fill', 'rgba(255,255,255,0.95)');
  dot.setAttribute('transform', 'rotate(-35,33,28)');

  svg.appendChild(defs);
  svg.appendChild(circle);
  svg.appendChild(hiLayer);
  svg.appendChild(dot);
  return svg;
}

function toggleCategory(ci) {
  // Close all others first
  CATEGORIES.forEach((_, i) => {
    if (i !== ci) {
      const h = document.getElementById(`cat-header-${i}`);
      const b = document.getElementById(`cat-body-${i}`);
      if (h) h.classList.remove('open');
      if (b) b.classList.remove('open');
    }
  });
  const header = document.getElementById(`cat-header-${ci}`);
  const body   = document.getElementById(`cat-body-${ci}`);
  const open   = body.classList.contains('open');
  header.classList.toggle('open', !open);
  body.classList.toggle('open', !open);
}

// ─── Add / Remove Crystals ───────────────────────────────
function addCrystal(key) {
  // Use dynamic capacity so mixed-size beads are respected.
  const maxN = computeMaxBeads();
  if (beads.length >= maxN) {
    canvas.style.outline = '2px solid rgba(200,80,80,0.55)';
    setTimeout(() => canvas.style.outline = '', 700);
    return;
  }
  beads.push({ crystalKey: key, customMm: null });
  drawScene();
}

function removeBead(index) {
  beads.splice(index, 1);
  hideContextMenu();
  drawScene();
}

// ─── Clear Tray ──────────────────────────────────────────
function clearTray() {
  beads = [];
  drawScene();
}

// ─── Canvas Hit Testing ───────────────────────────────────
function getBeadAt(mx, my) {
  // Only check filled slots
  for (let i = beads.length - 1; i >= 0; i--) {
    const p = beadPositions[i];
    if (!p || !p.filled) continue;
    if ((mx-p.x)**2 + (my-p.y)**2 <= p.r*p.r) return i;
  }
  return -1;
}

function canvasMouse(e) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = CANVAS_SIZE / rect.width;
  const scaleY = CANVAS_SIZE / rect.height;
  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top)  * scaleY
  };
}

// ─── Mouse Events ─────────────────────────────────────────
canvas.addEventListener('mousemove', e => {
  if (dragIndex !== null) { handleDrag(e); return; }
  const { x, y } = canvasMouse(e);
  const idx = getBeadAt(x, y);
  if (idx !== hoverBeadIndex) {
    hoverBeadIndex = idx;
    drawScene();
  }
  if (idx >= 0) {
    showTooltip(e.clientX, e.clientY, idx);
    canvas.style.cursor = 'grab';
  } else {
    hideTooltip();
    canvas.style.cursor = 'default';
  }
});

canvas.addEventListener('mouseleave', () => {
  hideTooltip();
  if (hoverBeadIndex !== null) { hoverBeadIndex = null; drawScene(); }
});

canvas.addEventListener('mousedown', e => {
  if (e.button !== 0) return;
  hideContextMenu();
  const { x, y } = canvasMouse(e);
  const idx = getBeadAt(x, y);
  if (idx >= 0) {
    dragIndex = idx;
    canvas.style.cursor = 'grabbing';
    e.preventDefault();
  }
});

function handleDrag(e) {
  if (dragIndex === null) return;
  const { x, y } = canvasMouse(e);
  const newIdx = getBeadAt(x, y);
  if (newIdx >= 0 && newIdx !== dragIndex) {
    [beads[dragIndex], beads[newIdx]] = [beads[newIdx], beads[dragIndex]];
    dragIndex = newIdx;
    drawScene();
  }
}

canvas.addEventListener('mouseup', e => {
  if (e.button === 0) { dragIndex = null; canvas.style.cursor = 'default'; }
});

canvas.addEventListener('contextmenu', e => {
  e.preventDefault();
  const { x, y } = canvasMouse(e);
  const idx = getBeadAt(x, y);
  if (idx >= 0) showContextMenu(e.clientX, e.clientY, idx);
});

// ─── Tooltip ──────────────────────────────────────────────
const tooltip = document.getElementById('beadTooltip');
function showTooltip(cx, cy, idx) {
  const crystal = getCrystalByKey(beads[idx].crystalKey);
  tooltip.textContent = crystalName(crystal);
  tooltip.style.left = `${cx + 13}px`;
  tooltip.style.top  = `${cy - 34}px`;
  tooltip.classList.add('visible');
}
function hideTooltip() { tooltip.classList.remove('visible'); }

// ─── Context Menu ─────────────────────────────────────────
const ctxMenu       = document.getElementById('contextMenu');
const ctxSizeSlider = document.getElementById('ctxSizeSlider');
const ctxSizeVal    = document.getElementById('ctxSizeVal');
const ctxBeadName   = document.getElementById('ctxBeadName');
const ctxRemoveBtn  = document.getElementById('ctxRemoveBtn');

function showContextMenu(cx, cy, idx) {
  contextBeadIndex = idx;
  const bead    = beads[idx];
  const crystal = getCrystalByKey(bead.crystalKey);
  const mm      = bead.customMm ?? globalBeadMm;

  ctxBeadName.textContent   = crystalName(crystal);
  ctxSizeSlider.value       = mm;
  ctxSizeVal.textContent    = `${mm} mm`;

  document.getElementById('contextMenuTitle').textContent = t('ctxTitle');
  ctxRemoveBtn.textContent = t('ctxRemove');

  const vw = window.innerWidth, vh = window.innerHeight;
  ctxMenu.style.left = `${Math.min(cx, vw - 230)}px`;
  ctxMenu.style.top  = `${Math.min(cy, vh - 160)}px`;
  ctxMenu.classList.add('visible');
}
function hideContextMenu() {
  ctxMenu.classList.remove('visible');
  contextBeadIndex = null;
}

ctxSizeSlider.addEventListener('input', () => {
  if (contextBeadIndex === null) return;
  const mm = parseInt(ctxSizeSlider.value);
  ctxSizeVal.textContent = `${mm} mm`;
  beads[contextBeadIndex].customMm = mm;

  // Correct over-limit check: use arc-contact geometry.
  // Only warn when the arc consumed by all beads exceeds 2π (full circle).
  if (isOverLimitByArc()) {
    showOverLimitNotification();
  }

  drawScene();
});

ctxRemoveBtn.addEventListener('click', () => {
  if (contextBeadIndex !== null) removeBead(contextBeadIndex);
});

document.addEventListener('click',   e => { if (!ctxMenu.contains(e.target)) hideContextMenu(); });
document.addEventListener('keydown',  e => { if (e.key === 'Escape') hideContextMenu(); });

// ─── Arc-based over-limit check ─────────────────────────────
// Returns true only when the arc consumed by all filled beads
// (arc-contact geometry) exceeds a full revolution (2π).
function isOverLimitByArc() {
  if (beads.length <= 1) return false;
  const innerR = getInnerCircleRadiusPx();
  const S      = getPixelsPerMm();
  let arcAcc = 0;
  for (let i = 0; i < beads.length - 1; i++) {
    const r  = ((beads[i].customMm ?? globalBeadMm) / 2) * S;
    const RP = innerR + r;
    const rN = ((beads[i+1].customMm ?? globalBeadMm) / 2) * S;
    const RN = innerR + rN;
    arcAcc += (r + rN) / ((RP + RN) / 2);
  }
  const rF = ((beads[0].customMm ?? globalBeadMm) / 2) * S;
  const rL = ((beads[beads.length-1].customMm ?? globalBeadMm) / 2) * S;
  const consumedArc = arcAcc + rF / (innerR + rF) + rL / (innerR + rL);
  return consumedArc > 2 * Math.PI;
}

// ─── Over-Limit Notification ─────────────────────────────
function showOverLimitNotification() {
  let notif = document.getElementById('overLimitNotif');
  if (!notif) {
    notif = document.createElement('div');
    notif.id = 'overLimitNotif';
    document.body.appendChild(notif);
  }
  notif.textContent = t('overLimit');
  notif.classList.remove('hide');
  notif.classList.add('show');
  clearTimeout(notif._timer);
  notif._timer = setTimeout(() => {
    notif.classList.remove('show');
    notif.classList.add('hide');
  }, 3500);
}

// ─── Stats Display ────────────────────────────────────────
function updateStats() {
  const statsEl   = document.getElementById('beadStats');
  const countEl   = document.getElementById('statsCount');
  if (!statsEl) return;

  if (!beads.length) {
    statsEl.innerHTML = '';
    if (countEl) countEl.textContent = '';
    return;
  }

  // Tally beads by crystal name (preserving insertion order)
  const counts = {};
  const order  = [];
  beads.forEach(b => {
    const crystal = getCrystalByKey(b.crystalKey);
    const name = crystalName(crystal);
    if (!counts[name]) { counts[name] = 0; order.push(name); }
    counts[name]++;
  });

  // Update the count badge in panel header
  if (countEl) countEl.textContent = `${beads.length} / ${totalSlots}`;

  // Build one row per crystal type
  let html = '';
  order.forEach(name => {
    const cnt = counts[name];
    html += `<div class="stats-row">
      <span class="stats-row-cnt">${cnt}</span>
      <span class="stats-row-name">${name}</span>
    </div>`;
  });
  statsEl.innerHTML = html;
}


// ─── Left Panel Toggle ───────────────────────────────────
function toggleLeftPanel() {
  const panel = document.getElementById('leftHint');
  const btn   = document.getElementById('leftToggleBtn');
  const isCollapsed = panel.classList.toggle('collapsed');
  btn.textContent = isCollapsed ? '▷' : '◁';
  btn.title = isCollapsed ? t('expandGuide') : t('collapseGuide');
}

// ─── Init ────────────────────────────────────────────────
applyI18n();
buildSidePanel();
updateWristDisplay();
drawScene();
