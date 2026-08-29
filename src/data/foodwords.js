// foodwords.js — cross-language query expansion. Maps common Spanish, Korean, and Chinese food
// words to the English tokens that appear in agency notices. Curated, not machine-generated;
// a miss just means the word searches literally (and the barcode path needs no language at all).
const MAP = {
  // Spanish
  espinaca: 'spinach', espinacas: 'spinach', lechuga: 'lettuce', pepino: 'cucumber', pepinos: 'cucumber',
  tomate: 'tomato', cebolla: 'onion', leche: 'milk', queso: 'cheese', huevo: 'egg', huevos: 'egg',
  pollo: 'chicken', res: 'beef', carne: 'beef', cerdo: 'pork', pavo: 'turkey', pescado: 'fish',
  salmon: 'salmon', 'salmón': 'salmon', atun: 'tuna', 'atún': 'tuna', camaron: 'shrimp', 'camarón': 'shrimp', camarones: 'shrimp',
  cacahuate: 'peanut', cacahuates: 'peanut', mani: 'peanut', 'maní': 'peanut', nuez: 'walnut', nueces: 'walnut', almendra: 'almond', almendras: 'almond',
  trigo: 'wheat', harina: 'flour', pan: 'bread', arroz: 'rice', fideos: 'noodle', helado: 'ice cream',
  yogur: 'yogurt', mantequilla: 'butter', champinon: 'mushroom', 'champiñón': 'mushroom', hongos: 'mushroom',
  fresa: 'strawberry', fresas: 'strawberry', arandano: 'blueberry', 'arándano': 'blueberry', melon: 'melon', 'melón': 'melon',
  manzana: 'apple', durazno: 'peach', mango: 'mango', aguacate: 'avocado', zanahoria: 'carrot',
  pimiento: 'pepper', ensalada: 'salad', salchicha: 'sausage', jamon: 'ham', 'jamón': 'ham',
  cereal: 'cereal', jugo: 'juice', galleta: 'cookie', galletas: 'cookie', chocolate: 'chocolate',
  'fórmula': 'formula', formula: 'formula', mariscos: 'shellfish', ostras: 'oyster', frijoles: 'bean',
  // Korean
  '시금치': 'spinach', '상추': 'lettuce', '오이': 'cucumber', '토마토': 'tomato', '양파': 'onion',
  '우유': 'milk', '치즈': 'cheese', '계란': 'egg', '달걀': 'egg', '닭고기': 'chicken', '치킨': 'chicken',
  '소고기': 'beef', '쇠고기': 'beef', '돼지고기': 'pork', '칠면조': 'turkey', '생선': 'fish',
  '연어': 'salmon', '참치': 'tuna', '새우': 'shrimp', '땅콩': 'peanut', '호두': 'walnut', '아몬드': 'almond',
  '밀': 'wheat', '밀가루': 'flour', '빵': 'bread', '쌀': 'rice', '국수': 'noodle', '라면': 'noodle',
  '아이스크림': 'ice cream', '요거트': 'yogurt', '요구르트': 'yogurt', '버터': 'butter', '버섯': 'mushroom', '팽이버섯': 'enoki',
  '딸기': 'strawberry', '블루베리': 'blueberry', '멜론': 'melon', '사과': 'apple', '복숭아': 'peach',
  '망고': 'mango', '아보카도': 'avocado', '당근': 'carrot', '고추': 'pepper', '샐러드': 'salad',
  '소시지': 'sausage', '햄': 'ham', '시리얼': 'cereal', '주스': 'juice', '쿠키': 'cookie', '과자': 'cookie',
  '초콜릿': 'chocolate', '분유': 'formula', '조개': 'shellfish', '굴': 'oyster', '두부': 'tofu', '콩': 'soy',
  '김': 'seaweed', '멸치': 'anchovy',
  // Chinese (Simplified; a few Traditional variants)
  '菠菜': 'spinach', '生菜': 'lettuce', '黄瓜': 'cucumber', '青瓜': 'cucumber', '西红柿': 'tomato', '番茄': 'tomato',
  '洋葱': 'onion', '牛奶': 'milk', '奶': 'milk', '奶酪': 'cheese', '芝士': 'cheese', '鸡蛋': 'egg', '蛋': 'egg',
  '鸡肉': 'chicken', '鸡': 'chicken', '牛肉': 'beef', '猪肉': 'pork', '火鸡': 'turkey', '鱼': 'fish',
  '三文鱼': 'salmon', '金枪鱼': 'tuna', '吞拿鱼': 'tuna', '虾': 'shrimp', '花生': 'peanut', '核桃': 'walnut', '杏仁': 'almond',
  '小麦': 'wheat', '面粉': 'flour', '面包': 'bread', '麵包': 'bread', '米': 'rice', '大米': 'rice', '面条': 'noodle', '麵': 'noodle',
  '冰淇淋': 'ice cream', '雪糕': 'ice cream', '酸奶': 'yogurt', '黄油': 'butter', '蘑菇': 'mushroom', '金针菇': 'enoki',
  '草莓': 'strawberry', '蓝莓': 'blueberry', '哈密瓜': 'cantaloupe', '甜瓜': 'melon', '苹果': 'apple', '桃': 'peach',
  '芒果': 'mango', '牛油果': 'avocado', '鳄梨': 'avocado', '胡萝卜': 'carrot', '辣椒': 'pepper', '沙拉': 'salad',
  '香肠': 'sausage', '火腿': 'ham', '麦片': 'cereal', '果汁': 'juice', '饼干': 'cookie', '巧克力': 'chocolate',
  '奶粉': 'formula', '贝类': 'shellfish', '牡蛎': 'oyster', '生蚝': 'oyster', '豆腐': 'tofu', '大豆': 'soy', '豆': 'soy',
  '紫菜': 'seaweed', '海苔': 'seaweed',
  // Vietnamese (with and without diacritics)
  'rau bina': 'spinach', 'cải bó xôi': 'spinach', 'cai bo xoi': 'spinach', 'rau chân vịt': 'spinach',
  'dưa chuột': 'cucumber', 'dua chuot': 'cucumber', 'dưa leo': 'cucumber', 'dua leo': 'cucumber',
  'cà chua': 'tomato', 'ca chua': 'tomato', 'hành': 'onion', 'hanh': 'onion',
  'sữa': 'milk', 'sua': 'milk', 'phô mai': 'cheese', 'pho mai': 'cheese', 'phomai': 'cheese',
  'trứng': 'egg', 'trung': 'egg', 'gà': 'chicken', 'thịt gà': 'chicken', 'thit ga': 'chicken',
  'bò': 'beef', 'thịt bò': 'beef', 'thit bo': 'beef', 'heo': 'pork', 'thịt heo': 'pork', 'thit heo': 'pork', 'lợn': 'pork',
  'cá': 'fish', 'cá hồi': 'salmon', 'ca hoi': 'salmon', 'cá ngừ': 'tuna', 'ca ngu': 'tuna', 'tôm': 'shrimp', 'tom': 'shrimp',
  'đậu phộng': 'peanut', 'dau phong': 'peanut', 'lạc': 'peanut', 'hạnh nhân': 'almond', 'hanh nhan': 'almond',
  'lúa mì': 'wheat', 'lua mi': 'wheat', 'bột mì': 'flour', 'bot mi': 'flour', 'bánh mì': 'bread', 'banh mi': 'bread',
  'gạo': 'rice', 'gao': 'rice', 'cơm': 'rice', 'mì': 'noodle', 'bún': 'noodle', 'phở': 'noodle', 'kem': 'ice cream',
  'bơ': 'butter', 'nấm': 'mushroom', 'nam': 'mushroom', 'nấm kim châm': 'enoki', 'dâu tây': 'strawberry', 'dau tay': 'strawberry',
  'dưa lưới': 'cantaloupe', 'dua luoi': 'cantaloupe', 'táo': 'apple', 'tao': 'apple', 'xoài': 'mango', 'xoai': 'mango',
  'bơ trái': 'avocado', 'cà rốt': 'carrot', 'ca rot': 'carrot', 'ớt': 'pepper', 'xúc xích': 'sausage', 'xuc xich': 'sausage',
  'giăm bông': 'ham', 'nước ép': 'juice', 'nuoc ep': 'juice', 'bánh quy': 'cookie', 'banh quy': 'cookie',
  'sô cô la': 'chocolate', 'so co la': 'chocolate', 'sữa bột': 'formula', 'sua bot': 'formula',
  'hàu': 'oyster', 'hau': 'oyster', 'đậu hũ': 'tofu', 'dau hu': 'tofu', 'đậu nành': 'soy', 'dau nanh': 'soy', 'rong biển': 'seaweed', 'rong bien': 'seaweed',
  // Tagalog
  'letsugas': 'lettuce', 'pipino': 'cucumber', 'kamatis': 'tomato', 'sibuyas': 'onion',
  'gatas': 'milk', 'keso': 'cheese', 'itlog': 'egg', 'manok': 'chicken', 'baka': 'beef', 'baboy': 'pork',
  'isda': 'fish', 'hipon': 'shrimp', 'trigo': 'wheat', 'harina': 'flour', 'tinapay': 'bread',
  'bigas': 'rice', 'kanin': 'rice', 'pansit': 'noodle', 'sorbetes': 'ice cream', 'mantikilya': 'butter',
  'kabute': 'mushroom', 'mansanas': 'apple', 'mangga': 'mango', 'karot': 'carrot', 'sili': 'pepper',
  'longganisa': 'sausage', 'hamon': 'ham', 'biskwit': 'cookie', 'tsokolate': 'chocolate',
  'talaba': 'oyster', 'tokwa': 'tofu', 'toyo': 'soy', 'mais': 'corn', 'saging': 'banana',
  // Haitian Creole
  'epina': 'spinach', 'zepina': 'spinach', 'konkonm': 'cucumber', 'tomat': 'tomato', 'zonyon': 'onion',
  'lèt': 'milk', 'let': 'milk', 'fwomaj': 'cheese', 'ze': 'egg', 'poul': 'chicken', 'poulè': 'chicken',
  'vyann': 'beef', 'bèf': 'beef', 'kochon': 'pork', 'pwason': 'fish', 'somon': 'salmon', 'ton': 'tuna',
  'kribich': 'shrimp', 'pistach': 'peanut', 'ble': 'wheat', 'farin': 'flour', 'pen': 'bread',
  'diri': 'rice', 'makawoni': 'noodle', 'krèm': 'ice cream', 'bè': 'butter', 'djondjon': 'mushroom',
  'frèz': 'strawberry', 'melon dlo': 'watermelon', 'pòm': 'apple', 'mango': 'mango', 'zaboka': 'avocado',
  'kawòt': 'carrot', 'piman': 'pepper', 'sosis': 'sausage', 'janbon': 'ham', 'bonbon': 'cookie',
  'chokola': 'chocolate', 'zwit': 'oyster', 'pwa': 'bean', 'mayi': 'corn', 'fig': 'banana',
};

/** Expand query tokens: foreign food words add their English equivalent; originals are kept.
 *  origin maps each added English token back to the word the person actually typed, so match
 *  language can echo their word ("pepino"), not our expansion ("cucumber"). */
export function expandTokens(tokens) {
  const out = [];
  const origin = {};
  for (const tok of tokens) {
    out.push(tok);
    const hit = MAP[tok] || MAP[tok.normalize('NFC')];
    if (hit) for (const w of hit.split(' ')) { out.push(w); if (!origin[w]) origin[w] = tok; }
  }
  return { tokens: [...new Set(out)], origin };
}

/** Tokenizer that also handles CJK: contiguous Han/Hangul runs become tokens, and for Chinese we
 *  additionally try every 2–3 character substring against the map so 有机菠菜 still finds 菠菜. */
export function tokenizeMultilingual(q) {
  const s = String(q || '').toLowerCase();
  // Unicode-aware: Vietnamese diacritics, Haitian è/ò, etc. all tokenize. CJK handled separately below.
  const latin = (s.match(/[\p{L}\p{N}&'’-]{2,}/gu) || []).filter((t) => !/[\u4e00-\u9fff\uac00-\ud7af]/.test(t));
  // Multi-word phrases ("dưa leo", "rau bina"): probe consecutive word pairs against the map.
  for (let i = 0; i < latin.length - 1; i++) {
    const pair = `${latin[i]} ${latin[i + 1]}`;
    if (MAP[pair]) latin.push(pair);
  }
  const cjk = s.match(/[\u4e00-\u9fff\uac00-\ud7af]+/g) || [];
  const subs = [];
  for (const run of cjk) {
    subs.push(run);
    if (/[\u4e00-\u9fff]/.test(run)) {
      for (let len = 2; len <= 3; len++) for (let i = 0; i + len <= run.length; i++) {
        const sub = run.slice(i, i + len);
        if (MAP[sub]) subs.push(sub);
      }
    }
  }
  return expandTokens([...latin, ...subs]);
}
