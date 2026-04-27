/* ══════════════════════════════════════════════════════════
   Crystal Bracelet Designer — app.js  (v6 – real crystal images)
   ══════════════════════════════════════════════════════════ */

// ─── Crystal Image Cache ─────────────────────────────────
// Pre-load all crystal images so they render instantly on the canvas.
const crystalImageCache = {};   // key = imgSrc path → HTMLImageElement
let pendingImageLoads = 0;

function preloadCrystalImage(src) {
  if (!src || crystalImageCache[src]) return;
  pendingImageLoads++;
  const img = new Image();
  img.src = src;
  img.onload = () => { pendingImageLoads--; if (pendingImageLoads === 0) drawScene(); };
  img.onerror = () => { pendingImageLoads--; };
  crystalImageCache[src] = img;
}

function preloadAllCrystalImages() {
  // Will be called after CATEGORIES is defined
}

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

// ─── Browse Mode ─────────────────────────────────────────
let browseMode = 'effect';  // 'effect' or 'color'

// Color-based categories: each maps to crystal keys from CATEGORIES
const COLOR_CATEGORIES = [
  { icon:'🔴', zhName:'紅／粉', enName:'Red / Pink',
    match: c => { const h=hexAvgHue(c); const s=hexAvgSat(c); return (h<=15||h>=340) && s>20 || (h>300&&h<340&&s>15); } },
  { icon:'🟠', zhName:'橙／黃', enName:'Orange / Yellow',
    match: c => { const h=hexAvgHue(c); const s=hexAvgSat(c); return h>15&&h<=65&&s>20; } },
  { icon:'🟢', zhName:'綠／青', enName:'Green / Teal',
    match: c => { const h=hexAvgHue(c); const s=hexAvgSat(c); return h>65&&h<=185&&s>15; } },
  { icon:'🔵', zhName:'藍／紫', enName:'Blue / Purple',
    match: c => { const h=hexAvgHue(c); const s=hexAvgSat(c); return h>185&&h<=300&&s>15; } },
  { icon:'⚫', zhName:'黑／白', enName:'Black / White',
    match: c => { const s=hexAvgSat(c); return s<=20; } },
];

function hexToHSL(hex) {
  hex = hex.replace('#','');
  if (hex.length===3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
  const r=parseInt(hex.substring(0,2),16)/255, g=parseInt(hex.substring(2,4),16)/255, b=parseInt(hex.substring(4,6),16)/255;
  const max=Math.max(r,g,b), min=Math.min(r,g,b), d=max-min;
  let h=0, s=0, l=(max+min)/2;
  if(d!==0){ s=l>0.5?d/(2-max-min):d/(max+min); switch(max){case r:h=((g-b)/d+(g<b?6:0))*60;break;case g:h=((b-r)/d+2)*60;break;case b:h=((r-g)/d+4)*60;break;} }
  return {h,s:s*100,l:l*100};
}
function hexAvgHue(colors) {
  let sx=0,sy=0; colors.forEach(c=>{const {h}=hexToHSL(c); sx+=Math.cos(h*Math.PI/180); sy+=Math.sin(h*Math.PI/180);});
  let a=Math.atan2(sy,sx)*180/Math.PI; if(a<0)a+=360; return a;
}
function hexAvgSat(colors) {
  return colors.reduce((sum,c)=>sum+hexToHSL(c).s,0)/colors.length;
}

// Build color category crystal lists (called once after CATEGORIES defined)
let colorCatCrystals = []; // filled after CATEGORIES is defined
function buildColorCatCrystals() {
  colorCatCrystals = COLOR_CATEGORIES.map((cc, ccIdx) => {
    const list = [];
    CATEGORIES.forEach((cat, ci) => {
      cat.crystals.forEach((crystal, ki) => {
        // Manual override via colorCat property takes priority
        if (crystal.colorCat !== undefined) {
          if (crystal.colorCat === ccIdx) list.push({ ci, ki, crystal });
        } else {
          if (cc.match(crystal.c)) list.push({ ci, ki, crystal });
        }
      });
    });
    return list;
  });
}

function setBrowseMode(mode) {
  browseMode = mode;
  document.getElementById('btnEffect')?.classList.toggle('active', mode === 'effect');
  document.getElementById('btnColor')?.classList.toggle('active', mode === 'color');
  buildSidePanel();
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
    colorCatNames: ['紅／粉','橙／黃','綠／青','藍／紫','黑／白'],
    browseEffect: '功效',
    browseColor:  '顏色',
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
    colorCatNames: ['Red / Pink','Orange / Yellow','Green / Teal','Blue / Purple','Black / White'],
    browseEffect: 'Manifest',
    browseColor:  'Color',
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
      { zh:'草莓晶',       en:'Strawberry Quartz',         imgSrc:'水晶單顆/草莓晶.png',           c:['#ffb0b0','#e87080','#c04060','#ff9090','#ffd8d8'],
        zhEffect:'增強愛情運，促進人際和諧，散發個人魅力', enEffect:'Enhances love luck, promotes interpersonal harmony, radiates personal charm' },
      { zh:'粉月光',       en:'Pink Moonstone',            imgSrc:'水晶單顆/粉月光.png',           c:['#fcd0e0','#e8a0c0','#c07898','#f0b8d0','#fff0f6'],
        zhEffect:'柔化情緒，增進溫柔氣質，吸引浪漫緣分', enEffect:'Softens emotions, enhances gentle temperament, attracts romantic connections' },
      { zh:'粉兔毛',       en:'Pink Rabbit Hair Quartz',   imgSrc:'水晶單顆/粉兔毛.png',           c:['#f8c0d0','#e090a8','#c06880','#f0a8c0','#ffe0ea'],
        zhEffect:'招桃花，增強異性緣，提升自信與親和力', enEffect:'Attracts romance, enhances appeal to others, boosts confidence and affinity' },
      { zh:'馬達加斯加粉水晶', en:'Madagascar Rose Quartz', imgSrc:'水晶單顆/馬達加斯加粉水晶.png', c:['#fcc8d8','#f0a0b8','#d87898','#f8b8cc','#ffe8f0'],
        zhEffect:'頂級粉晶，深層療癒感情創傷，開啟心輪之愛', enEffect:'Premium rose quartz, deeply heals emotional wounds, opens heart chakra love' },
      { zh:'紅膠花',       en:'Red Phantom Quartz',        imgSrc:'水晶單顆/紅膠花.png',           c:['#f0a898','#d87868','#b05040','#e89080','#f8d0c8'],
        zhEffect:'增添熱情活力，穩固感情關係，激發行動力', enEffect:'Adds passionate vitality, stabilizes relationships, inspires action' },
      { zh:'紅髮晶',       en:'Red Rutilated Quartz',      imgSrc:'水晶單顆/紅髮晶.png',           c:['#e8a090','#c87060','#a04838','#d89078','#f0c8c0'],
        zhEffect:'增強魅力與自信，促進血液循環，帶來熱情', enEffect:'Enhances charm and confidence, promotes blood circulation, brings passion' },
      { zh:'白珍珠',       en:'Pearl',                     imgSrc:'水晶單顆/白珍珠.png',           c:['#fefef8','#e8e8e0','#c8c8c0','#f8f8f0','#ffffff'], colorCat:4,
        zhEffect:'象徵純潔優雅，增進人際關係，安定情緒', enEffect:'Symbolizes purity and elegance, enhances social relationships, calms emotions' },
      { zh:'白玉髓',       en:'White Chalcedony',          imgSrc:'水晶單顆/白玉髓.png',           c:['#f8f0f0','#e0d8d8','#c0b8b8','#f0e8e8','#ffffff'],
        zhEffect:'促進人際圓融，增強包容力，改善溝通能力', enEffect:'Promotes interpersonal harmony, enhances tolerance, improves communication' },
      { zh:'和田白玉',     en:'Hetian White Jade',         imgSrc:'水晶單顆/和田白玉.png',         c:['#f0e8d8','#d8d0c0','#b8b0a0','#e8e0d0','#f8f4ec'], colorCat:4,
        zhEffect:'君子之石，溫潤養心，增強人格魅力與福氣', enEffect:"Gentleman's stone, gently nourishes the heart, enhances personal charm and fortune" },
      { zh:'白月光',       en:'White Moonstone',           imgSrc:'水晶單顆/白月光.png',           c:['#f0eaff','#d0c8e8','#a8a0d0','#e0d8f0','#ffffff'], colorCat:4,
        zhEffect:'增強直覺與感性，柔化人際互動，平衡情緒', enEffect:'Enhances intuition and sensitivity, softens social interactions, balances emotions' },
      { zh:'朱砂',         en:'Cinnabar',                  imgSrc:'水晶單顆/朱砂.png',             c:['#e03030','#c01818','#900808','#d02020','#f06060'],
        zhEffect:'辟邪鎮煞，增強正緣，帶來喜慶吉祥', enEffect:'Wards off evil, enhances positive relationships, brings joy and auspiciousness' },
    ]
  },
  {
    icon: '💰', zhName: '事業與財富', enName: 'Career & Wealth',
    crystals: [
      { zh:'黄水晶',       en:'Citrine',                    imgSrc:'水晶單顆/黄水晶.png',           c:['#ffe898','#f0c830','#c09800','#ffdf60','#fff8d8'],
        zhEffect:'招正財偏財，增強自信與決斷力，帶來豐盛', enEffect:'Attracts wealth, enhances confidence and decisiveness, brings abundance' },
      { zh:'金髮晶',       en:'Gold Rutilated Quartz',      imgSrc:'水晶單顆/金髮晶.png',           c:['#ffe898','#f0c840','#b89010','#ffd860','#fff0c0'],
        zhEffect:'招財聚氣，增強領導力，事業運強力提升', enEffect:'Attracts wealth and energy, enhances leadership, powerfully boosts career luck' },
      { zh:'金鈦晶',       en:'Gold Titanium Quartz',       imgSrc:'水晶單顆/金钛晶.png',           c:['#ffd870','#e8b030','#c08810','#f0c050','#ffe8a0'],
        zhEffect:'水晶之王，極強招財能量，增強正財與權勢', enEffect:'King of crystals, extremely powerful wealth energy, enhances fortune and authority' },
      { zh:'金虎眼',       en:"Gold Tiger's Eye",           imgSrc:'水晶單顆/金虎眼.png',           c:['#d0a860','#a07828','#785010','#c09848','#e8d0a8'],
        zhEffect:'增強意志力，帶來財運與果斷力，辟邪護身', enEffect:'Strengthens willpower, brings wealth luck and decisiveness, wards off evil' },
      { zh:'黄虎眼',       en:"Yellow Tiger's Eye",         imgSrc:'水晶單顆/黄虎眼.png',           c:['#d8b868','#b09038','#886818','#c8a850','#e8d898'],
        zhEffect:'增強洞察力與判斷力，招財護身，穩定情緒', enEffect:"Enhances insight and judgment, attracts wealth, stabilizes emotions" },
      { zh:'金運石',       en:'Sunstone (Golden)',           imgSrc:'水晶單顆/金運石.png',           c:['#f8c870','#e0a040','#c07818','#f0b858','#fce0a0'],
        zhEffect:'帶來好運與正能量，提升自信，吸引財富', enEffect:'Brings good luck and positive energy, boosts confidence, attracts wealth' },
      { zh:'黄塔晶',       en:'Yellow Tower Quartz',        imgSrc:'水晶單顆/黄塔晶.png',           c:['#f8d088','#e0a850','#c08028','#f0c070','#fce8b0'],
        zhEffect:'聚財穩運，增強個人氣場，提升事業格局', enEffect:'Accumulates wealth and stabilizes luck, enhances personal aura, elevates career vision' },
      { zh:'黄兔毛',       en:'Yellow Rabbit Hair Quartz',  imgSrc:'水晶單顆/黄兔毛.png',           c:['#f8d898','#e0b868','#c09040','#f0c880','#fce8c0'],
        zhEffect:'偏財運旺盛，帶來意外之財，增強創造力', enEffect:'Strong windfall luck, brings unexpected fortune, enhances creativity' },
      { zh:'茶晶',         en:'Smoky Quartz',               imgSrc:'水晶單顆/茶晶.png',             c:['#c8a878','#a08050','#786030','#b89868','#e0c8a0'],
        zhEffect:'穩定磁場，增強實踐力，幫助落實目標', enEffect:'Stabilizes energy field, enhances execution ability, helps achieve goals' },
      { zh:'橄欖石',       en:'Peridot',                    imgSrc:'水晶單顆/橄欖石.png',           c:['#c8e890','#98c860','#70a038','#b0d878','#e0f0b8'],
        zhEffect:'帶來財富與好運，增強行動力，促進事業發展', enEffect:'Brings wealth and fortune, enhances initiative, promotes career development' },
      { zh:'檸檬黃',       en:'Lemon Quartz',               imgSrc:'水晶單顆/檸檬黃.png',           c:['#f8f0a0','#e8d868','#c8b838','#f0e880','#fffac8'],
        zhEffect:'活躍思維，帶來樂觀正能量，提升創業運', enEffect:'Activates thinking, brings optimistic energy, boosts entrepreneurial luck' },
      { zh:'黄膠花',       en:'Yellow Phantom Quartz',      imgSrc:'水晶單顆/黄膠花.png',           c:['#f0d890','#d8b860','#b89838','#e8c878','#f8ecc0'],
        zhEffect:'穩健聚財，培養耐心，增強長期投資運', enEffect:'Steadily accumulates wealth, cultivates patience, enhances long-term investment luck' },
      { zh:'黄螢石',       en:'Yellow Fluorite',            imgSrc:'水晶單顆/黄螢石.png',           c:['#f8e898','#e8d060','#c8b030','#f0d878','#fff0c0'],
        zhEffect:'增強邏輯思維，提升學習效率，帶來靈感', enEffect:'Enhances logical thinking, boosts learning efficiency, brings inspiration' },
    ]
  },
  {
    icon: '🌿', zhName: '平靜與療癒', enName: 'Calm & Healing',
    crystals: [
      { zh:'白水晶',       en:'Clear Quartz',               imgSrc:'水晶單顆/白水晶.png',           c:['#f8f4ff','#e8e0f8','#c8c0e8','#f0ecfc','#ffffff'], colorCat:4,
        zhEffect:'淨化能量場，增強專注力，萬能療癒之石', enEffect:'Purifies energy field, enhances focus, universal healing stone' },
      { zh:'白兔毛',       en:'White Rabbit Hair Quartz',   imgSrc:'水晶單顆/白兔毛.png',           c:['#f8f0e8','#e8e0d0','#c8c0b0','#f0e8e0','#ffffff'],
        zhEffect:'淨化心靈雜念，帶來平靜祥和，柔化能量', enEffect:'Purifies mental clutter, brings peaceful serenity, softens energy' },
      { zh:'白幽靈',       en:'White Phantom Quartz',       imgSrc:'水晶單顆/白幽靈.png',           c:['#f0ece8','#d8d4d0','#b8b4b0','#e8e4e0','#ffffff'],
        zhEffect:'淨化雜念，提升靈性層次，帶來內心平靜', enEffect:'Purifies stray thoughts, elevates spiritual level, brings inner peace' },
      { zh:'白螢石',       en:'White Fluorite',             imgSrc:'水晶單顆/白螢石.png',           c:['#f0eef8','#d8d6e0','#b8b6c0','#e8e6f0','#ffffff'], colorCat:4,
        zhEffect:'淨化思緒，增強精神清明，促進身心放鬆', enEffect:'Purifies thoughts, enhances mental clarity, promotes physical and mental relaxation' },
      { zh:'海藍寶',       en:'Aquamarine',                 imgSrc:'水晶單顆/海藍寶.png',           c:['#a8e0f0','#70c0d8','#4098b8','#90d0e8','#d0f0f8'],
        zhEffect:'舒緩壓力，增強表達能力，帶來勇氣與平靜', enEffect:'Relieves stress, enhances expression, brings courage and tranquility' },
      { zh:'藍月光',       en:'Blue Moonstone',             imgSrc:'水晶單顆/藍月光.png',           c:['#c8d8f0','#98b0d8','#6888b8','#b0c8e8','#e0ecf8'],
        zhEffect:'安定情緒波動，增強直覺力，促進深層放鬆', enEffect:'Calms emotional fluctuations, enhances intuition, promotes deep relaxation' },
      { zh:'藍托帕',       en:'Blue Topaz',                 imgSrc:'水晶單顆/藍托帕.png',           c:['#88c8f8','#4898e0','#2070c0','#78b8f0','#c8e4fc'],
        zhEffect:'冷靜思考，增強溝通表達，舒緩焦慮不安', enEffect:'Promotes calm thinking, enhances communication, relieves anxiety' },
      { zh:'葡萄石',       en:'Prehnite',                   imgSrc:'水晶單顆/葡萄石.png',           c:['#c8e8b8','#98d090','#68a868','#b0d8a0','#e0f0d8'],
        zhEffect:'希望之石，減輕焦慮，增強包容力與療癒力', enEffect:'Stone of hope, reduces anxiety, enhances tolerance and healing power' },
      { zh:'綠水晶',       en:'Green Quartz',               imgSrc:'水晶單顆/绿水晶.png',           c:['#a0e8b0','#70c880','#40a058','#88d898','#c8f0d0'],
        zhEffect:'舒緩壓力，調和心靈，帶來生機與希望', enEffect:'Relieves stress, harmonizes the mind, brings vitality and hope' },
      { zh:'綠兔毛',       en:'Green Rabbit Hair Quartz',   imgSrc:'水晶單顆/綠兔毛.png',           c:['#c8e8c8','#98c898','#68a068','#b0d8b0','#e0f0e0'],
        zhEffect:'安撫情緒，促進身心平衡，增強復原力', enEffect:'Soothes emotions, promotes mind-body balance, enhances resilience' },
      { zh:'綠草莓',       en:'Green Strawberry Quartz',    imgSrc:'水晶單顆/綠草莓.png',           c:['#b0e8b8','#80c888','#58a060','#98d8a0','#d0f0d0'],
        zhEffect:'滋養心輪，增強同理心，帶來平靜與喜悅', enEffect:'Nourishes heart chakra, enhances empathy, brings peace and joy' },
      { zh:'天河石',       en:'Amazonite',                  imgSrc:'水晶單顆/天河石.png',           c:['#40c8c0','#18a8a0','#088880','#30b8b0','#80e0d8'],
        zhEffect:'安撫不安情緒，增強信心與勇氣，平衡能量', enEffect:'Soothes anxiety, enhances confidence and courage, balances energy' },
      { zh:'白阿賽',       en:'White Azeztulite',           imgSrc:'水晶單顆/白阿塞.png',           c:['#f0ece8','#d8d4d0','#b8b4b0','#e8e4e0','#faf8f6'],
        zhEffect:'高頻療癒石，淨化並提升身體振動頻率', enEffect:'High-frequency healing stone, purifies and elevates body vibration frequency' },
    ]
  },
  {
    icon: '🛡️', zhName: '辟邪與防護', enName: 'Protection & Warding',
    crystals: [
      { zh:'黑曜石',       en:'Obsidian',                   imgSrc:'水晶單顆/黑曜石.png',           c:['#605868','#302830','#180818','#504858','#887898'], colorCat:4,
        zhEffect:'強力辟邪擋煞，吸收負面能量，保護氣場', enEffect:'Powerful evil warding, absorbs negative energy, protects aura' },
      { zh:'黑碧璽共生',   en:'Black Tourmaline Symbiosis', imgSrc:'水晶單顆/黑水晶.png',           c:['#504858','#282030','#100810','#403840','#706878'], colorCat:4,
        zhEffect:'極強防護石，淨化負能量，穩固能量場', enEffect:'Extremely powerful protection stone, purifies negative energy, stabilizes energy field' },
      { zh:'黑龍晶',       en:'Black Dragon Crystal',       imgSrc:'水晶單顆/黑龍晶.png',           c:['#585058','#302830','#181018','#483840','#787078'],
        zhEffect:'辟邪化煞，增強意志力，帶來堅韌與力量', enEffect:'Wards off evil, strengthens willpower, brings tenacity and strength' },
      { zh:'黑金超七',     en:'Black Gold Super Seven',     imgSrc:'水晶單顆/黑金超七.png',         c:['#706050','#483828','#281810','#604830','#988070'],
        zhEffect:'七種礦物合一，全方位防護，提升靈性覺知', enEffect:'Seven minerals in one, comprehensive protection, elevates spiritual awareness' },
      { zh:'金曜石',       en:'Gold Sheen Obsidian',        imgSrc:'水晶單顆/金曜石.png',           c:['#806858','#503820','#280c08','#705848','#a89080'],
        zhEffect:'辟邪招財雙效，反射負能量，增強正氣', enEffect:'Dual effect of warding evil and attracting wealth, reflects negative energy' },
      { zh:'銀曜石',       en:'Silver Sheen Obsidian',      imgSrc:'水晶單顆/銀曜石.png',           c:['#a0a0a8','#787880','#505058','#909098','#c0c0c8'],
        zhEffect:'抵禦負面影響，增強鏡面反射力，保護旅行安全', enEffect:'Resists negative influences, enhances mirror reflection power, protects during travel' },
      { zh:'藍虎眼',       en:"Blue Tiger's Eye",           imgSrc:'水晶單顆/藍虎眼.png',           c:['#3858a8','#203880','#0c2060','#284890','#6888c0'],
        zhEffect:'增強洞察力，冷靜應對危機，防護負面能量', enEffect:'Enhances insight, calmly faces crises, protects against negative energy' },
      { zh:'雪花幽靈',     en:'Snowflake Phantom Quartz',   imgSrc:'水晶單顆/雪花幽靈.png',         c:['#e8e4e0','#c8c4c0','#a09898','#d8d4d0','#f8f4f0'],
        zhEffect:'淨化負面能量，促進心靈寧靜，增強保護力', enEffect:'Purifies negative energy, promotes spiritual tranquility, enhances protection' },
      { zh:'銀髮晶',       en:'Silver Rutilated Quartz',    imgSrc:'水晶單顆/銀髮晶.png',           c:['#d0d0d0','#a8a8a8','#787878','#c0c0c0','#e8e8e8'],
        zhEffect:'辟邪化煞，增強能量防護罩，淨化磁場', enEffect:'Wards off evil, enhances energy shield, purifies magnetic field' },
    ]
  },
  {
    icon: '🔮', zhName: '智慧與靈性', enName: 'Wisdom & Spirituality',
    crystals: [
      { zh:'巴西紫水晶',   en:'Brazilian Amethyst',         imgSrc:'水晶單顆/巴西紫水晶.png',       c:['#d8a0f0','#a860d0','#7830a8','#c080e0','#f0c8ff'],
        zhEffect:'開發智慧，增強直覺力，提升靈性修行', enEffect:'Develops wisdom, enhances intuition, elevates spiritual practice' },
      { zh:'烏拉圭紫水晶', en:'Uruguayan Amethyst',         imgSrc:'水晶單顆/烏拉圭紫水晶.png',     c:['#8838b8','#6018a0','#380878','#7828a8','#b868d8'],
        zhEffect:'頂級紫水晶，極強靈性能量，深度冥想之石', enEffect:'Premium amethyst, extremely strong spiritual energy, deep meditation stone' },
      { zh:'玻利維亞紫水晶', en:'Bolivian Amethyst',         imgSrc:'水晶單顆/玻利維亞紫水晶.png',   c:['#c888e0','#9858c0','#6830a0','#b070d0','#e0b0f0'],
        zhEffect:'稀有紫水晶，增強靈性覺知，連結高維能量', enEffect:'Rare amethyst, enhances spiritual awareness, connects to higher-dimensional energy' },
      { zh:'超七',         en:'Super Seven',                imgSrc:'水晶單顆/超七.png',             c:['#c090d0','#9060a8','#603880','#a878c0','#d8b8e0'],
        zhEffect:'七種礦物合一，全方位能量提升，開啟靈性天賦', enEffect:'Seven minerals in one, comprehensive energy boost, unlocks spiritual gifts' },
      { zh:'極光23',       en:'Aurora 23 (Auralite)',       imgSrc:'水晶單顆/極光23.png',           c:['#c898c8','#9868a8','#684080','#b080b8','#e0c0e0'],
        zhEffect:'23種礦物共生，極強靈性振動，促進意識覺醒', enEffect:'23 minerals coexisting, extremely strong spiritual vibration, promotes consciousness awakening' },
      { zh:'紫黃晶',       en:'Ametrine',                   imgSrc:'水晶單顆/紫黃晶.png',           c:['#e0c080','#c8a050','#a07828','#d8b060','#f0d8a0'],
        zhEffect:'智慧與財富兼具，平衡左右腦，增強創造力', enEffect:'Combines wisdom and wealth, balances left and right brain, enhances creativity' },
      { zh:'綠幽靈',       en:'Green Phantom Quartz',       imgSrc:'水晶單顆/綠幽靈.png',           c:['#a8e8b8','#70c880','#40a050','#90d8a0','#d0f0d8'],
        zhEffect:'事業之石，助冥想觀想，提升靈性覺知', enEffect:'Career stone, aids meditation and visualization, elevates spiritual awareness' },
      { zh:'綠髮晶',       en:'Green Rutilated Quartz',     imgSrc:'水晶單顆/綠髮晶.png',           c:['#a0d8a0','#78b878','#509850','#90c890','#c8e8c8'],
        zhEffect:'增強正財運，提升直覺力，促進身心靈平衡', enEffect:'Enhances wealth luck, boosts intuition, promotes mind-body-spirit balance' },
      { zh:'綠龍晶',       en:'Seraphinite',                imgSrc:'水晶單顆/綠龍晶.png',           c:['#80c890','#58a068','#389048','#70b880','#a0e0b0'],
        zhEffect:'天使之石，深層療癒心輪，連結高靈指引', enEffect:'Angel stone, deeply heals heart chakra, connects to higher spiritual guidance' },
      { zh:'四季幽靈',     en:'Four Seasons Phantom Quartz',imgSrc:'水晶單顆/四季幽靈.png',         c:['#c0a880','#a08858','#806838','#b09870','#d8c8a8'],
        zhEffect:'四季能量循環，全方位提升運勢，增強冥想', enEffect:'Four seasons energy cycle, comprehensively boosts fortune, enhances meditation' },
      { zh:'聚寶盆綠幽靈', en:'Treasure Basin Green Phantom',imgSrc:'水晶單顆/聚寶盆綠幽靈.png',    c:['#90d0a0','#60b070','#389848','#78c088','#b8e0c0'],
        zhEffect:'聚財聚靈，增強冥想深度，連結大地能量', enEffect:'Gathers wealth and spirit, deepens meditation, connects to earth energy' },
      { zh:'孔雀石',       en:'Malachite',                  imgSrc:'水晶單顆/孔雀石.png',           c:['#38c878','#18a050','#087838','#28b868','#80e0a0'],
        zhEffect:'心靈之石，增強洞察力，促進靈性成長與轉化', enEffect:'Stone of the mind, enhances insight, promotes spiritual growth and transformation' },
    ]
  }
];

// ─── Accessories ─────────────────────────────────────────
const ACCESSORIES = [
  { zh:'合金配飾', en:'Alloy Accessory', imgSrc:'配飾/配飾3.png', customMm: 5, lengthMm: 8, c:['#f0f8ff','#c8e0f8','#90b8e8','#e0f0ff','#ffffff'] },
];

// ─── Preload all crystal images at startup ───────────────
CATEGORIES.forEach(cat => {
  cat.crystals.forEach(crystal => {
    if (crystal.imgSrc) preloadCrystalImage(crystal.imgSrc);
  });
});
ACCESSORIES.forEach(acc => {
  if (acc.imgSrc) preloadCrystalImage(acc.imgSrc);
});

// ─── State ───────────────────────────────────────────────
let wristCm      = 16;
let globalBeadMm = 8;
let beads        = [];   // [{ crystalKey, customMm, type }]  type: 'crystal'|'accessory'
let beadPositions= [];   // [{x,y,r}]  cached per draw
let totalSlots   = 0;    // total slots for current wrist+bead config
const TIGHT_FIT  = 0.86; // Snug fit factor to make beads look strung together

let dragIndex      = null;
let hoverBeadIndex = null;
let contextBeadIndex = null;

// Helper to get placement radius (distance from center).
// Crystals rest on the inner wrist circle.
// Accessories are elevated to align their centerlines with adjacent crystals.
function getBeadRplacement(i) {
  const innerR = getInnerCircleRadiusPx();
  const S = getPixelsPerMm();
  const isAccessory = beads[i].crystalKey.startsWith('acc-');
  
  if (!isAccessory) {
    const mm = beads[i].customMm ?? globalBeadMm;
    return innerR + (mm / 2) * S;
  }
  
  let leftR = null, rightR = null;
  for (let j = i - 1; j >= 0; j--) {
    if (!beads[j].crystalKey.startsWith('acc-')) {
      const mm = beads[j].customMm ?? globalBeadMm;
      leftR = innerR + (mm / 2) * S;
      break;
    }
  }
  for (let j = i + 1; j < beads.length; j++) {
    if (!beads[j].crystalKey.startsWith('acc-')) {
      const mm = beads[j].customMm ?? globalBeadMm;
      rightR = innerR + (mm / 2) * S;
      break;
    }
  }
  
  if (leftR !== null && rightR !== null) return (leftR + rightR) / 2;
  if (leftR !== null) return leftR;
  if (rightR !== null) return rightR;
  return innerR + (globalBeadMm / 2) * S;
}

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
  // Beads sit on a circle whose circumference ≈ wrist circumference.
  // We want beads nearly touching, so count = circumference / bead_diameter.
  // Use floor to ensure they fit; the slight leftover is absorbed as tiny gaps.
  return Math.max(1, Math.floor((circumCm * 10) / beadMm));
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
    const Rplacement = getBeadRplacement(i);
    filledAngles.push({ angle, Rplacement, r });

    if (i < beads.length - 1) {
      // Compute step toward next bead — tightened so beads nearly touch
      const mmNext = beads[i + 1].customMm ?? globalBeadMm;
      const rNext  = (mmNext / 2) * S;
      const Rnext  = getBeadRplacement(i + 1);
      const Rmid   = (Rplacement + Rnext) / 2;  // average radius
      const dAngle = (r + rNext) / Rmid * TIGHT_FIT;
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
      a,
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

// ─── Draw: Crystal Bead (image-based with gradient fallback) ─
function drawCrystalBead(x, y, r, colors, isHover, isDragging, imgSrc, angle = 0, isAccessory = false, accLengthMm = null) {
  const cachedImg = imgSrc ? crystalImageCache[imgSrc] : null;
  const useImage = cachedImg && cachedImg.complete && cachedImg.naturalWidth > 0;

  if (useImage) {
    ctx.save();

    if (isAccessory) {
      // Accessories don't use circular clip and are rotated to face the center.
      // Add 90 degrees (Math.PI / 2) so the short edge centerline points to the center.
      ctx.translate(x, y);
      ctx.rotate(angle + Math.PI / 2);
      
      const drawW = r * 2; // customMm * scale (the short edge)
      let drawH = drawW;
      if (accLengthMm) {
        // Enforce the exact physical length (long edge)
        const S = getPixelsPerMm();
        drawH = accLengthMm * S;
      } else {
        // Fallback to image aspect ratio if no length is specified
        const imgW = cachedImg.naturalWidth;
        const imgH = cachedImg.naturalHeight;
        drawH = drawW * (imgH / imgW);
      }
      
      ctx.drawImage(cachedImg, -drawW / 2, -drawH / 2, drawW, drawH);
    } else {
      // Drop shadow behind the bead
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.shadowColor = 'rgba(0,0,0,0.50)';
      ctx.shadowBlur = r * 0.7;
      ctx.shadowOffsetX = r * 0.12;
      ctx.shadowOffsetY = r * 0.18;
      ctx.fillStyle = 'rgba(0,0,0,0)';
      ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;

      // Clip to circle
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.clip();

      // Draw image — crystal PNGs have ~8% transparent padding around the bead.
      // Scale up by 1.15x so the visible crystal fills the clip circle snugly.
      const imgScale = 1.15;
      const drawSize = r * 2 * imgScale;
      const offset = r * imgScale;
      ctx.drawImage(cachedImg, x - offset, y - offset, drawSize, drawSize);

      // Subtle rim highlight for depth
      const rimGrad = ctx.createRadialGradient(x, y, r * 0.85, x, y, r);
      rimGrad.addColorStop(0, 'rgba(255,255,255,0)');
      rimGrad.addColorStop(0.7, 'rgba(255,255,255,0)');
      rimGrad.addColorStop(1, 'rgba(255,255,255,0.10)');
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = rimGrad;
      ctx.fill();
    }

    ctx.restore();
  } else {
    // ── Fallback: gradient bead (for accessories or failed images) ──
    const [cLight, cMid, cDark, cSpec, cRim] = colors;

    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.clip();

    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = cDark;
    ctx.fill();

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

    ctx.restore();

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
  }

  // Hover ring (works for both image and fallback)
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
      const RP = getBeadRplacement(0);
      consumedArc = 2 * r / RP;   // one bead: diameter arc
    } else if (beads.length > 1) {
      let arcAcc = 0;
      for (let i = 0; i < beads.length - 1; i++) {
        const mm  = beads[i].customMm ?? globalBeadMm;
        const r   = (mm / 2) * S;
        const RP  = getBeadRplacement(i);
        const mmN = beads[i + 1].customMm ?? globalBeadMm;
        const rN  = (mmN / 2) * S;
        const RPN = getBeadRplacement(i + 1);
        arcAcc += (r + rN) / ((RP + RPN) / 2) * TIGHT_FIT;
      }
      // Add half-arc for first and last bead ends
      const rFirst = ((beads[0].customMm ?? globalBeadMm) / 2) * S;
      const RFirst  = getBeadRplacement(0);
      const rLast  = ((beads[beads.length-1].customMm ?? globalBeadMm) / 2) * S;
      const RLast   = getBeadRplacement(beads.length - 1);
      consumedArc = arcAcc + rFirst / RFirst + rLast / RLast;
    }

    const leftoverArc = Math.max(0, 2 * Math.PI - consumedArc);
    const arcPerEmpty = (2 * defaultR) / defaultRP * TIGHT_FIT;  // tightened arc per empty bead
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
    const isAccessory = beads[i].crystalKey.startsWith('acc-');
    const crystal = getCrystalByKey(beads[i].crystalKey);
    drawCrystalBead(p.x, p.y, p.r, crystal.c, hoverBeadIndex === i, dragIndex === i, crystal.imgSrc, p.a, isAccessory, crystal.lengthMm);
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
    const RP = getBeadRplacement(0);
    consumedArc = 2 * r / RP;
  } else if (beads.length > 1) {
    let arcAcc = 0;
    for (let i = 0; i < beads.length - 1; i++) {
      const r  = ((beads[i].customMm ?? globalBeadMm) / 2) * S;
      const RP = getBeadRplacement(i);
      const rN = ((beads[i+1].customMm ?? globalBeadMm) / 2) * S;
      const RN = getBeadRplacement(i + 1);
      arcAcc  += (r + rN) / ((RP + RN) / 2) * TIGHT_FIT;
    }
    const rF  = ((beads[0].customMm ?? globalBeadMm) / 2) * S;
    const rL  = ((beads[beads.length-1].customMm ?? globalBeadMm) / 2) * S;
    consumedArc = arcAcc + rF / getBeadRplacement(0) + rL / getBeadRplacement(beads.length - 1);
  }

  const leftover = Math.max(0, 2 * Math.PI - consumedArc);
  const arcPerDefault = (2 * defaultR) / defaultRP * TIGHT_FIT;
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

// Helper: build a single crystal item element
function buildCrystalItem(crystal, key) {
  const item = document.createElement('div');
  item.className = 'crystal-item';
  item.id = `crystal-${key}`;

  if (crystal.imgSrc) {
    const imgWrap = document.createElement('div');
    imgWrap.className = 'crystal-img-wrap';
    const img = document.createElement('img');
    img.src = crystal.imgSrc;
    img.alt = currentLang === 'zh' ? crystal.zh : crystal.en;
    img.className = 'crystal-img-preview';
    img.loading = 'lazy';
    img.onerror = function() {
      this.parentElement.replaceWith(makeSVGBead(crystal.c, 28));
    };
    imgWrap.appendChild(img);
    item.appendChild(imgWrap);
  } else {
    item.appendChild(makeSVGBead(crystal.c, 28));
  }

  const textWrap = document.createElement('div');
  textWrap.className = 'crystal-text-wrap';

  const nameSpan = document.createElement('span');
  nameSpan.className = 'crystal-name';
  nameSpan.textContent = currentLang === 'zh' ? crystal.zh : crystal.en;
  textWrap.appendChild(nameSpan);

  if (crystal.zhEffect) {
    const effectSpan = document.createElement('span');
    effectSpan.className = 'crystal-effect';
    effectSpan.textContent = currentLang === 'zh' ? crystal.zhEffect : crystal.enEffect;
    textWrap.appendChild(effectSpan);
  }

  item.appendChild(textWrap);
  item.addEventListener('click', () => addCrystal(key));
  return item;
}

function buildSidePanel() {
  const panel = document.getElementById('sidePanel');
  // Preserve open states (use generic prefix so both modes work)
  const maxCats = Math.max(CATEGORIES.length, COLOR_CATEGORIES.length);
  const opens = Array.from({length: maxCats}, (_, ci) =>
    document.getElementById(`cat-body-${ci}`)?.classList.contains('open') ?? false
  );
  panel.innerHTML = '';

  // ── Browse mode toggle ──
  const modeToggle = document.createElement('div');
  modeToggle.id = 'browseToggle';
  modeToggle.setAttribute('role', 'group');
  modeToggle.setAttribute('aria-label', 'Browse mode');
  modeToggle.innerHTML = `
    <button class="browse-btn${browseMode==='effect'?' active':''}" id="btnEffect" onclick="setBrowseMode('effect')">${t('browseEffect')}</button>
    <button class="browse-btn${browseMode==='color'?' active':''}" id="btnColor" onclick="setBrowseMode('color')">${t('browseColor')}</button>`;
  panel.appendChild(modeToggle);

  // ── Section title: 水晶 ──
  const crystalTitle = document.createElement('div');
  crystalTitle.className = 'section-title';
  crystalTitle.textContent = t('sectionCrystal');
  panel.appendChild(crystalTitle);

  if (browseMode === 'effect') {
    // ── Effect-based categories ──
    const names = I18N[currentLang].catNames;
    CATEGORIES.forEach((cat, ci) => {
      const block = document.createElement('div');
      block.className = 'category-block';

      const header = document.createElement('div');
      header.className = 'cat-header' + (opens[ci] ? ' open' : '');
      header.id = `cat-header-${ci}`;
      header.innerHTML = `
        <span class="cat-icon">${cat.icon}</span>
        <span class="cat-name">${names[ci]}</span>
        <span class="cat-count">${cat.crystals.length}</span>
        <span class="cat-chevron">▼</span>`;

      const body = document.createElement('div');
      body.className = 'cat-body' + (opens[ci] ? ' open' : '');
      body.id = `cat-body-${ci}`;

      const list = document.createElement('div');
      list.className = 'crystal-list';

      cat.crystals.forEach((crystal, ki) => {
        list.appendChild(buildCrystalItem(crystal, `${ci}-${ki}`));
      });

      body.appendChild(list);
      block.appendChild(header);
      block.appendChild(body);
      panel.appendChild(block);

      header.addEventListener('click', () => toggleCategory(ci));
    });
  } else {
    // ── Color-based categories ──
    const colorNames = I18N[currentLang].colorCatNames;
    COLOR_CATEGORIES.forEach((cc, ci) => {
      const crystals = colorCatCrystals[ci] || [];
      const block = document.createElement('div');
      block.className = 'category-block';

      const header = document.createElement('div');
      header.className = 'cat-header' + (opens[ci] ? ' open' : '');
      header.id = `cat-header-${ci}`;
      header.innerHTML = `
        <span class="cat-icon">${cc.icon}</span>
        <span class="cat-name">${colorNames[ci]}</span>
        <span class="cat-count">${crystals.length}</span>
        <span class="cat-chevron">▼</span>`;

      const body = document.createElement('div');
      body.className = 'cat-body' + (opens[ci] ? ' open' : '');
      body.id = `cat-body-${ci}`;

      const list = document.createElement('div');
      list.className = 'crystal-list';

      crystals.forEach(({ ci: catIdx, ki, crystal }) => {
        list.appendChild(buildCrystalItem(crystal, `${catIdx}-${ki}`));
      });

      body.appendChild(list);
      block.appendChild(header);
      block.appendChild(body);
      panel.appendChild(block);

      header.addEventListener('click', () => toggleCategory(ci));
    });
  }

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

    if (acc.imgSrc) {
      const imgWrap = document.createElement('div');
      imgWrap.className = 'crystal-img-wrap';
      const img = document.createElement('img');
      img.src = acc.imgSrc;
      img.alt = currentLang === 'zh' ? acc.zh : acc.en;
      img.className = 'crystal-img-preview';
      img.loading = 'lazy';
      img.onerror = function() {
        this.parentElement.replaceWith(makeSVGBead(acc.c, 28));
      };
      imgWrap.appendChild(img);
      item.appendChild(imgWrap);
    } else {
      item.appendChild(makeSVGBead(acc.c, 28));
    }

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
  // Close all others first — count based on current browse mode
  const count = browseMode === 'effect' ? CATEGORIES.length : COLOR_CATEGORIES.length;
  for (let i = 0; i < count; i++) {
    if (i !== ci) {
      const h = document.getElementById(`cat-header-${i}`);
      const b = document.getElementById(`cat-body-${i}`);
      if (h) h.classList.remove('open');
      if (b) b.classList.remove('open');
    }
  }
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
  const crystalInfo = getCrystalByKey(key);
  beads.push({ crystalKey: key, customMm: crystalInfo.customMm || null });
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

// ─── Touch Events (Mobile / Tablet) ──────────────────────
let touchLongPressTimer = null;
let touchStartBeadIdx = -1;
let touchDidDrag = false;

function canvasTouch(e) {
  const touch = e.touches[0] || e.changedTouches[0];
  const rect = canvas.getBoundingClientRect();
  const scaleX = CANVAS_SIZE / rect.width;
  const scaleY = CANVAS_SIZE / rect.height;
  return {
    x: (touch.clientX - rect.left) * scaleX,
    y: (touch.clientY - rect.top)  * scaleY,
    clientX: touch.clientX,
    clientY: touch.clientY
  };
}

canvas.addEventListener('touchstart', e => {
  const { x, y, clientX, clientY } = canvasTouch(e);
  const idx = getBeadAt(x, y);
  touchDidDrag = false;
  clearTimeout(touchLongPressTimer);

  if (idx >= 0) {
    // Finger is on a bead — start drag & long-press detection
    e.preventDefault();  // prevent scroll ONLY when touching a bead
    dragIndex = idx;
    touchStartBeadIdx = idx;
    hoverBeadIndex = idx;
    drawScene();

    // Long-press: show context menu after 500ms if finger hasn't moved
    touchLongPressTimer = setTimeout(() => {
      if (!touchDidDrag && dragIndex !== null) {
        dragIndex = null;
        hoverBeadIndex = null;
        drawScene();
        showContextMenu(clientX, clientY, touchStartBeadIdx);
      }
    }, 500);
  } else {
    hideContextMenu();
  }
}, { passive: false });

canvas.addEventListener('touchmove', e => {
  if (dragIndex === null) return;
  e.preventDefault();  // prevent scroll while dragging
  touchDidDrag = true;
  clearTimeout(touchLongPressTimer);  // cancel long-press if finger moved

  const { x, y } = canvasTouch(e);
  const newIdx = getBeadAt(x, y);
  if (newIdx >= 0 && newIdx !== dragIndex) {
    [beads[dragIndex], beads[newIdx]] = [beads[newIdx], beads[dragIndex]];
    dragIndex = newIdx;
    hoverBeadIndex = newIdx;
    drawScene();
  }
}, { passive: false });

canvas.addEventListener('touchend', e => {
  clearTimeout(touchLongPressTimer);
  if (dragIndex !== null) {
    dragIndex = null;
    hoverBeadIndex = null;
    drawScene();
  }
  touchStartBeadIdx = -1;
  touchDidDrag = false;
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
    const RP = getBeadRplacement(i);
    const rN = ((beads[i+1].customMm ?? globalBeadMm) / 2) * S;
    const RN = getBeadRplacement(i + 1);
    arcAcc += (r + rN) / ((RP + RN) / 2) * TIGHT_FIT;
  }
  const rF = ((beads[0].customMm ?? globalBeadMm) / 2) * S;
  const rL = ((beads[beads.length-1].customMm ?? globalBeadMm) / 2) * S;
  const consumedArc = arcAcc + rF / getBeadRplacement(0) + rL / getBeadRplacement(beads.length - 1);
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
buildColorCatCrystals();
applyI18n();
buildSidePanel();
updateWristDisplay();
drawScene();
