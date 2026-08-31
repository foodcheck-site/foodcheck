// i18n.js — UI strings in English, Spanish, Korean, Simplified Chinese.
// t(lang) returns a lookup: every key falls back to English, so untranslated surfaces render
// in English rather than blank. Agency notice text is NOT translated here — it renders as
// published, marked lang="en" (or lang="es" for USDA's official Spanish) so browser translation
// and screen readers handle it correctly.
// Safety-critical blocks (at-risk medical copy) live in build/hazard-guidance.json per language,
// each with its own checks[] — a translation is "unverified" until a person who reads that
// language signs it.

export const LANGS = [
  { code: 'en', label: 'English', tag: 'en-US' },
  { code: 'es', label: 'Español', tag: 'es-US' },
  { code: 'ko', label: '한국어', tag: 'ko-KR' },
  { code: 'zh', label: '中文', tag: 'zh-CN' },
  { code: 'vi', label: 'Tiếng Việt', tag: 'vi-VN' },
  { code: 'tl', label: 'Tagalog', tag: 'fil-PH' },
  { code: 'ht', label: 'Kreyòl Ayisyen', tag: 'ht-HT' },
];

const STR = {
  // header / stamp
  tagline: { en: 'Is anything in my kitchen recalled?', es: '¿Hay algo retirado del mercado en mi cocina?', ko: '우리 집 주방에 리콜된 식품이 있나요?', zh: '我厨房里有被召回的食品吗？' },
  outbreaks: { en: 'Outbreaks', es: 'Brotes', ko: '집단감염', zh: '疫情调查' },
  narrowDown: { en: 'Narrow it down', es: 'Afinar la búsqueda', ko: '조건 좁히기', zh: '缩小范围' },
  aboutData: { en: 'About the data', es: 'Sobre los datos', ko: '데이터 정보', zh: '关于数据' },
  checked: { en: 'Checked', es: 'Consultado', ko: '확인 시각', zh: '查询于' },
  allSourcesOk: { en: 'all sources ok', es: 'todas las fuentes funcionan', ko: '모든 출처 정상', zh: '所有来源正常' },
  sourcesFailing: { en: (n) => `${n} source${n === 1 ? '' : 's'} failing`, es: (n) => `${n} fuente${n === 1 ? '' : 's'} con fallos`, ko: (n) => `출처 ${n}개 오류`, zh: (n) => `${n} 个来源异常` },
  blindSpotLeft: { en: (d) => `FDA data through ${d}`, es: (d) => `Datos de la FDA hasta ${d}`, ko: (d) => `FDA 데이터: ${d}까지`, zh: (d) => `FDA 数据截至 ${d}` },
  blindSpotRight: { en: 'Recalls started in the last 3 weeks may not appear yet', es: 'Los retiros iniciados en las últimas 3 semanas pueden no aparecer todavía', ko: '최근 3주 내 시작된 리콜은 아직 표시되지 않을 수 있습니다', zh: '最近 3 周内启动的召回可能尚未显示' },
  loading: { en: 'Loading…', es: 'Cargando…', ko: '불러오는 중…', zh: '加载中…' },

  // home
  activeNow: { en: 'Active now', es: 'Activos ahora', ko: '현재 진행 중', zh: '当前有效' },
  sortedForYou: { en: 'Sorted for you', es: 'Ordenado para usted', ko: '맞춤 정렬됨', zh: '已为您排序' },
  stillChecking: { en: 'still checking…', es: 'todavía consultando…', ko: '계속 확인 중…', zh: '仍在查询…' },
  olderOpenNote: { en: (n, m) => `${n} open recall${n === 1 ? '' : 's'} older than ${m} months ${n === 1 ? 'isn’t' : 'aren’t'} listed here — search by product or barcode to check ${n === 1 ? 'it' : 'them'}.`, es: (n, m) => `${n} retiro${n === 1 ? '' : 's'} abiertos con más de ${m} meses no se muestran aquí; búsquelos por producto o código de barras.`, ko: (n, m) => `${m}개월이 지난 미종결 리콜 ${n}건은 여기 표시되지 않습니다. 제품명 또는 바코드로 검색해 확인하세요.`, zh: (n, m) => `${n} 项超过 ${m} 个月的未结召回未在此列出——请按产品或条形码搜索查看。` },
  matchedCount: { en: (n) => `${n} recall${n === 1 ? '' : 's'} may involve what you entered. Everything else is still below.`, es: (n) => `${n} retiro${n === 1 ? '' : 's'} podrían corresponder a lo que escribió. Todo lo demás sigue abajo.`, ko: (n) => `입력하신 내용과 관련될 수 있는 리콜 ${n}건. 나머지는 아래에 있습니다.`, zh: (n) => `${n} 项召回可能与您输入的内容有关。其余仍在下方。` },
  nothingMatched: { en: 'Nothing matched what you entered. That’s not a guarantee — recalls can take up to three weeks to appear here, and product names in notices are often incomplete.', es: 'Nada coincidió con lo que escribió. Eso no es una garantía: los retiros pueden tardar hasta tres semanas en aparecer aquí, y los nombres de producto en los avisos suelen estar incompletos.', ko: '입력하신 내용과 일치하는 항목이 없습니다. 그러나 이것이 안전 보장은 아닙니다. 리콜은 여기 표시되기까지 최대 3주가 걸릴 수 있고, 공지의 제품명은 불완전한 경우가 많습니다.', zh: '没有与您输入的内容匹配的项目。这并不代表安全——召回最多可能需要三周才会显示在这里，而且通告中的产品名称往往不完整。' },
  noActive: { en: 'No active recalls in the data we could reach.', es: 'No hay retiros activos en los datos disponibles.', ko: '접근 가능한 데이터에 진행 중인 리콜이 없습니다.', zh: '在可获取的数据中没有当前有效的召回。' },
  noActiveSub: { en: 'Check the stamp above — if a source failed, this list is missing it. Recalls also take up to three weeks to appear.', es: 'Revise el sello de arriba: si una fuente falló, falta en esta lista. Los retiros también tardan hasta tres semanas en aparecer.', ko: '위의 상태 표시를 확인하세요. 출처에 오류가 있으면 이 목록에서 누락됩니다. 리콜은 표시까지 최대 3주가 걸릴 수 있습니다.', zh: '请查看上方的状态——若某个来源失败，此列表会缺少它。召回也可能需要长达三周才会显示。' },
  minorFold: { en: (n) => `Labeling and minor notices (${n})`, es: (n) => `Avisos de etiquetado y menores (${n})`, ko: (n) => `표시사항·경미한 공지 (${n})`, zh: (n) => `标签及轻微通告（${n}）` },
  notMatchingFold: { en: (n) => `Not matching what you entered (${n})`, es: (n) => `No coinciden con lo que escribió (${n})`, ko: (n) => `입력 내용과 일치하지 않음 (${n})`, zh: (n) => `与您输入的内容不匹配（${n}）` },
  notMatchingWhy: { en: ' — shown so nothing is silently hidden', es: ' — se muestran para que nada quede oculto en silencio', ko: ' — 아무것도 몰래 숨기지 않기 위해 표시합니다', zh: ' —— 列出以确保不会悄悄隐藏任何内容' },
  seeEverything: { en: 'See everything active on one page →', es: 'Ver todo lo activo en una página →', ko: '진행 중인 항목 전체 보기 →', zh: '在一页查看全部有效召回 →' },
  bottomNote: { en: 'An empty list is not an all-clear. Recalls can take up to 3 weeks to reach the public data, and this site only sees what FDA and USDA publish. Trust your body first — if you feel sick, get medical help; don’t wait on this list.', es: 'Una lista vacía no significa que todo esté bien. Los retiros pueden tardar hasta 3 semanas en llegar a los datos públicos, y este sitio solo ve lo que publican la FDA y el USDA. Confíe primero en su cuerpo: si se siente mal, busque atención médica; no espere por esta lista.', ko: '목록이 비어 있다고 안전하다는 뜻은 아닙니다. 리콜이 공개 데이터에 반영되기까지 최대 3주가 걸릴 수 있고, 이 사이트는 FDA와 USDA가 공개한 것만 볼 수 있습니다. 몸의 신호를 먼저 믿으세요. 아프다면 이 목록을 기다리지 말고 진료를 받으세요.', zh: '列表为空并不代表安全。召回信息最多可能需要 3 周才会进入公开数据，本网站也只能看到 FDA 和 USDA 公布的内容。请先相信自己的身体——如果感到不适，请就医，不要等待此列表。' },
  closedMatchHead: { en: 'Older and closed recalls that match', es: 'Retiros antiguos y cerrados que coinciden', ko: '일치하는 과거·종결 리콜', zh: '匹配的较早及已结召回' },
  closedMatchSub: { en: (m) => `“Open” ones were announced more than ${m} months ago and the agency hasn’t closed them. “Closed” ones are finished. Either way, product already sold may still be in a pantry or freezer.`, es: (m) => `Los “abiertos” se anunciaron hace más de ${m} meses y la agencia no los ha cerrado. Los “cerrados” ya terminaron. En ambos casos, el producto vendido puede seguir en una despensa o congelador.`, ko: (m) => `‘미종결’은 ${m}개월 이전에 발표되었으나 기관이 종결하지 않은 것이고, ‘종결’은 마무리된 것입니다. 어느 쪽이든 이미 판매된 제품이 아직 찬장이나 냉동고에 있을 수 있습니다.`, zh: (m) => `“未结”指 ${m} 个月前发布且机构尚未结案；“已结”指已完成。无论哪种，已售出的产品仍可能存放在食品柜或冰箱中。` },
  checkingOlder: { en: 'Checking older recalls…', es: 'Consultando retiros anteriores…', ko: '과거 리콜 확인 중…', zh: '正在查询较早的召回…' },
  noneOlder: { en: 'None found in the last 18 months. Older recalls aren’t in this data.', es: 'No se encontró ninguno en los últimos 18 meses. Los más antiguos no están en estos datos.', ko: '최근 18개월 내에는 없습니다. 그보다 오래된 리콜은 이 데이터에 없습니다.', zh: '最近 18 个月内未找到。更早的召回不在此数据中。' },

  // narrow strip
  narrowSub: { en: 'Optional. Matches come to the top; everything else collapses below with a count — nothing is ever removed.', es: 'Opcional. Las coincidencias suben al principio; lo demás se pliega abajo con un contador. Nada se elimina.', ko: '선택 사항입니다. 일치 항목이 위로 올라오고 나머지는 개수와 함께 아래로 접힙니다. 삭제되는 것은 없습니다.', zh: '可选。匹配项排到最前，其余折叠在下方并显示数量——绝不会删除任何内容。' },
  whereAreYou: { en: 'Where are you?', es: '¿Dónde está usted?', ko: '어느 주에 계신가요?', zh: '您在哪个州？' },
  skipState: { en: 'Not sure / skip', es: 'No sé / omitir', ko: '모름 / 건너뛰기', zh: '不确定 / 跳过' },
  stateHint: { en: 'Recalls that don’t list where they were sold stay in the list.', es: 'Los retiros que no indican dónde se vendieron permanecen en la lista.', ko: '판매 지역이 명시되지 않은 리콜은 목록에 그대로 남습니다.', zh: '未注明销售地点的召回会保留在列表中。' },
  whatsInKitchen: { en: 'What’s in your kitchen?', es: '¿Qué hay en su cocina?', ko: '주방에 무엇이 있나요?', zh: '您厨房里有什么？' },
  kitchenPlaceholder: { en: 'e.g. baby spinach, cottage cheese', es: 'p. ej. espinaca, queso fresco', ko: '예: 시금치, 코티지 치즈', zh: '例如：菠菜、白软干酪' },
  kitchenHint: { en: 'A brand, a food, or a word from the label — in your language is fine.', es: 'Una marca, un alimento o una palabra de la etiqueta; puede escribir en español.', ko: '브랜드, 식품명, 라벨의 단어 — 한국어로 입력해도 됩니다.', zh: '品牌、食品或标签上的词——用中文输入也可以。' },
  barcodeLabel: { en: 'Barcode number from the package', es: 'Número de código de barras del envase', ko: '포장의 바코드 번호', zh: '包装上的条形码数字' },
  barcodePlaceholder: { en: '12 to 14 digits', es: '12 a 14 dígitos', ko: '12~14자리', zh: '12 到 14 位数字' },
  barcodeHint: { en: 'The digits under the bars — the same in every language.', es: 'Los dígitos bajo las barras: iguales en todos los idiomas.', ko: '바코드 아래 숫자 — 어떤 언어에서든 동일합니다.', zh: '条码下方的数字——任何语言都相同。' },
  keepTyping: { en: 'Keep typing — barcodes are 12 to 14 digits', es: 'Siga escribiendo: los códigos tienen de 12 a 14 dígitos', ko: '계속 입력하세요 — 바코드는 12~14자리입니다', zh: '请继续输入——条形码为 12 到 14 位' },
  partialUpc: { en: 'Partial number: shows recalls from the same company until you finish typing', es: 'Número parcial: muestra retiros de la misma empresa hasta que termine de escribir', ko: '일부 번호: 전체 입력 전까지 같은 회사의 리콜을 표시합니다', zh: '部分号码：在输入完成前显示同一公司的召回' },
  tooLongUpc: { en: 'That’s more than 14 digits — check the number under the barcode', es: 'Son más de 14 dígitos; revise el número bajo el código', ko: '14자리를 초과합니다. 바코드 아래 번호를 확인하세요', zh: '超过 14 位——请核对条码下方的数字' },

  narrowOneLine: { en: 'state, product, or barcode', es: 'estado, producto o código de barras', ko: '주, 제품, 바코드', zh: '州、产品或条形码' },
  scan: { en: 'Scan', es: 'Escanear', ko: '스캔', zh: '扫码' },
  details: { en: 'Details', es: 'Detalles', ko: '자세히', zh: '详情', vi: 'Chi tiết', tl: 'Mga detalye', ht: 'Detay' },
  noVoice: { en: (l) => `No ${l} voice on this device — a phone usually has one.`, es: (l) => `Este dispositivo no tiene voz en ${l}; un teléfono suele tenerla.`, ko: (l) => `이 기기에 ${l} 음성이 없습니다. 휴대폰에는 보통 있습니다.`, zh: (l) => `此设备没有${l}语音——手机通常有。`, vi: (l) => `Thiết bị này không có giọng ${l} — điện thoại thường có.`, tl: (l) => `Walang ${l} na boses sa device na ito — kadalasang mayroon ang telepono.`, ht: (l) => `Aparèy sa a pa gen vwa ${l} — yon telefòn anjeneral genyen l.` },
  listen: { en: 'Listen', es: 'Escuchar', ko: '듣기', zh: '朗读', vi: 'Nghe', tl: 'Pakinggan', ht: 'Koute' },
  stopListening: { en: 'Stop', es: 'Detener', ko: '정지', zh: '停止', vi: 'Dừng', tl: 'Ihinto', ht: 'Sispann' },
  scanTitle: { en: 'Scan the barcode', es: 'Escanee el código de barras', ko: '바코드를 스캔하세요', zh: '扫描条形码' },
  scanHint: { en: 'Point the camera at the barcode. Nothing is uploaded — reading happens on your device.', es: 'Apunte la cámara al código de barras. No se sube nada: la lectura ocurre en su dispositivo.', ko: '카메라를 바코드에 맞추세요. 아무것도 업로드되지 않으며 판독은 기기에서 이루어집니다.', zh: '将相机对准条形码。不会上传任何内容——识别在您的设备上完成。' },
  scanClose: { en: 'Close', es: 'Cerrar', ko: '닫기', zh: '关闭' },
  scanFound: { en: (d) => `Barcode read: ${d}`, es: (d) => `Código leído: ${d}`, ko: (d) => `바코드 인식: ${d}`, zh: (d) => `已读取条码：${d}` },
  scanUnsupported: { en: 'The camera scanner couldn’t start in this browser. Type the digits under the bars instead — that works everywhere.', es: 'El escáner de cámara no pudo iniciarse en este navegador. Escriba los dígitos bajo las barras: eso funciona en todos lados.', ko: '이 브라우저에서 카메라 스캐너를 시작할 수 없습니다. 바코드 아래 숫자를 직접 입력하세요. 그 방법은 어디서나 됩니다.', zh: '此浏览器无法启动相机扫描。请直接输入条码下方的数字——该方法在任何设备上都可用。' },
  scanLoading: { en: 'Loading the scanner…', es: 'Cargando el escáner…', ko: '스캐너를 불러오는 중…', zh: '正在加载扫描器…' },
  feedback: { en: 'Suggestions? Email us', es: '¿Sugerencias? Escríbanos', ko: '제안이 있으신가요? 이메일 보내기', zh: '有建议？给我们发邮件' },
  feedbackSubject: { en: 'FoodCheck feedback', es: 'Comentarios sobre FoodCheck', ko: 'FoodCheck 의견', zh: 'FoodCheck 反馈' },
  scanDenied: { en: 'Camera permission was denied. Type the digits under the bars instead.', es: 'Se denegó el permiso de cámara. Escriba los dígitos bajo las barras.', ko: '카메라 권한이 거부되었습니다. 바코드 아래 숫자를 입력하세요.', zh: '相机权限被拒绝。请输入条码下方的数字。' },
  scanLotNote: { en: 'Lot codes are printed text, not barcodes — the camera can’t read them reliably yet, so compare those by eye.', es: 'Los números de lote son texto impreso, no códigos de barras; la cámara aún no los lee con fiabilidad. Compárelos a simple vista.', ko: '로트 번호는 바코드가 아니라 인쇄된 글자입니다. 카메라로는 아직 안정적으로 읽을 수 없으니 눈으로 비교하세요.', zh: '批号是印刷文字而非条形码——目前相机无法可靠识别，请人工核对。' },

  back: { en: '← Back', es: '← Atrás', ko: '← 뒤로', zh: '← 返回' },
  and: { en: ' and ', es: ' y ', ko: '·', zh: '和' },
  // About
  abIntro: { en: 'This site reads public recall notices from FDA and USDA and groups the ones that describe the same problem. It doesn’t know about recalls those agencies haven’t published yet, and FDA can take up to three weeks to classify a recall after a company starts it. An empty list means nothing was found in the data we could reach — not that your food is safe.', es: 'Este sitio lee los avisos públicos de retiro de la FDA y el USDA y agrupa los que describen el mismo problema. No conoce los retiros que esas agencias aún no han publicado, y la FDA puede tardar hasta tres semanas en clasificar un retiro después de que la empresa lo inicia. Una lista vacía significa que no se encontró nada en los datos disponibles, no que su comida sea segura.', ko: '이 사이트는 FDA와 USDA의 공개 리콜 공지를 읽어 같은 문제를 설명하는 것끼리 묶습니다. 기관이 아직 공개하지 않은 리콜은 알 수 없으며, FDA는 회사가 리콜을 시작한 뒤 분류·게시까지 최대 3주가 걸릴 수 있습니다. 목록이 비어 있다는 것은 접근 가능한 데이터에서 찾지 못했다는 뜻이지 음식이 안전하다는 뜻이 아닙니다.', zh: '本网站读取 FDA 和 USDA 的公开召回通告，并将描述同一问题的通告归为一组。它无法得知这些机构尚未发布的召回，而且公司启动召回后，FDA 可能需要长达三周才能完成分级并发布。列表为空只表示在可获取的数据中未找到内容，并不代表您的食品是安全的。' },
  abBlindHead: { en: 'The blind spot, in plain words', es: 'El punto ciego, en palabras sencillas', ko: '사각지대, 쉬운 말로', zh: '盲区，用大白话说' },
  abBlindBody: { en: 'A company can start a recall today and FDA can take up to three weeks to classify and publish it in the database this site reads. The hatched end of the bar under the header covers that window. Press releases (the faster feed) close part of the gap, but not all of it, and not for every recall. USDA notices arrive much faster, usually the same day.', es: 'Una empresa puede iniciar un retiro hoy y la FDA puede tardar hasta tres semanas en clasificarlo y publicarlo en la base de datos que este sitio lee. El extremo rayado de la barra bajo el encabezado cubre ese periodo. Los comunicados de prensa (el canal más rápido) cierran parte de la brecha, pero no toda ni para todos los retiros. Los avisos del USDA llegan mucho más rápido, normalmente el mismo día.', ko: '회사가 오늘 리콜을 시작해도 FDA가 이를 분류해 이 사이트가 읽는 데이터베이스에 게시하기까지 최대 3주가 걸릴 수 있습니다. 헤더 아래 막대의 빗금 부분이 그 기간입니다. 보도자료(더 빠른 피드)가 그 공백을 일부 메우지만 전부는 아니며 모든 리콜에 해당하지도 않습니다. USDA 공지는 보통 당일에 훨씬 빨리 올라옵니다.', zh: '公司今天启动召回，FDA 可能需要长达三周才能完成分级并发布到本网站读取的数据库中。页眉下方进度条的斜线部分就是这段时间。新闻稿（更快的渠道）能弥补一部分空档，但不是全部，也不是每次召回都有。USDA 的通告要快得多，通常当天发布。' },
  abWordsHead: { en: 'What the words mean', es: 'Qué significan las palabras', ko: '용어 설명', zh: '词语含义' },
  abW_closedT: { en: 'Closed / terminated', es: 'Cerrado / terminado', ko: '종결/종료', zh: '已结/已终止' },
  abW_closed: { en: 'the agency finished its follow-up. Not a statement that leftover product is safe.', es: 'la agencia terminó su seguimiento. No significa que el producto que quede sea seguro.', ko: '기관이 후속 조치를 마쳤다는 뜻입니다. 남아 있는 제품이 안전하다는 뜻이 아닙니다.', zh: '机构完成了后续处理。这并不代表剩余的产品是安全的。' },
  abSourcesHead: { en: 'Sources right now', es: 'Fuentes en este momento', ko: '현재 출처 상태', zh: '当前数据来源' },
  ab_failed: { en: (m) => `failed: ${m}`, es: (m) => `falló: ${m}`, ko: (m) => `실패: ${m}`, zh: (m) => `失败：${m}` },
  ab_liveFailedSnap: { en: (m) => `live check failed (${m}); using snapshot`, es: (m) => `falló la consulta en vivo (${m}); usando la copia guardada`, ko: (m) => `실시간 확인 실패(${m}), 스냅샷 사용 중`, zh: (m) => `实时查询失败（${m}）；使用快照` },
  ab_optional: { en: 'optional — not set up. Only used to fill in missing company names; USDA notices almost always include them already.', es: 'opcional — no configurado. Solo sirve para completar nombres de empresa faltantes; los avisos del USDA casi siempre ya los incluyen.', ko: '선택 사항 — 미설정. 누락된 업체명을 보완하는 용도일 뿐이며, USDA 공지에는 거의 항상 업체명이 이미 포함되어 있습니다.', zh: '可选——未配置。仅用于补全缺失的公司名称；USDA 通告几乎总是已包含。' },
  ab_noData: { en: 'no data', es: 'sin datos', ko: '데이터 없음', zh: '无数据' },
  ab_archiveNote: { en: (n) => `Older and closed recalls from the last 18 months (${n}) load only when you search by product or barcode.`, es: (n) => `Los retiros antiguos y cerrados de los últimos 18 meses (${n}) se cargan solo cuando busca por producto o código de barras.`, ko: (n) => `최근 18개월의 과거·종결 리콜(${n}건)은 제품이나 바코드로 검색할 때만 불러옵니다.`, zh: (n) => `最近 18 个月的较早及已结召回（${n} 项）仅在按产品或条形码搜索时加载。` },
  ab_sample: { en: 'Sample data. This snapshot was built from fictional test records, not real recalls.', es: 'Datos de ejemplo. Esta copia se generó con registros de prueba ficticios, no con retiros reales.', ko: '샘플 데이터입니다. 이 스냅샷은 실제 리콜이 아닌 가상의 테스트 기록으로 만들어졌습니다.', zh: '示例数据。此快照由虚构的测试记录生成，并非真实召回。' },
  ab_review: { en: 'The grouping review queue at #/review is a maintainer page and stays in English by design.', es: 'La cola de revisión en #/review es una página para mantenimiento y se queda en inglés a propósito.', ko: '#/review의 그룹화 검토 대기열은 관리용 페이지로, 의도적으로 영어로 유지됩니다.', zh: '#/review 的分组审核队列是维护者页面，特意保留英文。' },
  src_rss: { en: 'FDA press releases', es: 'Comunicados de la FDA', ko: 'FDA 보도자료', zh: 'FDA 新闻稿' },
  src_mpi: { en: 'USDA establishment list', es: 'Lista de establecimientos del USDA', ko: 'USDA 시설 목록', zh: 'USDA 企业名录' },
  src_snap: { en: 'Saved snapshot', es: 'Copia guardada', ko: '저장된 스냅샷', zh: '已存快照' },
  src_live: { en: 'FDA live check', es: 'Consulta en vivo a la FDA', ko: 'FDA 실시간 확인', zh: 'FDA 实时查询' },
  // All active
  aaHead: { en: 'Everything active', es: 'Todo lo activo', ko: '진행 중인 전체 목록', zh: '全部有效召回' },
  aaSub: { en: (n, m) => `All ${n} open recalls from the last ${m} months, nothing folded away.`, es: (n, m) => `Los ${n} retiros abiertos de los últimos ${m} meses, sin nada plegado.`, ko: (n, m) => `최근 ${m}개월의 미종결 리콜 ${n}건 전체, 접힌 항목 없음.`, zh: (n, m) => `最近 ${m} 个月的全部 ${n} 项未结召回，无任何折叠。` },
  aaFilters: { en: 'Your filters from the home page still order this list; they never remove anything.', es: 'Sus filtros de la página principal siguen ordenando esta lista; nunca eliminan nada.', ko: '홈 화면의 필터가 이 목록의 순서에도 적용되며, 아무것도 제거하지 않습니다.', zh: '首页的筛选条件仍会影响此列表的排序，但绝不会删除任何内容。' },
  aaSortSerious: { en: 'Most serious first', es: 'Más graves primero', ko: '심각한 순', zh: '最严重优先' },
  aaSortNewest: { en: 'Newest first', es: 'Más recientes primero', ko: '최신순', zh: '最新优先' },
  aaSort: { en: 'Sort order', es: 'Orden', ko: '정렬', zh: '排序' },
  // Incident extras
  incSample: { en: 'Sample — this is a fictional test record, not a real recall.', es: 'Ejemplo: este es un registro de prueba ficticio, no un retiro real.', ko: '샘플 — 실제 리콜이 아닌 가상의 테스트 기록입니다.', zh: '示例——这是虚构的测试记录，并非真实召回。' },
  groupLikely: { en: 'These notices are grouped because they share the same hazard and ingredient within three weeks. They may not all come from one source.', es: 'Estos avisos se agrupan porque comparten el mismo peligro e ingrediente en un periodo de tres semanas. Puede que no provengan todos de una misma fuente.', ko: '이 공지들은 3주 이내에 같은 위해요소와 원료를 공유하기 때문에 묶였습니다. 모두 같은 출처에서 나온 것이 아닐 수 있습니다.', zh: '这些通告被归为一组，因为它们在三周内涉及相同的危害和原料。它们未必都来自同一来源。' },
  groupPossible: { en: 'These notices are grouped because they share a hazard with an active outbreak investigation. This is our best guess, not the agency’s.', es: 'Estos avisos se agrupan porque comparten un peligro con una investigación de brote activa. Es nuestra mejor estimación, no de la agencia.', ko: '이 공지들은 진행 중인 집단감염 조사와 위해요소를 공유하기 때문에 묶였습니다. 이는 기관이 아닌 저희의 추정입니다.', zh: '这些通告被归为一组，因为它们与一项进行中的疫情调查涉及相同危害。这是我们的推断，而非机构的结论。' },
  illnessLinkNote: { en: 'Linked by matching germ and food. The agency hasn’t necessarily tied this recall to that outbreak.', es: 'Vinculado por coincidencia de germen y alimento. La agencia no necesariamente relacionó este retiro con ese brote.', ko: '병원체와 식품 대조로 연결한 것입니다. 기관이 이 리콜을 해당 집단감염과 공식 연결한 것은 아닙니다.', zh: '通过匹配病原体和食品建立关联。机构未必已将此召回与该疫情正式关联。' },
  allInvestigations: { en: 'All investigations', es: 'Todas las investigaciones', ko: '전체 조사 보기', zh: '全部调查' },
  sameCompany: { en: '— same company, different hazard', es: '— misma empresa, peligro distinto', ko: '— 같은 회사, 다른 위해요소', zh: '——同一公司，不同危害' },
  bannerClosed: { en: (ag, d) => `This recall was closed by ${ag}${d ? ` on ${d}` : ''}.`, es: (ag, d) => `${ag} cerró este retiro${d ? ` el ${d}` : ''}.`, ko: (ag, d) => `${ag}가 이 리콜을 종결했습니다${d ? ` (${d})` : ''}.`, zh: (ag, d) => `${ag} 已结束此召回${d ? `（${d}）` : ''}。` },
  bannerClosedTail: { en: ' Closed means the agency finished its follow-up, not that the product is safe to eat if you still have it.', es: ' Cerrado significa que la agencia terminó su seguimiento, no que el producto sea seguro si todavía lo tiene.', ko: ' 종결은 기관이 후속 조치를 마쳤다는 뜻이며, 아직 갖고 계신 제품이 안전하다는 뜻이 아닙니다.', zh: ' “已结”指机构完成了后续处理，并不代表您仍持有的产品可以安全食用。' },
  bannerOlder: { en: (d, ag, m) => `Announced ${d}. ${ag} hasn’t closed this recall, but it’s more than ${m} months old.`, es: (d, ag, m) => `Anunciado el ${d}. ${ag} no ha cerrado este retiro, pero tiene más de ${m} meses.`, ko: (d, ag, m) => `${d} 발표. ${ag}가 아직 종결하지 않았지만 ${m}개월이 넘었습니다.`, zh: (d, ag, m) => `发布于 ${d}。${ag} 尚未结束此召回，但已超过 ${m} 个月。` },
  bannerOlderTail: { en: ' Product is unlikely to still be on shelves. If you have it, the advice below still applies.', es: ' Es poco probable que el producto siga a la venta. Si lo tiene, los consejos de abajo siguen aplicando.', ko: ' 매장에 남아 있을 가능성은 낮습니다. 갖고 계시다면 아래 지침이 그대로 적용됩니다.', zh: ' 产品不太可能仍在货架上。如果您仍持有，下方建议仍然适用。' },
  bannerSampleAll: { en: 'Sample data — everything shown is fictional test records, not real recalls.', es: 'Datos de ejemplo: todo lo que se muestra son registros de prueba ficticios, no retiros reales.', ko: '샘플 데이터 — 표시된 모든 항목은 실제 리콜이 아닌 가상의 테스트 기록입니다.', zh: '示例数据——所有显示内容均为虚构测试记录，并非真实召回。' },
  bannerMixed: { en: 'Mixed: cards marked “Sample” are fictional test records. Unmarked cards are real recalls fetched live.', es: 'Mixto: las tarjetas marcadas “Ejemplo” son registros ficticios. Las demás son retiros reales obtenidos en vivo.', ko: '혼합: ‘샘플’ 표시가 있는 카드는 가상의 테스트 기록이고, 표시가 없는 카드는 실시간으로 가져온 실제 리콜입니다.', zh: '混合：标有“示例”的卡片为虚构测试记录，未标记的卡片为实时获取的真实召回。' },
  // CDC vs FDA comparison
  cmpHead: { en: 'CDC counts vs FDA’s table', es: 'Conteos de los CDC frente a la tabla de la FDA', ko: 'CDC 집계 vs FDA 표', zh: 'CDC 统计与 FDA 表格对比' },
  cmpIntro: { en: 'CDC counts active multistate illness investigations per germ; FDA’s table lists the investigations FDA works on. CDC’s number can be higher because it includes investigations led by other agencies (for example, USDA-regulated foods).', es: 'Los CDC cuentan las investigaciones multiestatales activas por germen; la tabla de la FDA lista las que la FDA trabaja. El número de los CDC puede ser mayor porque incluye investigaciones dirigidas por otras agencias (por ejemplo, alimentos regulados por el USDA).', ko: 'CDC는 병원체별 진행 중인 다주(州) 질병 조사를 집계하고, FDA 표는 FDA가 담당하는 조사를 나열합니다. CDC 숫자는 다른 기관이 주도하는 조사(예: USDA 관할 식품)까지 포함해 더 클 수 있습니다.', zh: 'CDC 按病原体统计进行中的多州疾病调查；FDA 表格列出的是 FDA 负责的调查。CDC 的数字可能更高，因为它包括其他机构主导的调查（例如 USDA 监管的食品）。' },
  cmpRow: { en: (cdc, fda) => `CDC counts ${cdc} · ${fda} in FDA’s table`, es: (cdc, fda) => `CDC cuenta ${cdc} · ${fda} en la tabla de la FDA`, ko: (cdc, fda) => `CDC 집계 ${cdc} · FDA 표 ${fda}`, zh: (cdc, fda) => `CDC 统计 ${cdc} 项 · FDA 表格 ${fda} 项` },
  cmpAsOf: { en: (d) => `CDC counts as of ${d}.`, es: (d) => `Conteos de los CDC al ${d}.`, ko: (d) => `CDC 집계 기준일: ${d}.`, zh: (d) => `CDC 统计截至 ${d}。` },
  cmpLink: { en: 'CDC’s outbreak list', es: 'Lista de brotes de los CDC (en inglés)', ko: 'CDC 집단감염 목록 (영어)', zh: 'CDC 疫情列表（英文）' },

  lotLabel: { en: 'Lot code from the package', es: 'Número de lote del envase', ko: '포장의 로트 번호', zh: '包装上的批号' },
  lotPlaceholder: { en: 'e.g. LOT 24187 A', es: 'p. ej. LOT 24187 A', ko: '예: LOT 24187 A', zh: '例如：LOT 24187 A' },
  lotHint: { en: 'Printed near the date — letters and numbers, often after “LOT”.', es: 'Impreso cerca de la fecha: letras y números, a menudo después de “LOT”.', ko: '날짜 근처에 인쇄된 문자와 숫자로, 보통 “LOT” 뒤에 있습니다.', zh: '印在日期附近——字母和数字，通常在“LOT”之后。' },
  res_lot: { en: ['Matches a lot code in this notice', 'Lot numbers repeat across companies, so also compare the brand and package before deciding.'], es: ['Coincide con un número de lote de este aviso', 'Los números de lote se repiten entre empresas; compare también la marca y el envase antes de decidir.'], ko: ['이 공지의 로트 번호와 일치합니다', '로트 번호는 회사마다 중복될 수 있으니 브랜드와 포장도 함께 비교하세요.'], zh: ['与此通告中的批号相符', '批号在不同公司间会重复，请同时核对品牌和包装再做判断。'] },
  mapToggle: { en: '🗺 Or tap your state on a map', es: '🗺 O toque su estado en el mapa', ko: '🗺 지도에서 주를 선택하기', zh: '🗺 或在地图上点选您的州' },
  mapLabel: { en: 'Choose your state on the map', es: 'Elija su estado en el mapa', ko: '지도에서 주를 선택하세요', zh: '在地图上选择您的州' },
  mapHint: { en: 'Squares sit in roughly map position. Tap again to clear.', es: 'Los cuadros siguen aproximadamente la posición del mapa. Toque de nuevo para quitar la selección.', ko: '사각형은 대략적인 지도 위치를 따릅니다. 다시 누르면 선택이 해제됩니다.', zh: '方块按大致地图位置排列。再次点按可取消选择。' },

  backToTop: { en: '↑ Back to search', es: '↑ Volver a la búsqueda', ko: '↑ 검색으로', zh: '↑ 返回搜索' },
  checkOutbreaks: { en: (n) => `Check outbreaks${n ? ` (${n})` : ''}`, es: (n) => `Ver brotes${n ? ` (${n})` : ''}`, ko: (n) => `집단감염 확인${n ? ` (${n})` : ''}`, zh: (n) => `查看疫情${n ? `（${n}）` : ''}` },
  langMenu: { en: 'Language', es: 'Idioma', ko: '언어', zh: '语言' },

  // vi/tl/ht for the new bottom note
  disclaimer: { en: 'FoodCheck is an independent project, not affiliated with FDA, USDA, or CDC. It summarizes their public notices and can contain mistakes — when anything here differs from the official notice, the official notice is right.', es: 'FoodCheck es un proyecto independiente, sin afiliación con la FDA, el USDA ni los CDC. Resume sus avisos públicos y puede contener errores: si algo aquí difiere del aviso oficial, el aviso oficial es el correcto.', ko: 'FoodCheck는 독립 프로젝트로 FDA, USDA, CDC와 무관합니다. 이들 기관의 공개 공지를 요약하며 오류가 있을 수 있습니다. 이 사이트의 내용이 공식 공지와 다르면 공식 공지가 맞습니다.', zh: 'FoodCheck 是独立项目，与 FDA、USDA 或 CDC 均无关联。它汇总这些机构的公开通告，可能存在错误——如果这里的内容与官方通告不一致，以官方通告为准。', vi: 'FoodCheck là dự án độc lập, không liên kết với FDA, USDA hay CDC. Trang tóm tắt các thông báo công khai của họ và có thể có sai sót — nếu nội dung ở đây khác thông báo chính thức, thông báo chính thức mới đúng.', tl: 'Ang FoodCheck ay independiyenteng proyekto, hindi kaanib ng FDA, USDA, o CDC. Nagbubuod ito ng kanilang mga pampublikong abiso at maaaring magkamali — kapag iba ang nandito sa opisyal na abiso, ang opisyal na abiso ang tama.', ht: 'FoodCheck se yon pwojè endepandan, li pa afilye ak FDA, USDA, oswa CDC. Li rezime avi piblik yo epi li ka gen erè — si yon bagay isit la diferan de avi ofisyèl la, se avi ofisyèl la ki bon.' },
  whyHead: { en: 'Why we made this', es: 'Por qué lo hicimos', ko: '만든 이유', zh: '我们为什么做这个网站', vi: 'Vì sao chúng tôi làm trang này', tl: 'Bakit namin ito ginawa', ht: 'Poukisa nou fè sa' },
  whyBody: { en: 'We created FoodCheck for our immigrant parents — and for the millions of families who worry about food safety but struggle with fragmented government information. Since 2025, US food-safety agencies have been cut deeply: foreign inspections are down, surveillance programs scaled back, staff reduced. The official recall data is still there, but it’s harder than ever to find and understand. So we pulled it together in one simple, accessible place, in the languages our families speak, so anyone can quickly check whether the food in their kitchen is safe and see the outbreaks worth knowing about. FoodCheck is here for peace of mind.', es: 'Creamos FoodCheck para nuestros padres inmigrantes, y para los millones de familias que se preocupan por la seguridad de los alimentos pero batallan con información gubernamental fragmentada. Desde 2025, las agencias de seguridad alimentaria de EE. UU. han sufrido recortes profundos: menos inspecciones en el extranjero, programas de vigilancia reducidos, menos personal. Los datos oficiales de retiros siguen ahí, pero es más difícil que nunca encontrarlos y entenderlos. Así que los reunimos en un solo lugar sencillo y accesible, en los idiomas que hablan nuestras familias, para que cualquiera pueda revisar rápidamente si la comida de su cocina es segura y ver los brotes que conviene conocer. FoodCheck existe para dar tranquilidad.', ko: '우리는 이민자 부모님을 위해, 그리고 식품 안전이 걱정되지만 흩어져 있는 정부 정보 앞에서 막막한 수백만 가정을 위해 FoodCheck를 만들었습니다. 2025년 이후 미국의 식품 안전 기관들은 큰 폭으로 축소되었습니다. 해외 검사가 줄고, 감시 프로그램이 축소되고, 인력이 감축되었습니다. 공식 리콜 데이터는 여전히 존재하지만 찾고 이해하기는 그 어느 때보다 어렵습니다. 그래서 우리 가족이 쓰는 언어로, 누구나 주방의 식품이 안전한지 빠르게 확인하고 알아둘 만한 집단감염을 볼 수 있도록 하나의 쉽고 단순한 곳에 모았습니다. FoodCheck는 마음의 평안을 위해 존재합니다.', zh: '我们为自己的移民父母创建了 FoodCheck——也为数百万担心食品安全、却被零散的政府信息难住的家庭。自 2025 年以来，美国食品安全机构被大幅削减：海外检查减少，监测项目收缩，人员裁减。官方召回数据仍然存在，但比以往任何时候都更难找到和理解。于是我们把它汇集到一个简单易用的地方，用我们家人使用的语言，让任何人都能快速查看厨房里的食品是否安全，并了解值得关注的疫情。FoodCheck 的存在，是为了让人安心。', vi: 'Chúng tôi tạo ra FoodCheck cho cha mẹ nhập cư của mình — và cho hàng triệu gia đình lo lắng về an toàn thực phẩm nhưng chật vật với thông tin chính phủ rời rạc. Từ năm 2025, các cơ quan an toàn thực phẩm Mỹ bị cắt giảm sâu: thanh tra nước ngoài giảm, chương trình giám sát thu hẹp, nhân sự bị cắt. Dữ liệu thu hồi chính thức vẫn còn đó, nhưng khó tìm và khó hiểu hơn bao giờ hết. Vì vậy chúng tôi gom tất cả về một nơi đơn giản, dễ tiếp cận, bằng những ngôn ngữ gia đình mình dùng, để ai cũng có thể nhanh chóng kiểm tra thực phẩm trong bếp có an toàn không và biết những đợt dịch cần lưu ý. FoodCheck tồn tại để mang lại sự an tâm.', tl: 'Ginawa namin ang FoodCheck para sa aming mga magulang na imigrante — at para sa milyun-milyong pamilyang nag-aalala sa kaligtasan ng pagkain pero nahihirapan sa watak-watak na impormasyon ng gobyerno. Mula 2025, malalim ang naging pagbawas sa mga ahensya ng food safety sa US: bumaba ang mga inspeksyon sa ibang bansa, nabawasan ang mga programa ng pagsubaybay, at nabawasan ang tauhan. Nariyan pa rin ang opisyal na datos ng recall, pero mas mahirap na itong hanapin at intindihin. Kaya pinagsama-sama namin ito sa isang simple at abot-kayang lugar, sa mga wikang sinasalita ng aming pamilya, para mabilis masuri ninuman kung ligtas ang pagkain sa kanilang kusina at makita ang mga outbreak na dapat malaman. Narito ang FoodCheck para sa kapanatagan ng loob.', ht: 'Nou kreye FoodCheck pou paran imigran nou yo — ak pou milyon fanmi ki enkyete pou sekirite manje men ki bloke devan enfòmasyon gouvènman an ki gaye toupatou. Depi 2025, ajans sekirite manje Ozetazini yo sibi gwo koupe: enspeksyon aletranje bese, pwogram siveyans yo redwi, anplwaye yo koupe. Done ofisyèl sou rapèl yo la toujou, men li pi difisil pase janm pou jwenn yo epi konprann yo. Kidonk nou mete tout ansanm nan yon sèl kote ki senp e aksesib, nan lang fanmi nou pale, pou nenpòt moun ka tcheke vit si manje nan kwizin li an sekirite epi wè epidemi ki merite konnen. FoodCheck la pou bay kè poze.' },
  whySource: { en: 'Source:', es: 'Fuente (en inglés):', ko: '출처 (영어):', zh: '来源（英文）：', vi: 'Nguồn (tiếng Anh):', tl: 'Pinagmulan (Ingles):', ht: 'Sous (an angle):' },
  donate: { en: '☕ Support this project', es: '☕ Apoye este proyecto', ko: '☕ 프로젝트 후원하기', zh: '☕ 支持这个项目', vi: '☕ Ủng hộ dự án này', tl: '☕ Suportahan ang proyektong ito', ht: '☕ Sipòte pwojè sa a' },

  // cards
  whatToDo: { en: 'What to do →', es: 'Qué hacer →', ko: '대처 방법 →', zh: '如何处理 →' },
  notices: { en: (n) => `${n} notice${n === 1 ? '' : 's'}`, es: (n) => `${n} aviso${n === 1 ? '' : 's'}`, ko: (n) => `공지 ${n}건`, zh: (n) => `${n} 份通告` },
  illnesses: { en: (n) => `${n} illnesses reported`, es: (n) => `${n} enfermedades notificadas`, ko: (n) => `질병 신고 ${n}건`, zh: (n) => `已报告 ${n} 例病例` },
  listIncomplete: { en: 'list may be incomplete', es: 'la lista puede estar incompleta', ko: '목록이 불완전할 수 있음', zh: '清单可能不完整' },
  sampleTag: { en: 'Sample', es: 'Ejemplo', ko: '샘플', zh: '示例' },
  closedTag: { en: 'Closed', es: 'Cerrado', ko: '종결', zh: '已结' },
  openTag: { en: (d) => `Open · ${d}`, es: (d) => `Abierto · ${d}`, ko: (d) => `미종결 · ${d}`, zh: (d) => `未结 · ${d}` },

  // scope
  scopeNationwide: { en: 'Sold nationwide', es: 'Vendido en todo el país', ko: '전국 판매', zh: '全国销售' },
  scopeSingle: { en: (st) => `Sold in ${st} only`, es: (st) => `Vendido solo en ${st}`, ko: (st) => `${st}에서만 판매`, zh: (st) => `仅在${st}销售` },
  scopeMulti: { en: (n) => `Sold in ${n} states`, es: (n) => `Vendido en ${n} estados`, ko: (n) => `${n}개 주에서 판매`, zh: (n) => `在 ${n} 个州销售` },
  scopeIntl: { en: 'Sold outside the US; US sales not listed', es: 'Vendido fuera de EE. UU.; ventas en EE. UU. no indicadas', ko: '미국 외 판매, 미국 내 판매 정보 없음', zh: '在美国境外销售；未列明美国境内销售' },
  scopeUnknown: { en: 'Where sold: not listed', es: 'Dónde se vendió: no indicado', ko: '판매 지역: 명시되지 않음', zh: '销售地点：未注明' },

  // severity
  sev_class_1: { en: ['CLASS I', 'Serious harm possible', 'Eating this could cause serious illness or death.'], es: ['CLASE I', 'Posible daño grave', 'Comer esto podría causar enfermedad grave o la muerte.'], ko: ['1등급', '심각한 위해 가능', '섭취 시 중병 또는 사망을 초래할 수 있습니다.'], zh: ['一级', '可能造成严重伤害', '食用可能导致严重疾病或死亡。'] },
  sev_alert: { en: ['PUBLIC HEALTH ALERT', 'Don’t eat it', 'USDA is warning about this product but can’t recall it — usually because it’s no longer being sold or was never inspected. Treat it like a Class I recall.'], es: ['ALERTA DE SALUD PÚBLICA', 'No lo coma', 'El USDA advierte sobre este producto pero no puede retirarlo, normalmente porque ya no se vende o nunca fue inspeccionado. Trátelo como un retiro de Clase I.'], ko: ['공중보건 경보', '섭취 금지', 'USDA가 경고하는 제품이지만 리콜할 수 없는 경우입니다(대개 더 이상 판매되지 않거나 검사를 받지 않았기 때문). 1등급 리콜처럼 취급하세요.'], zh: ['公共健康警报', '请勿食用', 'USDA 对此产品发出警告但无法召回——通常因为已停售或从未受检。请按一级召回对待。'] },
  sev_unclassified: { en: ['ANNOUNCED', 'Not yet classified', 'The company or agency has announced this recall, but FDA hasn’t graded how serious it is yet.'], es: ['ANUNCIADO', 'Aún sin clasificar', 'La empresa o la agencia anunció este retiro, pero la FDA aún no ha calificado su gravedad.'], ko: ['발표됨', '등급 미정', '회사 또는 기관이 리콜을 발표했지만 FDA가 아직 심각도를 평가하지 않았습니다.'], zh: ['已公布', '尚未分级', '公司或机构已宣布此召回，但 FDA 尚未评定其严重程度。'] },
  sev_class_2: { en: ['CLASS II', 'Could cause illness', 'Eating this could make you temporarily sick; serious harm is unlikely.'], es: ['CLASE II', 'Podría causar enfermedad', 'Comer esto podría enfermarle temporalmente; un daño grave es poco probable.'], ko: ['2등급', '질병 유발 가능', '섭취 시 일시적으로 아플 수 있으나 심각한 위해 가능성은 낮습니다.'], zh: ['二级', '可能引起不适', '食用可能导致暂时不适；造成严重伤害的可能性较低。'] },
  sev_class_3: { en: ['CLASS III', 'Labeling or minor', 'Unlikely to harm you; usually a labeling or packaging problem.'], es: ['CLASE III', 'Etiquetado o menor', 'Es poco probable que le haga daño; suele ser un problema de etiquetado o envase.'], ko: ['3등급', '표시사항·경미', '위해 가능성이 낮으며 대개 라벨이나 포장 문제입니다.'], zh: ['三级', '标签或轻微问题', '不太可能造成伤害；通常是标签或包装问题。'] },

  // result language (matchBasis → [headline, line]); functions get ctx
  res_upc: { en: ['This is recalled', 'The barcode you entered matches this notice.'], es: ['Este producto está retirado', 'El código de barras que ingresó coincide con este aviso.'], ko: ['이 제품은 리콜 대상입니다', '입력하신 바코드가 이 공지와 일치합니다.'], zh: ['该产品已被召回', '您输入的条形码与此通告相符。'] },
  res_upc_unverified: { en: ['May be recalled', 'This matches a code in the notice, but the notice’s code may contain a typo. Compare the brand too.'], es: ['Podría estar retirado', 'Coincide con un código del aviso, pero el código del aviso podría tener un error. Compare también la marca.'], ko: ['리콜 대상일 수 있습니다', '공지의 코드와 일치하지만 공지의 코드에 오타가 있을 수 있습니다. 브랜드도 비교하세요.'], zh: ['可能已被召回', '与通告中的一个代码相符，但通告的代码可能有笔误。请同时核对品牌。'] },
  res_state_and_product: { en: [(c) => `Recalled in ${c.stateName} — check for this`, (c) => `The notice lists ${c.stateName}. Compare the code on your package.`], es: [(c) => `Retirado en ${c.stateName}: revise si lo tiene`, (c) => `El aviso menciona ${c.stateName}. Compare el código de su envase.`], ko: [(c) => `${c.stateName}에서 리콜 — 확인하세요`, (c) => `공지에 ${c.stateName}이(가) 명시되어 있습니다. 포장의 코드를 비교하세요.`], zh: [(c) => `在${c.stateName}被召回——请检查`, (c) => `通告中列有${c.stateName}。请核对包装上的代码。`] },
  res_nationwide_and_product: { en: ['Recalled — check for this', 'Sold nationwide. Compare the code on your package.'], es: ['Retirado: revise si lo tiene', 'Vendido en todo el país. Compare el código de su envase.'], ko: ['리콜 — 확인하세요', '전국 판매 제품입니다. 포장의 코드를 비교하세요.'], zh: ['已召回——请检查', '全国销售。请核对包装上的代码。'] },
  res_upc_prefix: { en: ['Same company has a recall', 'The first digits you entered match this company’s barcode range, but not this exact product. Enter the full number, or compare the brand and size.'], es: ['La misma empresa tiene un retiro', 'Los primeros dígitos coinciden con el rango de códigos de esta empresa, pero no con este producto exacto. Ingrese el número completo o compare la marca y el tamaño.'], ko: ['같은 회사에 리콜이 있습니다', '입력하신 앞자리가 이 회사의 바코드 대역과 일치하지만 이 제품과 정확히 일치하지는 않습니다. 전체 번호를 입력하거나 브랜드와 용량을 비교하세요.'], zh: ['同一公司有召回', '您输入的前几位与该公司的条码段相符，但不是这一具体产品。请输入完整号码，或核对品牌和规格。'] },
  res_product_guess: { en: [(c) => `May match — ${c.token}`, (c) => `The notice mentions “${c.token}”. Compare against your package before deciding.`], es: [(c) => `Posible coincidencia: ${c.token}`, (c) => `El aviso menciona “${c.token}”. Compare con su envase antes de decidir.`], ko: [(c) => `일치 가능 — ${c.token}`, (c) => `공지에 “${c.token}”이(가) 언급됩니다. 결정하기 전에 포장과 비교하세요.`], zh: [(c) => `可能匹配——${c.token}`, (c) => `通告中提到“${c.token}”。请先与您的包装核对再做判断。`] },
  res_state_only: { en: [(c) => `Sold in ${c.stateName}`, 'Check whether you have this product.'], es: [(c) => `Vendido en ${c.stateName}`, 'Revise si tiene este producto.'], ko: [(c) => `${c.stateName}에서 판매`, '이 제품이 있는지 확인하세요.'], zh: [(c) => `在${c.stateName}销售`, '请检查您是否有此产品。'] },
  res_distribution_incomplete: { en: ['May affect you', (c) => c.stateCount ? `Sold in ${c.stateCount} states listed; we couldn’t read the full list. Treat as possible.` : 'The notice doesn’t say where this was sold.'], es: ['Podría afectarle', (c) => c.stateCount ? `Se indican ${c.stateCount} estados; no pudimos leer la lista completa. Considérelo posible.` : 'El aviso no dice dónde se vendió.'], ko: ['영향이 있을 수 있습니다', (c) => c.stateCount ? `${c.stateCount}개 주가 명시되어 있으나 전체 목록을 읽을 수 없었습니다. 가능성이 있다고 보세요.` : '공지에 판매 지역이 나와 있지 않습니다.'], zh: ['可能与您有关', (c) => c.stateCount ? `列出了 ${c.stateCount} 个州；我们无法读取完整清单。请视为可能相关。` : '通告未说明销售地点。'] },
  res_other_state: { en: [(c) => `Not listed for ${c.stateName}`, (c) => `The notice lists ${c.listed}. Still shown in case the list is incomplete.`], es: [(c) => `No se menciona ${c.stateName}`, (c) => `El aviso menciona ${c.listed}. Se muestra por si la lista está incompleta.`], ko: [(c) => `${c.stateName}은(는) 명시되지 않음`, (c) => `공지에는 ${c.listed}이(가) 나옵니다. 목록이 불완전할 수 있어 계속 표시합니다.`], zh: [(c) => `未列出${c.stateName}`, (c) => `通告列出：${c.listed}。为防清单不完整仍予显示。`] },

  // disposal
  disp_return_for_refund: { en: 'Take it back to where you bought it for a refund.', es: 'Devuélvalo donde lo compró para un reembolso.', ko: '구매처에 반품하고 환불받으세요.', zh: '退回购买处并获得退款。' },
  disp_discard: { en: 'Throw it away.', es: 'Tírelo a la basura.', ko: '폐기하세요.', zh: '请丢弃。' },
  disp_discard_or_return: { en: 'Throw it away or take it back for a refund.', es: 'Tírelo o devuélvalo para un reembolso.', ko: '폐기하거나 구매처에 반품해 환불받으세요.', zh: '丢弃，或退回购买处退款。' },
  disp_discard_and_sanitize: { en: 'Throw it away, then clean the fridge shelves, containers, and surfaces it touched.', es: 'Tírelo y luego limpie los estantes del refrigerador, los recipientes y las superficies que tocó.', ko: '폐기한 뒤 제품이 닿았던 냉장고 선반, 용기, 표면을 세척하세요.', zh: '丢弃后，请清洁其接触过的冰箱隔板、容器和表面。' },
  disp_return_and_sanitize: { en: 'Take it back for a refund, or throw it away. Then clean the fridge shelves, containers, and surfaces it touched.', es: 'Devuélvalo para un reembolso o tírelo. Después limpie los estantes del refrigerador, los recipientes y las superficies que tocó.', ko: '반품해 환불받거나 폐기하세요. 그 후 제품이 닿았던 냉장고 선반, 용기, 표면을 세척하세요.', zh: '退回退款或丢弃。之后请清洁其接触过的冰箱隔板、容器和表面。' },
  disp_do_not_open: { en: 'Don’t open it. Throw it away in a sealed bag, or take it back unopened.', es: 'No lo abra. Tírelo en una bolsa cerrada o devuélvalo sin abrir.', ko: '개봉하지 마세요. 밀봉한 봉투에 넣어 버리거나 개봉하지 않은 채 반품하세요.', zh: '请勿打开。装入密封袋后丢弃，或原封退回。' },
  disp_see_notice: { en: 'Read the notice for what to do with it.', es: 'Lea el aviso para saber qué hacer con el producto.', ko: '처리 방법은 공지를 확인하세요.', zh: '请阅读通告了解处理方式。' },

  // incident screen
  backToList: { en: '← All active recalls', es: '← Todos los retiros activos', ko: '← 진행 중인 리콜 전체', zh: '← 全部有效召回' },
  share: { en: 'Share', es: 'Compartir', ko: '공유', zh: '分享' },
  linkCopied: { en: 'Link copied', es: 'Enlace copiado', ko: '링크 복사됨', zh: '链接已复制' },
  theFood: { en: 'The food', es: 'El alimento', ko: '해당 식품', zh: '涉及食品' },
  noBarcode: { en: 'This notice doesn’t list a barcode. Compare the brand and package size instead.', es: 'Este aviso no incluye código de barras. Compare la marca y el tamaño del envase.', ko: '이 공지에는 바코드가 없습니다. 대신 브랜드와 포장 용량을 비교하세요.', zh: '此通告未列出条形码。请改为核对品牌和包装规格。' },
  lotOnly: { en: 'No barcode listed. Check for the lot code on the package.', es: 'Sin código de barras. Busque el número de lote en el envase.', ko: '바코드가 없습니다. 포장의 로트 번호를 확인하세요.', zh: '未列出条形码。请核对包装上的批号。' },
  barcodes: { en: 'Barcodes', es: 'Códigos de barras', ko: '바코드', zh: '条形码' },
  lotCodes: { en: 'Lot codes', es: 'Números de lote', ko: '로트 번호', zh: '批号' },
  pkgDates: { en: 'Dates on the package', es: 'Fechas en el envase', ko: '포장의 날짜', zh: '包装上的日期' },
  whereSold: { en: 'Where it was sold', es: 'Dónde se vendió', ko: '판매 지역', zh: '销售地点' },
  distIncomplete: { en: 'We couldn’t read the full distribution list from the notice. Treat other states as possible.', es: 'No pudimos leer la lista completa de distribución del aviso. Considere posibles otros estados.', ko: '공지의 유통 목록 전체를 읽을 수 없었습니다. 다른 주도 가능성이 있다고 보세요.', zh: '我们无法从通告中读取完整的分销清单。其他州也应视为可能。' },
  whatNoticeSays: { en: 'What the notice says', es: 'Lo que dice el aviso', ko: '공지 원문', zh: '通告原文' },
  whatToDoHead: { en: 'What to do', es: 'Qué hacer', ko: '대처 방법', zh: '如何处理' },
  dontEat: { en: 'Don’t eat it.', es: 'No lo coma.', ko: '섭취하지 마세요.', zh: '请勿食用。' },
  fromNotice: { en: (a) => `From the ${a} notice`, es: (a) => `Del aviso de ${a} (en inglés)`, ko: (a) => `${a} 공지에서 발췌 (영어)`, zh: (a) => `摘自 ${a} 通告（英文）` },
  fromNoticeEs: { en: 'From USDA’s official Spanish notice', es: 'Del aviso oficial del USDA en español', ko: 'USDA 공식 스페인어 공지에서 발췌', zh: '摘自 USDA 官方西班牙语通告' },
  fdaDbNoInstr: { en: 'FDA’s database entry doesn’t say whether to return it or throw it away. Either is fine — just don’t eat it.', es: 'La base de datos de la FDA no dice si devolverlo o tirarlo. Cualquiera de las dos está bien; lo importante es no comerlo.', ko: 'FDA 데이터베이스 항목에는 반품할지 폐기할지 나와 있지 않습니다. 어느 쪽이든 괜찮습니다. 섭취만 하지 마세요.', zh: 'FDA 数据库条目未说明应退回还是丢弃。两者皆可——关键是不要食用。' },
  summaryDb: { en: 'Summary — this comes from FDA’s recall database, which lists the product and reason but not consumer instructions.', es: 'Resumen: proviene de la base de datos de retiros de la FDA, que indica el producto y el motivo pero no instrucciones al consumidor.', ko: '요약 — FDA 리콜 데이터베이스 자료로, 제품과 사유는 있으나 소비자 지침은 없습니다.', zh: '摘要——来自 FDA 召回数据库，其中列有产品和原因，但没有消费者指引。' },
  summaryNoQuote: { en: 'Summary — the notice didn’t include a consumer instruction we could quote. See the notice for exact instructions.', es: 'Resumen: el aviso no incluía una instrucción al consumidor citable. Vea el aviso para las instrucciones exactas.', ko: '요약 — 공지에 인용할 소비자 지침이 없었습니다. 정확한 지침은 공지를 확인하세요.', zh: '摘要——通告中没有可引用的消费者指引。具体指引请见通告。' },
  noticeInEnglish: { en: '', es: 'Los avisos oficiales están en inglés; su navegador puede traducirlos.', ko: '공식 공지는 영어입니다. 브라우저 번역 기능을 사용할 수 있습니다.', zh: '官方通告为英文；您可以使用浏览器翻译。' },
  illnessHead: { en: 'Illness reports', es: 'Informes de enfermedad', ko: '질병 신고', zh: '病例报告' },
  noticesInRecall: { en: (n) => `Notices in this recall (${n})`, es: (n) => `Avisos de este retiro (${n})`, ko: (n) => `이 리콜의 공지 (${n})`, zh: (n) => `此召回中的通告（${n}）` },
  possiblyRelated: { en: 'Possibly related', es: 'Posiblemente relacionados', ko: '관련 가능성', zh: '可能相关' },
  seeNotice: { en: 'See the notice', es: 'Ver el aviso (en inglés)', ko: '공지 보기 (영어)', zh: '查看通告（英文）' },
  notFoundHead: { en: 'We can’t find this recall', es: 'No encontramos este retiro', ko: '이 리콜을 찾을 수 없습니다', zh: '找不到此召回' },
  notFoundBody: { en: 'It may have been merged into another notice, marked completed by the agency, or the link may be incomplete.', es: 'Puede haberse fusionado con otro aviso, la agencia puede haberlo marcado como completado, o el enlace puede estar incompleto.', ko: '다른 공지와 병합되었거나, 기관이 완료로 처리했거나, 링크가 불완전할 수 있습니다.', zh: '它可能已并入其他通告、被机构标记为已完成，或链接不完整。' },
  seeAllActive: { en: 'See everything active', es: 'Ver todo lo activo', ko: '진행 중인 항목 전체 보기', zh: '查看全部有效召回' },
  unverifiedSource: { en: 'Source not yet verified by a person', es: 'Fuente aún no verificada por una persona', ko: '아직 사람이 검증하지 않은 출처', zh: '来源尚未经人工核实' },
  checkedOnce: { en: (d) => `Source checked ${d} — one reviewer so far`, es: (d) => `Fuente revisada el ${d} — un solo revisor por ahora`, ko: (d) => `${d}에 출처 확인 — 현재 검토자 1명`, zh: (d) => `来源已于 ${d} 核对——目前仅一位审核人` },
  checkedMany: { en: (n, d) => `Source checked by ${n} people, last ${d}`, es: (n, d) => `Fuente revisada por ${n} personas, última vez el ${d}`, ko: (n, d) => `${n}명이 출처 확인, 최근 ${d}`, zh: (n, d) => `来源已由 ${n} 人核对，最近于 ${d}` },
  linkMoved: { en: 'link may have moved', es: 'el enlace puede haber cambiado', ko: '링크가 이동했을 수 있음', zh: '链接可能已变更' },
  translationUnverified: { en: '', es: 'Traducción pendiente de verificación por una persona que lea español.', ko: '한국어 번역은 아직 한국어 사용자의 검증을 받지 않았습니다.', zh: '此中文翻译尚未经中文使用者核实。' },
};

// freshness stamp
Object.assign(STR, {
  src_fda: { en: 'FDA (everything else)', es: 'FDA (todo lo demás)', ko: 'FDA (기타 전체)', zh: 'FDA（其他全部）' },
  src_usda: { en: 'USDA (meat & poultry)', es: 'USDA (carne y aves)', ko: 'USDA (육류·가금류)', zh: 'USDA（肉禽）' },
  src_core: { en: 'FDA outbreak investigations', es: 'Investigaciones de brotes de la FDA', ko: 'FDA 집단감염 조사', zh: 'FDA 疫情调查' },
  src_cdc: { en: 'CDC illness reports', es: 'Informes de enfermedad de los CDC', ko: 'CDC 질병 보고', zh: 'CDC 病例报告' },
  ago_min: { en: (n) => `${n} min ago`, es: (n) => `hace ${n} min`, ko: (n) => `${n}분 전`, zh: (n) => `${n} 分钟前` },
  ago_h: { en: (n) => `${n} h ago`, es: (n) => `hace ${n} h`, ko: (n) => `${n}시간 전`, zh: (n) => `${n} 小时前` },
  ago_d: { en: (n) => `${n} days ago`, es: (n) => `hace ${n} días`, ko: (n) => `${n}일 전`, zh: (n) => `${n} 天前` },
  fr_dataThrough: { en: (d) => `data through ${d}`, es: (d) => `datos hasta ${d}`, ko: (d) => `${d}까지 데이터`, zh: (d) => `数据截至 ${d}` },
  fr_liveCheck: { en: (a) => `live check ${a}`, es: (a) => `consulta en vivo ${a}`, ko: (a) => `실시간 확인 ${a}`, zh: (a) => `实时查询 ${a}` },
  fr_liveFailed: { en: (m) => `live check failed — ${m}`, es: (m) => `falló la consulta en vivo — ${m}`, ko: (m) => `실시간 확인 실패 — ${m}`, zh: (m) => `实时查询失败 — ${m}` },
  fr_press: { en: (a) => `press releases ${a}`, es: (a) => `comunicados ${a}`, ko: (a) => `보도자료 ${a}`, zh: (a) => `新闻稿 ${a}` },
  fr_pressFailed: { en: (a) => `press-release feed failed ${a}`, es: (a) => `falló el canal de comunicados ${a}`, ko: (a) => `보도자료 피드 실패 ${a}`, zh: (a) => `新闻稿源失败 ${a}` },
  fr_snapshot: { en: (a) => `from snapshot ${a}`, es: (a) => `de la copia guardada, ${a}`, ko: (a) => `스냅샷 기준 ${a}`, zh: (a) => `来自快照 ${a}` },
  fr_liveFailedSnap: { en: (a) => `live check failed — showing snapshot from ${a}`, es: (a) => `falló la consulta en vivo — mostrando la copia de ${a}`, ko: (a) => `실시간 확인 실패 — ${a} 스냅샷 표시 중`, zh: (a) => `实时查询失败——显示 ${a} 的快照` },
  fr_failed: { en: (a) => `failed ${a}`, es: (a) => `falló ${a}`, ko: (a) => `실패 ${a}`, zh: (a) => `失败于 ${a}` },
  fr_showThrough: { en: (d) => ` — showing data through ${d}`, es: (d) => ` — mostrando datos hasta ${d}`, ko: (d) => ` — ${d}까지 데이터 표시 중`, zh: (d) => ` ——显示截至 ${d} 的数据` },
  fr_table: { en: (d) => `FDA table dated ${d}`, es: (d) => `tabla de la FDA con fecha ${d}`, ko: (d) => `FDA 표 기준일 ${d}`, zh: (d) => `FDA 表格日期 ${d}` },
  fr_fetched: { en: (a) => `fetched ${a}`, es: (a) => `obtenida ${a}`, ko: (a) => `${a} 가져옴`, zh: (a) => `获取于 ${a}` },
  fr_stale: { en: ' — FDA hasn’t updated it in over 2 weeks', es: ' — la FDA no la actualiza desde hace más de 2 semanas', ko: ' — FDA가 2주 넘게 갱신하지 않음', zh: ' ——FDA 已超过两周未更新' },
  fr_counts: { en: (d) => `counts as of ${d}`, es: (d) => `conteos al ${d}`, ko: (d) => `${d} 기준 집계`, zh: (d) => `截至 ${d} 的统计` },
  fr_unavail: { en: 'unavailable', es: 'no disponible', ko: '이용 불가', zh: '不可用' },
  fr_noSaved: { en: 'no saved data', es: 'sin datos guardados', ko: '저장된 데이터 없음', zh: '无已存数据' },
  fr_noPageDate: { en: (a) => `fetched ${a} (page date not found)`, es: (a) => `obtenida ${a} (fecha de la página no encontrada)`, ko: (a) => `${a} 가져옴 (페이지 날짜 없음)`, zh: (a) => `获取于 ${a}（未找到页面日期）` },

  // outbreaks page
  obHead: { en: 'Outbreak investigations', es: 'Investigaciones de brotes', ko: '집단감염 조사', zh: '疫情调查' },
  obIntro: { en: 'FDA’s table of illness investigations, which FDA updates about weekly.', es: 'La tabla de investigaciones de enfermedades de la FDA, actualizada aproximadamente cada semana.', ko: 'FDA가 약 주 1회 갱신하는 질병 조사 표입니다.', zh: 'FDA 的疾病调查表，约每周更新一次。' },
  obDated: { en: (d) => `This copy is dated ${d} by FDA`, es: (d) => `Esta copia tiene fecha de la FDA del ${d}`, ko: (d) => `이 사본의 FDA 기준일은 ${d}입니다`, zh: (d) => `此副本的 FDA 日期为 ${d}` },
  obFetchFailed: { en: (m) => `The last fetch failed (${m}); showing the previous copy.`, es: (m) => `La última descarga falló (${m}); se muestra la copia anterior.`, ko: (m) => `마지막 가져오기 실패(${m}). 이전 사본을 표시합니다.`, zh: (m) => `上次获取失败（${m}）；显示先前的副本。` },
  obLive: { en: 'See FDA’s live table', es: 'Ver la tabla en vivo de la FDA (en inglés)', ko: 'FDA 실시간 표 보기 (영어)', zh: '查看 FDA 实时表格（英文）' },
  obCdc: { en: (list, d) => `CDC separately counts active multistate investigations: ${list} (as of ${d}).`, es: (list, d) => `Los CDC cuentan por separado las investigaciones multiestatales activas: ${list} (al ${d}).`, ko: (list, d) => `CDC는 진행 중인 다주(州) 조사를 별도로 집계합니다: ${list} (${d} 기준).`, zh: (list, d) => `CDC 另行统计进行中的多州调查：${list}（截至 ${d}）。` },
  obNone: { en: 'No investigations in the data we could reach. If the FDA outbreak source failed (see the stamp), this list is missing, not empty.', es: 'No hay investigaciones en los datos disponibles. Si la fuente de brotes de la FDA falló (vea el sello), esta lista está incompleta, no vacía.', ko: '접근 가능한 데이터에 조사가 없습니다. FDA 집단감염 출처가 실패했다면(상단 표시 참조) 이 목록은 비어 있는 것이 아니라 누락된 것입니다.', zh: '在可获取的数据中没有调查。如果 FDA 疫情来源失败（见上方状态），此列表是缺失而非为空。' },
  obActive: { en: (n) => `Active (${n})`, es: (n) => `Activas (${n})`, ko: (n) => `진행 중 (${n})`, zh: (n) => `进行中（${n}）` },
  obClosed: { en: (n) => `Closed or inactive (${n})`, es: (n) => `Cerradas o inactivas (${n})`, ko: (n) => `종결·비활성 (${n})`, zh: (n) => `已结或不活跃（${n}）` },
  obNotYet: { en: 'Product not yet identified', es: 'Producto aún no identificado', ko: '제품 미확인', zh: '尚未确定产品' },
  obSick: { en: (n) => `${n} ${n === 1 ? 'person' : 'people'} sick`, es: (n) => `${n} persona${n === 1 ? '' : 's'} enferma${n === 1 ? '' : 's'}`, ko: (n) => `${n}명 발병`, zh: (n) => `${n} 人患病` },
  obHosp: { en: (n) => `${n} hospitalized`, es: (n) => `${n} hospitalizadas`, ko: (n) => `${n}명 입원`, zh: (n) => `${n} 人住院` },
  obDied: { en: (n) => `${n} died`, es: (n) => `${n} fallecieron`, ko: (n) => `${n}명 사망`, zh: (n) => `${n} 人死亡` },
  obSeeAdv: { en: 'case count — see advisory', es: 'número de casos: vea el aviso', ko: '환자 수 — 권고문 참조', zh: '病例数——见公告' },
  obConnected: { en: 'Recalls we’ve connected:', es: 'Retiros que hemos conectado:', ko: '연결한 리콜:', zh: '我们关联的召回：' },
  obAdvisory: { en: 'FDA’s advisory for this outbreak', es: 'Aviso de la FDA sobre este brote (en inglés)', ko: '이 집단감염에 대한 FDA 권고문 (영어)', zh: '此疫情的 FDA 公告（英文）' },
  obNoAdvisory: { en: 'No advisory yet — FDA hasn’t identified a product or given consumer advice for this one.', es: 'Aún no hay aviso: la FDA no ha identificado un producto ni dado recomendaciones para este caso.', ko: '아직 권고문이 없습니다. FDA가 제품을 특정하거나 소비자 지침을 내지 않았습니다.', zh: '尚无公告——FDA 尚未确定产品，也未给出消费者建议。' },
  obOurs: { en: 'Recall connections are ours, made by matching germ and food. FDA hasn’t necessarily tied those recalls to the investigation.', es: 'Las conexiones con retiros son nuestras, hechas por coincidencia de germen y alimento. La FDA no necesariamente vinculó esos retiros con la investigación.', ko: '리콜 연결은 병원체와 식품을 대조해 저희가 만든 것입니다. FDA가 해당 리콜을 이 조사와 공식적으로 연결한 것은 아닙니다.', zh: '召回关联由我们根据病原体和食品匹配得出。FDA 未必已将这些召回与该调查正式关联。' },
  // FDA's stage-column headers and common values
  col_date: { en: 'Date posted', es: 'Fecha de publicación', ko: '게시일', zh: '发布日期' },
  col_cases: { en: 'Total case count', es: 'Total de casos', ko: '총 환자 수', zh: '病例总数' },
  col_invstatus: { en: 'Investigation status', es: 'Estado de la investigación', ko: '조사 상태', zh: '调查状态' },
  col_eventstatus: { en: 'Outbreak / event status', es: 'Estado del brote o evento', ko: '집단감염/사건 상태', zh: '疫情/事件状态' },
  col_recall: { en: 'Recall initiated', es: 'Retiro iniciado', ko: '리콜 개시', zh: '已启动召回' },
  col_traceback: { en: 'Traceback initiated', es: 'Rastreo iniciado', ko: '역추적 개시', zh: '已启动追溯' },
  col_inspection: { en: 'Inspection initiated', es: 'Inspección iniciada', ko: '점검 개시', zh: '已启动检查' },
  col_sampling: { en: 'Sampling initiated', es: 'Muestreo iniciado', ko: '샘플 채취 개시', zh: '已启动采样' },
  col_advisory: { en: 'Outbreak advisory', es: 'Aviso del brote', ko: '집단감염 권고문', zh: '疫情公告' },
  val_initiated: { en: 'Initiated', es: 'Iniciado', ko: '개시됨', zh: '已启动' },
  val_notyet: { en: 'Not yet initiated', es: 'Aún no iniciado', ko: '아직 미개시', zh: '尚未启动' },
  val_yes: { en: 'Yes', es: 'Sí', ko: '예', zh: '是' },
  val_no: { en: 'No', es: 'No', ko: '아니요', zh: '否' },
  val_completed: { en: 'Completed', es: 'Completado', ko: '완료', zh: '已完成' },
  val_active: { en: 'Active', es: 'Activa', ko: '진행 중', zh: '进行中' },
  val_ended: { en: 'Ended', es: 'Terminado', ko: '종료', zh: '已结束' },
  val_ongoing: { en: 'Ongoing', es: 'En curso', ko: '진행 중', zh: '进行中' },
  val_seeadv: { en: 'See advisory', es: 'Vea el aviso', ko: '권고문 참조', zh: '见公告' },
});

// Vietnamese, Tagalog, Haitian Creole — consumer-critical path. Keys not listed here fall back
// to English (About, Outbreaks detail, and stamp internals await the next pass). The at-risk
// medical blocks live in hazard-guidance.json with their own per-language checks[].
const EXTRA = {
  tagline: { vi: 'Trong bếp nhà tôi có gì bị thu hồi không?', tl: 'May nire-recall bang pagkain sa kusina ko?', ht: 'Èske gen manje yo rele tounen nan kwizin mwen?' },
  checkOutbreaks: { vi: (n) => `Xem dịch bệnh${n ? ` (${n})` : ''}`, tl: (n) => `Tingnan ang outbreaks${n ? ` (${n})` : ''}`, ht: (n) => `Gade epidemi${n ? ` (${n})` : ''}` },
  narrowDown: { vi: 'Thu hẹp tìm kiếm', tl: 'Paliitin ang hanap', ht: 'Redwi rechèch la' },
  narrowOneLine: { vi: 'tiểu bang, sản phẩm hoặc mã vạch', tl: 'estado, produkto, o barcode', ht: 'eta, pwodwi, oswa kòd ba' },
  narrowSub: { vi: 'Không bắt buộc. Kết quả trùng khớp lên đầu; phần còn lại thu gọn bên dưới kèm số lượng — không có gì bị xóa.', tl: 'Opsyonal. Aakyat sa itaas ang tumutugma; ang iba ay nakatiklop sa ibaba na may bilang — walang tinatanggal.', ht: 'Se yon chwa. Sa ki matche monte anwo; rès la pliye anba ak yon kantite — anyen pa janm efase.' },
  loading: { vi: 'Đang tải…', tl: 'Naglo-load…', ht: 'Ap chaje…' },
  checked: { vi: 'Đã kiểm tra', tl: 'Sinuri', ht: 'Tcheke' },
  allSourcesOk: { vi: 'mọi nguồn hoạt động tốt', tl: 'maayos ang lahat ng sources', ht: 'tout sous yo bon' },
  sourcesFailing: { vi: (n) => `${n} nguồn bị lỗi`, tl: (n) => `${n} source ang may problema`, ht: (n) => `${n} sous gen pwoblèm` },
  blindSpotLeft: { vi: (d) => `Dữ liệu FDA đến ${d}`, tl: (d) => `Data ng FDA hanggang ${d}`, ht: (d) => `Done FDA rive jiska ${d}` },
  blindSpotRight: { vi: 'Các đợt thu hồi bắt đầu trong 3 tuần qua có thể chưa hiển thị', tl: 'Maaaring hindi pa lumalabas ang mga recall na nagsimula sa nakaraang 3 linggo', ht: 'Rapèl ki kòmanse nan 3 dènye semèn yo ka poko parèt' },
  activeNow: { vi: 'Đang có hiệu lực', tl: 'Aktibo ngayon', ht: 'Aktif kounye a' },
  sortedForYou: { vi: 'Đã sắp xếp cho bạn', tl: 'Inayos para sa iyo', ht: 'Klase pou ou' },
  stillChecking: { vi: 'đang kiểm tra…', tl: 'sinusuri pa…', ht: 'ap tcheke toujou…' },
  olderOpenNote: { vi: (n, m) => `${n} đợt thu hồi chưa đóng, cũ hơn ${m} tháng, không hiển thị ở đây — tìm theo sản phẩm hoặc mã vạch để kiểm tra.`, tl: (n, m) => `${n} bukas na recall na mas luma sa ${m} buwan ang hindi nakalista rito — maghanap ayon sa produkto o barcode para suriin.`, ht: (n, m) => `${n} rapèl ki poko fèmen, ki gen plis pase ${m} mwa, pa nan lis la — chèche pa pwodwi oswa kòd ba pou tcheke yo.` },
  matchedCount: { vi: (n) => `${n} đợt thu hồi có thể liên quan đến nội dung bạn nhập. Phần còn lại vẫn ở bên dưới.`, tl: (n) => `${n} recall ang maaaring may kinalaman sa inilagay mo. Nasa ibaba pa rin ang iba.`, ht: (n) => `${n} rapèl ka gen rapò ak sa ou antre a. Tout rès la anba a toujou.` },
  nothingMatched: { vi: 'Không có gì khớp với nội dung bạn nhập. Điều đó không phải là bảo đảm — thu hồi có thể mất đến ba tuần mới xuất hiện ở đây, và tên sản phẩm trong thông báo thường không đầy đủ.', tl: 'Walang tumugma sa inilagay mo. Hindi ito garantiya — maaaring tumagal nang hanggang tatlong linggo bago lumabas dito ang recall, at madalas kulang ang pangalan ng produkto sa mga abiso.', ht: 'Anyen pa matche ak sa ou antre a. Sa pa yon garanti — yon rapèl ka pran jiska twa semèn anvan li parèt isit la, epi non pwodwi yo souvan pa konplè nan avi yo.' },
  noActive: { vi: 'Không có đợt thu hồi nào đang hiệu lực trong dữ liệu chúng tôi truy cập được.', tl: 'Walang aktibong recall sa data na naabot namin.', ht: 'Pa gen okenn rapèl aktif nan done nou te ka jwenn yo.' },
  noActiveSub: { vi: 'Xem phần trạng thái ở trên — nếu một nguồn bị lỗi, danh sách này đang thiếu nguồn đó. Thu hồi cũng có thể mất đến ba tuần mới xuất hiện.', tl: 'Tingnan ang status sa itaas — kung may source na pumalya, kulang ang listahang ito. Maaari ring tumagal nang hanggang tatlong linggo bago lumabas ang recall.', ht: 'Gade estati a anwo a — si yon sous echwe, lis sa a manke li. Yon rapèl ka pran jiska twa semèn tou anvan li parèt.' },
  minorFold: { vi: (n) => `Thông báo về nhãn mác và lỗi nhỏ (${n})`, tl: (n) => `Mga abiso sa label at maliliit na isyu (${n})`, ht: (n) => `Avi sou etikèt ak ti pwoblèm (${n})` },
  notMatchingFold: { vi: (n) => `Không khớp với nội dung bạn nhập (${n})`, tl: (n) => `Hindi tumutugma sa inilagay mo (${n})`, ht: (n) => `Pa matche ak sa ou antre a (${n})` },
  notMatchingWhy: { vi: ' — vẫn hiển thị để không có gì bị giấu đi', tl: ' — ipinapakita para walang naitatagong impormasyon', ht: ' — yo montre yo pou anyen pa kache an silans' },
  seeEverything: { vi: 'Xem tất cả trên một trang →', tl: 'Tingnan lahat ng aktibo sa isang pahina →', ht: 'Gade tout sa ki aktif sou yon paj →' },
  bottomNote: { vi: 'Danh sách trống không có nghĩa là an toàn. Thu hồi có thể mất đến 3 tuần mới vào dữ liệu công khai, và trang này chỉ thấy những gì FDA và USDA công bố. Hãy tin cơ thể mình trước — nếu thấy không khỏe, hãy đi khám; đừng chờ danh sách này.', tl: 'Ang walang lamang listahan ay hindi ibig sabihing ligtas. Maaaring tumagal nang hanggang 3 linggo bago makarating ang recall sa pampublikong datos, at nakikita lang ng site na ito ang inilalathala ng FDA at USDA. Pagkatiwalaan muna ang katawan mo — kung masama ang pakiramdam, magpatingin agad; huwag hintayin ang listahang ito.', ht: 'Yon lis vid pa vle di tout bagay anfòm. Yon rapèl ka pran jiska 3 semèn anvan li antre nan done piblik yo, epi sit sa a wè sèlman sa FDA ak USDA pibliye. Fè kò ou konfyans anvan — si ou santi ou malad, al kay doktè; pa tann lis sa a.' },
  closedMatchHead: { vi: 'Các đợt thu hồi cũ và đã đóng trùng khớp', tl: 'Mga mas luma at saradong recall na tumutugma', ht: 'Rapèl ki pi ansyen ak fèmen ki matche' },
  closedMatchSub: { vi: (m) => `Mục “chưa đóng” được công bố hơn ${m} tháng trước và cơ quan chưa đóng. Mục “đã đóng” đã kết thúc. Dù thế nào, sản phẩm đã bán vẫn có thể còn trong tủ bếp hoặc tủ đông.`, tl: (m) => `Ang “bukas” ay inanunsyo mahigit ${m} buwan na at hindi pa isinasara ng ahensya. Ang “sarado” ay tapos na. Alinman dito, maaaring nasa paminggalan o freezer pa rin ang nabiling produkto.`, ht: (m) => `Sa ki “louvri” yo te anonse gen plis pase ${m} mwa epi ajans lan poko fèmen yo. Sa ki “fèmen” yo fini. Nan tou de ka, pwodwi ki te vann deja ka toujou nan yon gadmanje oswa yon frizè.` },
  checkingOlder: { vi: 'Đang kiểm tra các đợt thu hồi cũ…', tl: 'Sinusuri ang mas lumang recalls…', ht: 'Ap tcheke ansyen rapèl yo…' },
  noneOlder: { vi: 'Không tìm thấy trong 18 tháng qua. Các đợt cũ hơn không có trong dữ liệu này.', tl: 'Walang nahanap sa nakaraang 18 buwan. Wala sa data na ito ang mas luma pa.', ht: 'Nou pa jwenn anyen nan 18 dènye mwa yo. Rapèl ki pi ansyen yo pa nan done sa a.' },
  whereAreYou: { vi: 'Bạn ở đâu?', tl: 'Nasaan ka?', ht: 'Ki kote ou ye?' },
  skipState: { vi: 'Không rõ / bỏ qua', tl: 'Hindi sigurado / laktawan', ht: 'Pa konnen / sote' },
  stateHint: { vi: 'Các đợt thu hồi không ghi nơi bán vẫn nằm trong danh sách.', tl: 'Mananatili sa listahan ang mga recall na walang nakasaad na lugar ng bentahan.', ht: 'Rapèl ki pa di ki kote yo te vann yo rete nan lis la.' },
  whatsInKitchen: { vi: 'Trong bếp bạn có gì?', tl: 'Ano ang nasa kusina mo?', ht: 'Kisa ki nan kwizin ou?' },
  kitchenPlaceholder: { vi: 'vd: rau bina, phô mai', tl: 'hal. spinach, keso', ht: 'egz. epina, fwomaj' },
  kitchenHint: { vi: 'Nhãn hiệu, món ăn, hoặc chữ trên nhãn — viết tiếng Việt cũng được.', tl: 'Brand, pagkain, o salita mula sa label — puwede sa Tagalog.', ht: 'Yon mak, yon manje, oswa yon mo sou etikèt la — ou ka ekri an kreyòl.' },
  barcodeLabel: { vi: 'Số mã vạch trên bao bì', tl: 'Numero ng barcode sa pakete', ht: 'Nimewo kòd ba ki sou anbalaj la' },
  barcodePlaceholder: { vi: '12 đến 14 chữ số', tl: '12 hanggang 14 na numero', ht: '12 a 14 chif' },
  barcodeHint: { vi: 'Dãy số dưới các vạch — giống nhau ở mọi ngôn ngữ.', tl: 'Ang mga numero sa ilalim ng mga guhit — pareho sa lahat ng wika.', ht: 'Chif ki anba ba yo — menm bagay nan tout lang.' },
  keepTyping: { vi: 'Gõ tiếp — mã vạch có 12 đến 14 chữ số', tl: 'Magpatuloy — 12 hanggang 14 na numero ang barcode', ht: 'Kontinye tape — kòd ba gen 12 a 14 chif' },
  partialUpc: { vi: 'Số chưa đủ: hiển thị các thu hồi của cùng công ty cho đến khi bạn gõ xong', tl: 'Kulang pa: ipinapakita ang mga recall ng parehong kumpanya hanggang matapos kang mag-type', ht: 'Nimewo pasyèl: montre rapèl menm konpayi an jiskaske ou fin tape' },
  tooLongUpc: { vi: 'Quá 14 chữ số — kiểm tra lại dãy số dưới mã vạch', tl: 'Higit sa 14 na numero — suriin ang numero sa ilalim ng barcode', ht: 'Sa depase 14 chif — tcheke nimewo ki anba kòd ba a' },
  lotLabel: { vi: 'Mã lô (LOT) trên bao bì', tl: 'Lot code sa pakete', ht: 'Kòd lo (LOT) sou anbalaj la' },
  lotPlaceholder: { vi: 'vd: LOT 24187 A', tl: 'hal. LOT 24187 A', ht: 'egz. LOT 24187 A' },
  lotHint: { vi: 'In gần hạn dùng — gồm chữ và số, thường sau chữ “LOT”.', tl: 'Nakalimbag malapit sa petsa — mga letra at numero, kadalasang pagkatapos ng “LOT”.', ht: 'Enprime toupre dat la — lèt ak chif, souvan apre mo “LOT” la.' },
  res_lot: { vi: ['Khớp với một mã lô trong thông báo này', 'Mã lô có thể trùng giữa các công ty, nên hãy so sánh cả nhãn hiệu và bao bì trước khi kết luận.'], tl: ['Tumugma sa isang lot code sa abisong ito', 'Nauulit ang mga lot number sa iba\'t ibang kumpanya, kaya ikumpara rin ang brand at pakete bago magpasya.'], ht: ['Li matche ak yon kòd lo nan avi sa a', 'Nimewo lo ka repete nan plizyè konpayi, kidonk konpare mak la ak anbalaj la tou anvan ou deside.'] },
  mapToggle: { vi: '🗺 Hoặc chạm vào tiểu bang của bạn trên bản đồ', tl: '🗺 O pindutin ang iyong estado sa mapa', ht: '🗺 Oswa peze eta ou sou kat la' },
  mapLabel: { vi: 'Chọn tiểu bang trên bản đồ', tl: 'Piliin ang estado mo sa mapa', ht: 'Chwazi eta ou sou kat la' },
  mapHint: { vi: 'Các ô xếp theo vị trí gần đúng trên bản đồ. Chạm lần nữa để bỏ chọn.', tl: 'Nakaayos ang mga parisukat ayon sa tinatayang posisyon sa mapa. Pindutin ulit para alisin.', ht: 'Kare yo plase apeprè jan yo ye sou kat la. Peze ankò pou retire chwa a.' },
  scan: { vi: 'Quét', tl: 'I-scan', ht: 'Eskane' },
  scanTitle: { vi: 'Quét mã vạch', tl: 'I-scan ang barcode', ht: 'Eskane kòd ba a' },
  scanHint: { vi: 'Hướng camera vào mã vạch. Không tải lên gì cả — việc đọc diễn ra trên thiết bị của bạn.', tl: 'Itutok ang camera sa barcode. Walang ina-upload — sa device mo mismo ang pagbasa.', ht: 'Pwente kamera a sou kòd ba a. Anyen pa voye sou entènèt — lekti a fèt sou aparèy ou a.' },
  scanClose: { vi: 'Đóng', tl: 'Isara', ht: 'Fèmen' },
  scanLoading: { vi: 'Đang tải trình quét…', tl: 'Niloload ang scanner…', ht: 'Ap chaje eskanè a…' },
  scanUnsupported: { vi: 'Không khởi động được trình quét trong trình duyệt này. Hãy gõ dãy số dưới các vạch — cách đó luôn dùng được.', tl: 'Hindi ma-start ang camera scanner sa browser na ito. I-type na lang ang mga numero sa ilalim ng mga guhit — gumagana iyon kahit saan.', ht: 'Eskanè kamera a pa t ka kòmanse nan navigatè sa a. Tape chif ki anba ba yo — sa mache toupatou.' },
  scanDenied: { vi: 'Quyền dùng camera bị từ chối. Hãy gõ dãy số dưới các vạch.', tl: 'Tinanggihan ang permiso sa camera. I-type ang mga numero sa ilalim ng mga guhit.', ht: 'Yo refize pèmisyon kamera a. Tape chif ki anba ba yo pito.' },
  scanLotNote: { vi: 'Mã lô là chữ in, không phải mã vạch — camera chưa đọc được chính xác, hãy so sánh bằng mắt.', tl: 'Ang lot code ay nakalimbag na teksto, hindi barcode — hindi pa ito nababasa nang maayos ng camera, kaya ikumpara ito gamit ang mata.', ht: 'Kòd lo se tèks enprime, se pa kòd ba — kamera a poko ka li yo byen, kidonk konpare yo ak je ou.' },
  whatToDo: { vi: 'Cần làm gì →', tl: 'Ano ang gagawin →', ht: 'Sa pou fè →' },
  notices: { vi: (n) => `${n} thông báo`, tl: (n) => `${n} abiso`, ht: (n) => `${n} avi` },
  illnesses: { vi: (n) => `${n} ca bệnh được báo cáo`, tl: (n) => `${n} naiulat na sakit`, ht: (n) => `${n} ka maladi rapòte` },
  listIncomplete: { vi: 'danh sách có thể chưa đầy đủ', tl: 'maaaring kulang ang listahan', ht: 'lis la ka pa konplè' },
  sampleTag: { vi: 'Mẫu thử', tl: 'Halimbawa', ht: 'Egzanp' },
  closedTag: { vi: 'Đã đóng', tl: 'Sarado', ht: 'Fèmen' },
  openTag: { vi: (d) => `Chưa đóng · ${d}`, tl: (d) => `Bukas · ${d}`, ht: (d) => `Louvri · ${d}` },
  scopeNationwide: { vi: 'Bán trên toàn quốc', tl: 'Ibinenta sa buong bansa', ht: 'Vann nan tout peyi a' },
  scopeSingle: { vi: (st) => `Chỉ bán ở ${st}`, tl: (st) => `Ibinenta lang sa ${st}`, ht: (st) => `Vann sèlman nan ${st}` },
  scopeMulti: { vi: (n) => `Bán ở ${n} tiểu bang`, tl: (n) => `Ibinenta sa ${n} estado`, ht: (n) => `Vann nan ${n} eta` },
  scopeIntl: { vi: 'Bán ngoài nước Mỹ; chưa ghi nhận bán tại Mỹ', tl: 'Ibinenta sa labas ng US; walang nakalistang benta sa US', ht: 'Vann deyò Etazini; lavant Ozetazini pa nan lis la' },
  scopeUnknown: { vi: 'Nơi bán: không ghi rõ', tl: 'Saan ibinenta: walang nakasaad', ht: 'Ki kote yo vann li: pa endike' },
  sev_class_1: { vi: ['CẤP I', 'Có thể gây hại nghiêm trọng', 'Ăn phải có thể gây bệnh nặng hoặc tử vong.'], tl: ['CLASS I', 'Maaaring magdulot ng malubhang pinsala', 'Ang pagkain nito ay maaaring magdulot ng malubhang sakit o kamatayan.'], ht: ['KLAS I', 'Danje grav posib', 'Manje sa ka lakòz maladi grav oswa lanmò.'] },
  sev_alert: { vi: ['CẢNH BÁO Y TẾ CÔNG CỘNG', 'Đừng ăn', 'USDA cảnh báo về sản phẩm này nhưng không thể thu hồi — thường vì không còn bán hoặc chưa từng được kiểm định. Hãy xem như thu hồi Cấp I.'], tl: ['PUBLIC HEALTH ALERT', 'Huwag itong kainin', 'Nagbababala ang USDA tungkol sa produktong ito ngunit hindi ito mare-recall — kadalasan dahil hindi na ito ibinebenta o hindi na-inspeksyon. Ituring itong parang Class I recall.'], ht: ['ALÈT SANTE PIBLIK', 'Pa manje li', 'USDA ap avèti sou pwodwi sa a men li pa ka rele l tounen — souvan paske li pa vann ankò oswa li pa t janm enspekte. Trete l tankou yon rapèl Klas I.'] },
  sev_unclassified: { vi: ['ĐÃ CÔNG BỐ', 'Chưa phân loại', 'Công ty hoặc cơ quan đã công bố thu hồi, nhưng FDA chưa đánh giá mức độ nghiêm trọng.'], tl: ['INANUNSYO', 'Hindi pa nauuri', 'Inanunsyo na ng kumpanya o ahensya ang recall, pero hindi pa nagagrado ng FDA kung gaano ito kaseryoso.'], ht: ['ANONSE', 'Poko klase', 'Konpayi an oswa ajans lan anonse rapèl la, men FDA poko evalye jan li grav.'] },
  sev_class_2: { vi: ['CẤP II', 'Có thể gây bệnh', 'Ăn phải có thể làm bạn ốm tạm thời; ít khả năng gây hại nghiêm trọng.'], tl: ['CLASS II', 'Maaaring magpasakit', 'Maaari kang magkasakit nang pansamantala; malabong magdulot ng malubhang pinsala.'], ht: ['KLAS II', 'Ka fè ou malad', 'Manje sa ka fè ou malad tanporèman; danje grav pa fasil.'] },
  sev_class_3: { vi: ['CẤP III', 'Nhãn mác hoặc lỗi nhỏ', 'Ít khả năng gây hại; thường là vấn đề nhãn mác hoặc bao bì.'], tl: ['CLASS III', 'Label o maliit na isyu', 'Malabong makapinsala; kadalasang problema sa label o pakete.'], ht: ['KLAS III', 'Etikèt oswa ti pwoblèm', 'Li pa fasil pou fè ou mal; anjeneral se yon pwoblèm etikèt oswa anbalaj.'] },
  res_upc: { vi: ['Sản phẩm này bị thu hồi', 'Mã vạch bạn nhập khớp với thông báo này.'], tl: ['Nire-recall ito', 'Tumugma ang barcode na inilagay mo sa abisong ito.'], ht: ['Yo rele pwodwi sa a tounen', 'Kòd ba ou antre a matche ak avi sa a.'] },
  res_upc_unverified: { vi: ['Có thể bị thu hồi', 'Khớp với một mã trong thông báo, nhưng mã trong thông báo có thể bị gõ sai. Hãy so sánh cả nhãn hiệu.'], tl: ['Maaaring naka-recall', 'Tumugma ito sa isang code sa abiso, pero maaaring may typo ang code ng abiso. Ikumpara rin ang brand.'], ht: ['Li ka nan rapèl', 'Sa matche ak yon kòd nan avi a, men kòd avi a ka gen yon erè. Konpare mak la tou.'] },
  res_state_and_product: { vi: [(c) => `Thu hồi ở ${c.stateName} — hãy kiểm tra`, (c) => `Thông báo ghi ${c.stateName}. So sánh mã trên bao bì của bạn.`], tl: [(c) => `Naka-recall sa ${c.stateName} — suriin ito`, (c) => `Nakalista sa abiso ang ${c.stateName}. Ikumpara ang code sa pakete mo.`], ht: [(c) => `Rapèl nan ${c.stateName} — tcheke sa`, (c) => `Avi a mansyone ${c.stateName}. Konpare kòd ki sou anbalaj ou a.`] },
  res_nationwide_and_product: { vi: ['Bị thu hồi — hãy kiểm tra', 'Bán toàn quốc. So sánh mã trên bao bì của bạn.'], tl: ['Naka-recall — suriin ito', 'Ibinenta sa buong bansa. Ikumpara ang code sa pakete mo.'], ht: ['Nan rapèl — tcheke sa', 'Vann nan tout peyi a. Konpare kòd ki sou anbalaj ou a.'] },
  res_upc_prefix: { vi: ['Cùng công ty này có một đợt thu hồi', 'Các chữ số đầu bạn nhập khớp với dải mã vạch của công ty này, nhưng không phải đúng sản phẩm này. Nhập đủ số, hoặc so sánh nhãn hiệu và cỡ gói.'], tl: ['May recall ang parehong kumpanya', 'Tumugma ang unang mga numero sa hanay ng barcode ng kumpanyang ito, pero hindi sa eksaktong produktong ito. Ilagay ang buong numero, o ikumpara ang brand at laki.'], ht: ['Menm konpayi an gen yon rapèl', 'Premye chif ou antre yo matche ak seri kòd ba konpayi sa a, men se pa egzakteman pwodwi sa a. Antre tout nimewo a, oswa konpare mak la ak gwosè a.'] },
  res_product_guess: { vi: [(c) => `Có thể khớp — ${c.token}`, (c) => `Thông báo có nhắc đến “${c.token}”. So sánh với bao bì của bạn trước khi kết luận.`], tl: [(c) => `Maaaring tumugma — ${c.token}`, (c) => `Binabanggit ng abiso ang “${c.token}”. Ikumpara sa pakete mo bago magpasya.`], ht: [(c) => `Li ka matche — ${c.token}`, (c) => `Avi a pale de “${c.token}”. Konpare ak anbalaj ou a anvan ou deside.`] },
  res_state_only: { vi: [(c) => `Bán ở ${c.stateName}`, 'Kiểm tra xem bạn có sản phẩm này không.'], tl: [(c) => `Ibinenta sa ${c.stateName}`, 'Suriin kung mayroon ka ng produktong ito.'], ht: [(c) => `Vann nan ${c.stateName}`, 'Tcheke si ou gen pwodwi sa a.'] },
  res_distribution_incomplete: { vi: ['Có thể ảnh hưởng đến bạn', (c) => c.stateCount ? `Ghi ${c.stateCount} tiểu bang; chúng tôi không đọc được danh sách đầy đủ. Xem như có khả năng.` : 'Thông báo không ghi nơi bán.'], tl: ['Maaaring may epekto sa iyo', (c) => c.stateCount ? `${c.stateCount} estado ang nakalista; hindi namin nabasa ang buong listahan. Ituring na posible.` : 'Hindi sinasabi ng abiso kung saan ito ibinenta.'], ht: ['Sa ka konsène ou', (c) => c.stateCount ? `Yo bay ${c.stateCount} eta; nou pa t ka li tout lis la. Konsidere sa posib.` : 'Avi a pa di ki kote yo te vann li.'] },
  res_other_state: { vi: [(c) => `Không ghi ${c.stateName}`, (c) => `Thông báo ghi ${c.listed}. Vẫn hiển thị phòng khi danh sách chưa đầy đủ.`], tl: [(c) => `Hindi nakalista ang ${c.stateName}`, (c) => `Nakalista sa abiso: ${c.listed}. Ipinapakita pa rin sakaling kulang ang listahan.`], ht: [(c) => `${c.stateName} pa nan lis la`, (c) => `Avi a bay ${c.listed}. Nou montre l kanmenm sizoka lis la pa konplè.`] },
  disp_return_for_refund: { vi: 'Mang trả lại nơi mua để được hoàn tiền.', tl: 'Ibalik sa binilhan para sa refund.', ht: 'Pote l tounen kote ou te achte l pou yo remèt ou lajan.' },
  disp_discard: { vi: 'Vứt bỏ.', tl: 'Itapon ito.', ht: 'Jete li.' },
  disp_discard_or_return: { vi: 'Vứt bỏ hoặc mang trả để được hoàn tiền.', tl: 'Itapon o ibalik para sa refund.', ht: 'Jete li oswa pote l tounen pou yo remèt ou lajan.' },
  disp_discard_and_sanitize: { vi: 'Vứt bỏ, sau đó lau rửa ngăn tủ lạnh, hộp đựng và các bề mặt đã chạm vào sản phẩm.', tl: 'Itapon, pagkatapos ay linisin ang mga istante ng ref, lalagyan, at mga surface na nadikitan nito.', ht: 'Jete li, epi netwaye etajè frijidè a, veso yo, ak sifas pwodwi a te touche.' },
  disp_return_and_sanitize: { vi: 'Mang trả để được hoàn tiền, hoặc vứt bỏ. Sau đó lau rửa ngăn tủ lạnh, hộp đựng và các bề mặt đã chạm vào sản phẩm.', tl: 'Ibalik para sa refund, o itapon. Pagkatapos ay linisin ang mga istante ng ref, lalagyan, at mga surface na nadikitan nito.', ht: 'Pote l tounen pou lajan ou, oswa jete li. Apre sa netwaye etajè frijidè a, veso yo, ak sifas li te touche yo.' },
  disp_do_not_open: { vi: 'Đừng mở. Bỏ vào túi kín rồi vứt, hoặc mang trả nguyên hộp.', tl: 'Huwag itong buksan. Itapon sa saradong bag, o ibalik nang hindi nabubuksan.', ht: 'Pa louvri li. Jete l nan yon sak fèmen, oswa pote l tounen san louvri.' },
  disp_see_notice: { vi: 'Đọc thông báo để biết cách xử lý.', tl: 'Basahin ang abiso para malaman ang gagawin dito.', ht: 'Li avi a pou konnen sa pou fè ak li.' },
  backToList: { vi: '← Tất cả thu hồi đang hiệu lực', tl: '← Lahat ng aktibong recall', ht: '← Tout rapèl aktif yo' },
  share: { vi: 'Chia sẻ', tl: 'Ibahagi', ht: 'Pataje' },
  linkCopied: { vi: 'Đã sao chép liên kết', tl: 'Nakopya ang link', ht: 'Lyen kopye' },
  theFood: { vi: 'Thực phẩm liên quan', tl: 'Ang pagkain', ht: 'Manje a' },
  noBarcode: { vi: 'Thông báo này không ghi mã vạch. Hãy so sánh nhãn hiệu và cỡ gói.', tl: 'Walang nakalistang barcode sa abisong ito. Ikumpara na lang ang brand at laki ng pakete.', ht: 'Avi sa a pa bay kòd ba. Konpare mak la ak gwosè anbalaj la pito.' },
  lotOnly: { vi: 'Không ghi mã vạch. Kiểm tra mã lô trên bao bì.', tl: 'Walang nakalistang barcode. Hanapin ang lot code sa pakete.', ht: 'Pa gen kòd ba. Tcheke kòd lo ki sou anbalaj la.' },
  barcodes: { vi: 'Mã vạch', tl: 'Mga barcode', ht: 'Kòd ba yo' },
  lotCodes: { vi: 'Mã lô', tl: 'Mga lot code', ht: 'Kòd lo yo' },
  pkgDates: { vi: 'Ngày ghi trên bao bì', tl: 'Mga petsa sa pakete', ht: 'Dat ki sou anbalaj la' },
  whereSold: { vi: 'Nơi bán', tl: 'Saan ito ibinenta', ht: 'Ki kote yo te vann li' },
  distIncomplete: { vi: 'Chúng tôi không đọc được đầy đủ danh sách phân phối từ thông báo. Hãy xem các tiểu bang khác cũng có khả năng.', tl: 'Hindi namin nabasa ang buong listahan ng distribusyon mula sa abiso. Ituring na posible rin ang ibang estado.', ht: 'Nou pa t ka li tout lis distribisyon an nan avi a. Konsidere lòt eta yo posib tou.' },
  whatNoticeSays: { vi: 'Nguyên văn thông báo', tl: 'Ano ang sabi ng abiso', ht: 'Sa avi a di' },
  whatToDoHead: { vi: 'Cần làm gì', tl: 'Ano ang gagawin', ht: 'Sa pou fè' },
  dontEat: { vi: 'Đừng ăn.', tl: 'Huwag itong kainin.', ht: 'Pa manje li.' },
  fromNotice: { vi: (a) => `Trích từ thông báo của ${a} (tiếng Anh)`, tl: (a) => `Mula sa abiso ng ${a} (Ingles)`, ht: (a) => `Soti nan avi ${a} a (an angle)` },
  fdaDbNoInstr: { vi: 'Mục dữ liệu của FDA không nói nên trả lại hay vứt bỏ. Cách nào cũng được — quan trọng là đừng ăn.', tl: 'Hindi sinasabi ng database ng FDA kung ibabalik o itatapon. Puwede alinman — basta huwag itong kainin.', ht: 'Fich FDA a pa di si pou remèt li oswa jete li. Nenpòt nan de a bon — sèlman pa manje li.' },
  summaryDb: { vi: 'Tóm tắt — từ cơ sở dữ liệu thu hồi của FDA, nơi ghi sản phẩm và lý do nhưng không có hướng dẫn cho người tiêu dùng.', tl: 'Buod — galing ito sa recall database ng FDA, na naglilista ng produkto at dahilan pero walang tagubilin para sa consumer.', ht: 'Rezime — sa soti nan baz done rapèl FDA a, ki bay pwodwi a ak rezon an men pa gen enstriksyon pou konsomatè.' },
  summaryNoQuote: { vi: 'Tóm tắt — thông báo không có hướng dẫn cho người tiêu dùng để trích dẫn. Xem thông báo để biết hướng dẫn chính xác.', tl: 'Buod — walang tagubilin sa consumer sa abiso na maaaring sipiin. Tingnan ang abiso para sa eksaktong tagubilin.', ht: 'Rezime — avi a pa t gen yon enstriksyon pou konsomatè nou te ka site. Gade avi a pou enstriksyon egzak yo.' },
  noticeInEnglish: { vi: 'Thông báo chính thức bằng tiếng Anh; trình duyệt của bạn có thể dịch chúng.', tl: 'Nasa Ingles ang mga opisyal na abiso; maaaring isalin ng browser mo.', ht: 'Avi ofisyèl yo an angle; navigatè ou ka tradui yo.' },
  illnessHead: { vi: 'Báo cáo ca bệnh', tl: 'Mga ulat ng sakit', ht: 'Rapò maladi' },
  noticesInRecall: { vi: (n) => `Các thông báo trong đợt thu hồi này (${n})`, tl: (n) => `Mga abiso sa recall na ito (${n})`, ht: (n) => `Avi nan rapèl sa a (${n})` },
  possiblyRelated: { vi: 'Có thể liên quan', tl: 'Maaaring kaugnay', ht: 'Ka gen rapò' },
  seeNotice: { vi: 'Xem thông báo (tiếng Anh)', tl: 'Tingnan ang abiso (Ingles)', ht: 'Gade avi a (an angle)' },
  notFoundHead: { vi: 'Không tìm thấy đợt thu hồi này', tl: 'Hindi namin mahanap ang recall na ito', ht: 'Nou pa jwenn rapèl sa a' },
  notFoundBody: { vi: 'Có thể nó đã được gộp vào thông báo khác, cơ quan đã đánh dấu hoàn tất, hoặc liên kết chưa đầy đủ.', tl: 'Maaaring pinagsama na ito sa ibang abiso, minarkahang tapos na ng ahensya, o kulang ang link.', ht: 'Petèt li fizyone ak yon lòt avi, ajans lan make l fini, oswa lyen an pa konplè.' },
  seeAllActive: { vi: 'Xem tất cả đang hiệu lực', tl: 'Tingnan lahat ng aktibo', ht: 'Gade tout sa ki aktif' },
  unverifiedSource: { vi: 'Nguồn chưa được người kiểm chứng', tl: 'Hindi pa nabe-verify ng tao ang source', ht: 'Yon moun poko verifye sous sa a' },
  checkedOnce: { vi: (d) => `Nguồn đã kiểm ${d} — mới một người xem`, tl: (d) => `Na-check ang source noong ${d} — isang reviewer pa lang`, ht: (d) => `Sous la tcheke ${d} — yon sèl moun pou kounye a` },
  checkedMany: { vi: (n, d) => `${n} người đã kiểm nguồn, lần cuối ${d}`, tl: (n, d) => `${n} tao ang nag-check ng source, huling beses ${d}`, ht: (n, d) => `${n} moun tcheke sous la, dènye fwa ${d}` },
  linkMoved: { vi: 'liên kết có thể đã đổi', tl: 'maaaring lumipat ang link', ht: 'lyen an ka deplase' },
  translationUnverified: { vi: 'Bản dịch tiếng Việt chưa được người đọc tiếng Việt kiểm chứng.', tl: 'Hindi pa nabe-verify ng nagbabasa ng Tagalog ang saling ito.', ht: 'Yon moun ki li kreyòl poko verifye tradiksyon sa a.' },
  back: { vi: '← Quay lại', tl: '← Bumalik', ht: '← Tounen' },
  and: { vi: ' và ', tl: ' at ', ht: ' ak ' },
  feedback: { vi: 'Góp ý? Gửi email cho chúng tôi', tl: 'May mungkahi? Mag-email sa amin', ht: 'Ou gen sijesyon? Voye yon imèl ban nou' },
  feedbackSubject: { vi: 'Góp ý về FoodCheck', tl: 'Feedback sa FoodCheck', ht: 'Fidbak sou FoodCheck' },
  backToTop: { vi: '↑ Về ô tìm kiếm', tl: '↑ Balik sa paghahanap', ht: '↑ Tounen nan rechèch la' },
  langMenu: { vi: 'Ngôn ngữ', tl: 'Wika', ht: 'Lang' },
  incSample: { vi: 'Mẫu thử — đây là bản ghi giả để kiểm thử, không phải thu hồi thật.', tl: 'Halimbawa — gawa-gawang test record ito, hindi tunay na recall.', ht: 'Egzanp — sa a se yon dosye tès fiktif, se pa yon vrè rapèl.' },
  bannerSampleAll: { vi: 'Dữ liệu mẫu — mọi thứ hiển thị là bản ghi giả để kiểm thử, không phải thu hồi thật.', tl: 'Sample data — lahat ng ipinapakita ay gawa-gawang test record, hindi tunay na recall.', ht: 'Done egzanp — tout sa ou wè se dosye tès fiktif, se pa vrè rapèl.' },
  bannerMixed: { vi: 'Hỗn hợp: thẻ có chữ “Mẫu thử” là bản ghi giả. Thẻ không đánh dấu là thu hồi thật lấy trực tiếp.', tl: 'Halo: ang mga card na may markang “Halimbawa” ay gawa-gawang record. Ang walang marka ay tunay na recall na kinuha nang live.', ht: 'Melanje: kat ki make “Egzanp” yo se dosye fiktif. Kat san mak yo se vrè rapèl nou pran an dirèk.' },
  groupLikely: { vi: 'Các thông báo này được gộp vì có cùng mối nguy và nguyên liệu trong vòng ba tuần. Chúng có thể không cùng một nguồn gốc.', tl: 'Pinagsama ang mga abisong ito dahil pareho ang panganib at sangkap sa loob ng tatlong linggo. Maaaring hindi lahat ay galing sa iisang pinagmulan.', ht: 'Nou gwoupe avi sa yo paske yo gen menm danje ak menm engredyan nan twa semèn. Yo ka pa tout soti nan yon sèl sous.' },
  groupPossible: { vi: 'Các thông báo này được gộp vì có cùng mối nguy với một cuộc điều tra dịch bệnh đang diễn ra. Đây là suy đoán tốt nhất của chúng tôi, không phải của cơ quan.', tl: 'Pinagsama ang mga abisong ito dahil pareho ang panganib sa isang aktibong imbestigasyon ng outbreak. Pinakamahusay naming hula ito, hindi sa ahensya.', ht: 'Nou gwoupe avi sa yo paske yo pataje yon danje ak yon ankèt epidemi ki aktif. Sa se pi bon estimasyon pa nou, se pa pa ajans lan.' },
  illnessLinkNote: { vi: 'Liên kết theo trùng khớp vi khuẩn và thực phẩm. Cơ quan chưa chắc đã gắn thu hồi này với dịch bệnh đó.', tl: 'Ikinabit sa pamamagitan ng pagtutugma ng mikrobyo at pagkain. Hindi pa tiyak na iniugnay ng ahensya ang recall na ito sa outbreak na iyon.', ht: 'Konekte pa matche mikwòb ak manje. Ajans lan pa nesesèman mete rapèl sa a ansanm ak epidemi sa a.' },
  allInvestigations: { vi: 'Tất cả cuộc điều tra', tl: 'Lahat ng imbestigasyon', ht: 'Tout ankèt yo' },
  sameCompany: { vi: '— cùng công ty, mối nguy khác', tl: '— parehong kumpanya, ibang panganib', ht: '— menm konpayi, lòt danje' },
  bannerClosed: { vi: (ag, d) => `${ag} đã đóng đợt thu hồi này${d ? ` vào ${d}` : ''}.`, tl: (ag, d) => `Isinara ng ${ag} ang recall na ito${d ? ` noong ${d}` : ''}.`, ht: (ag, d) => `${ag} fèmen rapèl sa a${d ? ` ${d}` : ''}.` },
  bannerClosedTail: { vi: ' Đã đóng nghĩa là cơ quan hoàn tất theo dõi, không có nghĩa sản phẩm còn lại là an toàn để ăn.', tl: ' Ang sarado ay nangangahulugang tapos na ang follow-up ng ahensya, hindi na ligtas kainin ang natitirang produkto.', ht: ' Fèmen vle di ajans lan fini swivi li, sa pa vle di pwodwi ou rete a bon pou manje.' },
  bannerOlder: { vi: (d, ag, m) => `Công bố ${d}. ${ag} chưa đóng đợt thu hồi này, nhưng đã hơn ${m} tháng.`, tl: (d, ag, m) => `Inanunsyo noong ${d}. Hindi pa isinasara ng ${ag} ang recall na ito, pero mahigit ${m} buwan na ito.`, ht: (d, ag, m) => `Anonse ${d}. ${ag} poko fèmen rapèl sa a, men li gen plis pase ${m} mwa.` },
  bannerOlderTail: { vi: ' Sản phẩm khó còn trên kệ. Nếu bạn còn giữ, các hướng dẫn bên dưới vẫn áp dụng.', tl: ' Malabong nasa tindahan pa ang produkto. Kung mayroon ka pa nito, angkop pa rin ang payo sa ibaba.', ht: ' Pwodwi a pa fasil toujou nan magazen. Si ou genyen l, konsèy anba yo toujou valab.' },
};
for (const [k, v] of Object.entries(EXTRA)) if (STR[k]) Object.assign(STR[k], v);

// Second vi/tl/ht batch: About, Outbreaks, stamp source lines, CDC comparison, All active.
const EXTRA2 = {
  aboutData: { vi: 'Về dữ liệu', tl: 'Tungkol sa data', ht: 'Sou done yo' },
  outbreaks: { vi: 'Dịch bệnh', tl: 'Mga outbreak', ht: 'Epidemi' },
  // stamp sources
  src_fda: { vi: 'FDA (mọi thứ còn lại)', tl: 'FDA (lahat ng iba pa)', ht: 'FDA (tout lòt bagay)' },
  src_usda: { vi: 'USDA (thịt và gia cầm)', tl: 'USDA (karne at manok)', ht: 'USDA (vyann ak volay)' },
  src_core: { vi: 'Điều tra dịch bệnh của FDA', tl: 'Mga imbestigasyon ng outbreak ng FDA', ht: 'Ankèt epidemi FDA' },
  src_cdc: { vi: 'Báo cáo ca bệnh của CDC', tl: 'Mga ulat ng sakit ng CDC', ht: 'Rapò maladi CDC' },
  src_rss: { vi: 'Thông cáo báo chí FDA', tl: 'Mga press release ng FDA', ht: 'Kominike laprès FDA' },
  src_mpi: { vi: 'Danh sách cơ sở của USDA', tl: 'Listahan ng establisimyento ng USDA', ht: 'Lis etablisman USDA' },
  src_snap: { vi: 'Bản lưu (snapshot)', tl: 'Naka-save na snapshot', ht: 'Snapshot sovgade' },
  src_live: { vi: 'Kiểm tra trực tiếp FDA', tl: 'Live check sa FDA', ht: 'Verifikasyon dirèk FDA' },
  ago_min: { vi: (n) => `${n} phút trước`, tl: (n) => `${n} minuto ang nakalipas`, ht: (n) => `sa gen ${n} minit` },
  ago_h: { vi: (n) => `${n} giờ trước`, tl: (n) => `${n} oras ang nakalipas`, ht: (n) => `sa gen ${n} èdtan` },
  ago_d: { vi: (n) => `${n} ngày trước`, tl: (n) => `${n} araw ang nakalipas`, ht: (n) => `sa gen ${n} jou` },
  fr_dataThrough: { vi: (d) => `dữ liệu đến ${d}`, tl: (d) => `data hanggang ${d}`, ht: (d) => `done rive ${d}` },
  fr_liveCheck: { vi: (a) => `kiểm tra trực tiếp ${a}`, tl: (a) => `live check ${a}`, ht: (a) => `verifikasyon dirèk ${a}` },
  fr_liveFailed: { vi: (m) => `kiểm tra trực tiếp thất bại — ${m}`, tl: (m) => `nabigo ang live check — ${m}`, ht: (m) => `verifikasyon dirèk echwe — ${m}` },
  fr_press: { vi: (a) => `thông cáo báo chí ${a}`, tl: (a) => `mga press release ${a}`, ht: (a) => `kominike laprès ${a}` },
  fr_pressFailed: { vi: (a) => `nguồn thông cáo lỗi ${a}`, tl: (a) => `nabigo ang press-release feed ${a}`, ht: (a) => `sous kominike a echwe ${a}` },
  fr_snapshot: { vi: (a) => `từ bản lưu ${a}`, tl: (a) => `mula sa snapshot ${a}`, ht: (a) => `soti nan snapshot ${a}` },
  fr_liveFailedSnap: { vi: (a) => `kiểm tra trực tiếp thất bại — đang dùng bản lưu ${a}`, tl: (a) => `nabigo ang live check — ipinapakita ang snapshot ${a}`, ht: (a) => `verifikasyon dirèk echwe — n ap montre snapshot ${a}` },
  fr_failed: { vi: (a) => `thất bại ${a}`, tl: (a) => `nabigo ${a}`, ht: (a) => `echwe ${a}` },
  fr_showThrough: { vi: (d) => ` — đang hiển thị dữ liệu đến ${d}`, tl: (d) => ` — ipinapakita ang data hanggang ${d}`, ht: (d) => ` — n ap montre done rive ${d}` },
  fr_table: { vi: (d) => `bảng FDA đề ngày ${d}`, tl: (d) => `talaan ng FDA na may petsang ${d}`, ht: (d) => `tablo FDA ki gen dat ${d}` },
  fr_fetched: { vi: (a) => `tải lúc ${a}`, tl: (a) => `kinuha ${a}`, ht: (a) => `pran ${a}` },
  fr_stale: { vi: ' — FDA chưa cập nhật hơn 2 tuần', tl: ' — mahigit 2 linggo nang hindi ina-update ng FDA', ht: ' — FDA pa mete l ajou depi plis pase 2 semèn' },
  fr_counts: { vi: (d) => `số liệu tính đến ${d}`, tl: (d) => `bilang noong ${d}`, ht: (d) => `konte jiska ${d}` },
  fr_unavail: { vi: 'không khả dụng', tl: 'hindi available', ht: 'pa disponib' },
  fr_noSaved: { vi: 'không có dữ liệu lưu', tl: 'walang naka-save na data', ht: 'pa gen done sovgade' },
  fr_noPageDate: { vi: (a) => `tải lúc ${a} (không thấy ngày trên trang)`, tl: (a) => `kinuha ${a} (walang nakitang petsa sa page)`, ht: (a) => `pran ${a} (nou pa jwenn dat paj la)` },
  // About
  abIntro: { vi: 'Trang này đọc các thông báo thu hồi công khai của FDA và USDA và gộp những thông báo mô tả cùng một vấn đề. Trang không biết các đợt thu hồi mà cơ quan chưa công bố, và FDA có thể mất đến ba tuần để phân loại sau khi công ty bắt đầu thu hồi. Danh sách trống nghĩa là không tìm thấy gì trong dữ liệu truy cập được — không phải thức ăn của bạn an toàn.', tl: 'Binabasa ng site na ito ang mga pampublikong abiso ng recall mula sa FDA at USDA at pinagsasama ang mga naglalarawan ng iisang problema. Hindi nito alam ang mga recall na hindi pa inilalathala ng mga ahensya, at maaaring tumagal nang hanggang tatlong linggo bago ma-classify ng FDA ang recall matapos itong simulan ng kumpanya. Ang walang lamang listahan ay nangangahulugang walang nahanap sa naabot na data — hindi na ligtas ang pagkain mo.', ht: 'Sit sa a li avi rapèl piblik FDA ak USDA epi li gwoupe sa ki dekri menm pwoblèm nan. Li pa konnen rapèl ajans yo poko pibliye, epi FDA ka pran jiska twa semèn pou klase yon rapèl apre konpayi an kòmanse li. Yon lis vid vle di nou pa jwenn anyen nan done nou te ka rive jwenn — sa pa vle di manje ou an sekirite.' },
  abBlindHead: { vi: 'Điểm mù, nói một cách dễ hiểu', tl: 'Ang blind spot, sa simpleng salita', ht: 'Pwen avèg la, an mo senp' },
  abBlindBody: { vi: 'Một công ty có thể bắt đầu thu hồi hôm nay và FDA có thể mất đến ba tuần để phân loại và đưa vào cơ sở dữ liệu trang này đọc. Phần gạch chéo của thanh dưới tiêu đề là khoảng thời gian đó. Thông cáo báo chí (kênh nhanh hơn) lấp một phần khoảng trống, nhưng không phải tất cả và không phải mọi đợt thu hồi. Thông báo của USDA đến nhanh hơn nhiều, thường trong ngày.', tl: 'Maaaring magsimula ng recall ang isang kumpanya ngayon at tatagal nang hanggang tatlong linggo bago ito ma-classify at mailathala ng FDA sa database na binabasa ng site na ito. Sakop ng may guhit na dulo ng bar sa ilalim ng header ang panahong iyon. Pinupunan ng mga press release (ang mas mabilis na feed) ang bahagi ng puwang, pero hindi lahat, at hindi para sa bawat recall. Mas mabilis dumating ang mga abiso ng USDA, kadalasang sa mismong araw.', ht: 'Yon konpayi ka kòmanse yon rapèl jodi a epi FDA ka pran jiska twa semèn pou klase l epi pibliye l nan baz done sit sa a li a. Pati ak liy yo nan bout ba ki anba tèt paj la kouvri peryòd sa a. Kominike laprès yo (chanèl ki pi rapid la) bouche yon pati nan twou a, men pa tout, epi pa pou chak rapèl. Avi USDA yo rive pi vit, anjeneral menm jou a.' },
  abWordsHead: { vi: 'Ý nghĩa các từ', tl: 'Ibig sabihin ng mga salita', ht: 'Sa mo yo vle di' },
  abW_closedT: { vi: 'Đã đóng / chấm dứt', tl: 'Sarado / tapos na', ht: 'Fèmen / fini' },
  abW_closed: { vi: 'cơ quan đã hoàn tất theo dõi. Không phải tuyên bố rằng sản phẩm còn lại là an toàn.', tl: 'tapos na ang follow-up ng ahensya. Hindi ito pahayag na ligtas ang natitirang produkto.', ht: 'ajans lan fini swivi li. Sa pa di pwodwi ki rete a an sekirite.' },
  abSourcesHead: { vi: 'Trạng thái nguồn hiện tại', tl: 'Mga source ngayon', ht: 'Sous yo kounye a' },
  ab_failed: { vi: (m) => `thất bại: ${m}`, tl: (m) => `nabigo: ${m}`, ht: (m) => `echwe: ${m}` },
  ab_liveFailedSnap: { vi: (m) => `kiểm tra trực tiếp thất bại (${m}); đang dùng bản lưu`, tl: (m) => `nabigo ang live check (${m}); gumagamit ng snapshot`, ht: (m) => `verifikasyon dirèk echwe (${m}); n ap sèvi ak snapshot` },
  ab_optional: { vi: 'tùy chọn — chưa thiết lập. Chỉ dùng để bổ sung tên công ty còn thiếu; thông báo USDA hầu như luôn có sẵn.', tl: 'opsyonal — hindi naka-set up. Ginagamit lang para punan ang nawawalang pangalan ng kumpanya; halos laging kasama na ito sa mga abiso ng USDA.', ht: 'opsyonèl — li pa konfigire. Li sèvi sèlman pou ranpli non konpayi ki manke; avi USDA yo prèske toujou genyen yo deja.' },
  ab_noData: { vi: 'không có dữ liệu', tl: 'walang data', ht: 'pa gen done' },
  ab_archiveNote: { vi: (n) => `Các đợt thu hồi cũ và đã đóng trong 18 tháng qua (${n}) chỉ tải khi bạn tìm theo sản phẩm hoặc mã vạch.`, tl: (n) => `Ang mga mas luma at saradong recall sa nakaraang 18 buwan (${n}) ay nilo-load lang kapag naghanap ka ayon sa produkto o barcode.`, ht: (n) => `Rapèl ki pi ansyen ak fèmen nan 18 dènye mwa yo (${n}) chaje sèlman lè ou chèche pa pwodwi oswa kòd ba.` },
  ab_sample: { vi: 'Dữ liệu mẫu. Bản lưu này được tạo từ bản ghi thử nghiệm giả, không phải thu hồi thật.', tl: 'Sample data. Ginawa ang snapshot na ito mula sa gawa-gawang test record, hindi tunay na recall.', ht: 'Done egzanp. Snapshot sa a fèt ak dosye tès fiktif, se pa vrè rapèl.' },
  ab_review: { vi: 'Hàng đợi kiểm tra gộp nhóm tại #/review là trang dành cho người bảo trì và giữ tiếng Anh có chủ đích.', tl: 'Ang review queue sa #/review ay pahina para sa maintainer at sadyang nananatili sa Ingles.', ht: 'Keu revizyon gwoupman an nan #/review se yon paj pou moun k ap okipe sit la e li rete an angle espre.' },
  // Outbreaks page
  obHead: { vi: 'Điều tra dịch bệnh', tl: 'Mga imbestigasyon ng outbreak', ht: 'Ankèt sou epidemi' },
  obIntro: { vi: 'Bảng điều tra bệnh của FDA, được FDA cập nhật khoảng mỗi tuần.', tl: 'Ang talaan ng FDA ng mga imbestigasyon sa sakit, ina-update ng FDA nang halos lingguhan.', ht: 'Tablo FDA a sou ankèt maladi, FDA mete l ajou apeprè chak semèn.' },
  obDated: { vi: (d) => `Bản này FDA đề ngày ${d}`, tl: (d) => `Ang kopyang ito ay may petsang ${d} mula sa FDA`, ht: (d) => `FDA date kopi sa a ${d}` },
  obFetchFailed: { vi: (m) => `Lần tải gần nhất thất bại (${m}); đang hiển thị bản trước.`, tl: (m) => `Nabigo ang huling pagkuha (${m}); ipinapakita ang naunang kopya.`, ht: (m) => `Dènye chajman an echwe (${m}); n ap montre kopi anvan an.` },
  obLive: { vi: 'Xem bảng trực tiếp của FDA (tiếng Anh)', tl: 'Tingnan ang live na talaan ng FDA (Ingles)', ht: 'Gade tablo dirèk FDA a (an angle)' },
  obCdc: { vi: (list, d) => `CDC đếm riêng các cuộc điều tra liên bang đang diễn ra: ${list} (tính đến ${d}).`, tl: (list, d) => `Hiwalay na binibilang ng CDC ang mga aktibong multistate na imbestigasyon: ${list} (noong ${d}).`, ht: (list, d) => `CDC konte apa ankèt miltieta ki aktif yo: ${list} (jiska ${d}).` },
  obNone: { vi: 'Không có cuộc điều tra nào trong dữ liệu truy cập được. Nếu nguồn dịch bệnh FDA bị lỗi (xem trạng thái), danh sách này đang thiếu, không phải trống.', tl: 'Walang imbestigasyon sa naabot na data. Kung nabigo ang outbreak source ng FDA (tingnan ang status), kulang ang listahang ito, hindi walang laman.', ht: 'Pa gen ankèt nan done nou te ka jwenn yo. Si sous epidemi FDA a echwe (gade estati a), lis sa a manke enfòmasyon, li pa vid.' },
  obActive: { vi: (n) => `Đang diễn ra (${n})`, tl: (n) => `Aktibo (${n})`, ht: (n) => `Aktif (${n})` },
  obClosed: { vi: (n) => `Đã đóng hoặc không hoạt động (${n})`, tl: (n) => `Sarado o hindi aktibo (${n})`, ht: (n) => `Fèmen oswa inaktif (${n})` },
  obNotYet: { vi: 'Chưa xác định sản phẩm', tl: 'Hindi pa natutukoy ang produkto', ht: 'Pwodwi a poko idantifye' },
  obSick: { vi: (n) => `${n} người bệnh`, tl: (n) => `${n} ang nagkasakit`, ht: (n) => `${n} moun malad` },
  obHosp: { vi: (n) => `${n} nhập viện`, tl: (n) => `${n} na-ospital`, ht: (n) => `${n} entène lopital` },
  obDied: { vi: (n) => `${n} tử vong`, tl: (n) => `${n} namatay`, ht: (n) => `${n} mouri` },
  obSeeAdv: { vi: 'số ca — xem khuyến cáo', tl: 'bilang ng kaso — tingnan ang advisory', ht: 'kantite ka — gade avi a' },
  obConnected: { vi: 'Các thu hồi chúng tôi đã liên kết:', tl: 'Mga recall na ikinabit namin:', ht: 'Rapèl nou konekte yo:' },
  obAdvisory: { vi: 'Khuyến cáo của FDA về dịch này (tiếng Anh)', tl: 'Advisory ng FDA para sa outbreak na ito (Ingles)', ht: 'Avi FDA pou epidemi sa a (an angle)' },
  obNoAdvisory: { vi: 'Chưa có khuyến cáo — FDA chưa xác định sản phẩm hoặc đưa lời khuyên cho người tiêu dùng.', tl: 'Wala pang advisory — hindi pa natutukoy ng FDA ang produkto o nagbibigay ng payo sa consumer.', ht: 'Poko gen avi — FDA poko idantifye yon pwodwi ni bay konsèy pou konsomatè.' },
  obOurs: { vi: 'Việc liên kết thu hồi là của chúng tôi, dựa trên trùng khớp vi khuẩn và thực phẩm. FDA chưa chắc đã gắn các thu hồi đó với cuộc điều tra.', tl: 'Sa amin ang pag-uugnay ng mga recall, batay sa pagtutugma ng mikrobyo at pagkain. Hindi pa tiyak na iniugnay ng FDA ang mga recall na iyon sa imbestigasyon.', ht: 'Se nou menm ki fè koneksyon rapèl yo, sou baz menm mikwòb ak menm manje. FDA pa nesesèman mete rapèl sa yo ansanm ak ankèt la.' },
  col_date: { vi: 'Ngày đăng', tl: 'Petsa ng paglalathala', ht: 'Dat piblikasyon' },
  col_cases: { vi: 'Tổng số ca', tl: 'Kabuuang bilang ng kaso', ht: 'Total ka' },
  col_invstatus: { vi: 'Trạng thái điều tra', tl: 'Status ng imbestigasyon', ht: 'Estati ankèt la' },
  col_eventstatus: { vi: 'Trạng thái dịch/sự kiện', tl: 'Status ng outbreak/pangyayari', ht: 'Estati epidemi/evènman' },
  col_recall: { vi: 'Đã khởi động thu hồi', tl: 'Sinimulan ang recall', ht: 'Rapèl kòmanse' },
  col_traceback: { vi: 'Đã khởi động truy xuất', tl: 'Sinimulan ang traceback', ht: 'Trase kòmanse' },
  col_inspection: { vi: 'Đã khởi động thanh tra', tl: 'Sinimulan ang inspeksyon', ht: 'Enspeksyon kòmanse' },
  col_sampling: { vi: 'Đã khởi động lấy mẫu', tl: 'Sinimulan ang sampling', ht: 'Echantiyonaj kòmanse' },
  col_advisory: { vi: 'Khuyến cáo dịch bệnh', tl: 'Advisory ng outbreak', ht: 'Avi epidemi' },
  val_active: { vi: 'Đang diễn ra', tl: 'Aktibo', ht: 'Aktif' },
  val_ended: { vi: 'Đã kết thúc', tl: 'Tapos na', ht: 'Fini' },
  val_ongoing: { vi: 'Đang tiếp diễn', tl: 'Patuloy', ht: 'Ap kontinye' },
  val_seeadv: { vi: 'Xem khuyến cáo', tl: 'Tingnan ang advisory', ht: 'Gade avi a' },
  val_initiated: { vi: 'Đã bắt đầu', tl: 'Sinimulan na', ht: 'Kòmanse' },
  val_notyet: { vi: 'Chưa bắt đầu', tl: 'Hindi pa sinisimulan', ht: 'Poko kòmanse' },
  val_yes: { vi: 'Có', tl: 'Oo', ht: 'Wi' },
  val_no: { vi: 'Không', tl: 'Hindi', ht: 'Non' },
  val_completed: { vi: 'Hoàn tất', tl: 'Tapos na', ht: 'Konplete' },
  cmpHead: { vi: 'Số liệu CDC so với bảng FDA', tl: 'Bilang ng CDC kumpara sa talaan ng FDA', ht: 'Konte CDC parapò ak tablo FDA' },
  cmpIntro: { vi: 'CDC đếm các cuộc điều tra bệnh liên bang đang diễn ra theo từng vi khuẩn; bảng FDA liệt kê các cuộc điều tra FDA phụ trách. Số của CDC có thể cao hơn vì gồm cả điều tra do cơ quan khác dẫn dắt (ví dụ thực phẩm thuộc USDA).', tl: 'Binibilang ng CDC ang mga aktibong multistate na imbestigasyon sa sakit bawat mikrobyo; nakalista sa talaan ng FDA ang mga imbestigasyong hawak ng FDA. Maaaring mas mataas ang bilang ng CDC dahil kasama nito ang mga imbestigasyong pinamumunuan ng ibang ahensya (halimbawa, mga pagkaing sakop ng USDA).', ht: 'CDC konte ankèt maladi miltieta ki aktif pou chak mikwòb; tablo FDA a bay ankèt FDA ap mennen yo. Chif CDC a ka pi wo paske li gen ladan ankèt lòt ajans ap dirije (pa egzanp manje ki anba USDA).' },
  cmpRow: { vi: (cdc, fda) => `CDC đếm ${cdc} · ${fda} trong bảng FDA`, tl: (cdc, fda) => `${cdc} sa bilang ng CDC · ${fda} sa talaan ng FDA`, ht: (cdc, fda) => `CDC konte ${cdc} · ${fda} nan tablo FDA a` },
  cmpAsOf: { vi: (d) => `Số liệu CDC tính đến ${d}.`, tl: (d) => `Bilang ng CDC noong ${d}.`, ht: (d) => `Konte CDC jiska ${d}.` },
  cmpLink: { vi: 'Danh sách dịch bệnh của CDC (tiếng Anh)', tl: 'Listahan ng outbreak ng CDC (Ingles)', ht: 'Lis epidemi CDC (an angle)' },
  aaHead: { vi: 'Tất cả đang hiệu lực', tl: 'Lahat ng aktibo', ht: 'Tout sa ki aktif' },
  aaSub: { vi: (n, m) => `Toàn bộ ${n} đợt thu hồi chưa đóng trong ${m} tháng qua, không thu gọn gì.`, tl: (n, m) => `Lahat ng ${n} bukas na recall sa nakaraang ${m} buwan, walang nakatiklop.`, ht: (n, m) => `Tout ${n} rapèl louvri nan ${m} dènye mwa yo, anyen pa pliye.` },
  aaFilters: { vi: 'Bộ lọc từ trang chính vẫn sắp xếp danh sách này; chúng không bao giờ xóa gì.', tl: 'Inaayos pa rin ng mga filter mo mula sa home page ang listahang ito; wala silang tinatanggal.', ht: 'Filtè ou yo sou paj dakèy la toujou klase lis sa a; yo pa janm retire anyen.' },
  aaSortSerious: { vi: 'Nghiêm trọng nhất trước', tl: 'Pinakaseryoso muna', ht: 'Pi grav anvan' },
  aaSortNewest: { vi: 'Mới nhất trước', tl: 'Pinakabago muna', ht: 'Pi resan anvan' },
  aaSort: { vi: 'Thứ tự sắp xếp', tl: 'Pagkakaayos', ht: 'Lòd triyaj' },
  scanFound: { vi: (d) => `Đã đọc mã vạch: ${d}`, tl: (d) => `Nabasa ang barcode: ${d}`, ht: (d) => `Kòd ba li: ${d}` },
  fromNoticeEs: { vi: 'Trích từ thông báo tiếng Tây Ban Nha chính thức của USDA', tl: 'Mula sa opisyal na abisong Espanyol ng USDA', ht: 'Soti nan avi ofisyèl USDA an panyòl' },
};
for (const [k, v] of Object.entries(EXTRA2)) if (STR[k]) Object.assign(STR[k], v);

/** Coverage report for tests: which STR keys lack a value for each language. */
export function i18nCoverage() {
  const out = {};
  for (const { code } of LANGS) {
    out[code] = Object.entries(STR).filter(([, v]) => v[code] === undefined).map(([k]) => k);
  }
  return out;
}

export function agentLabel(lang, agent) {
  if (!agent) return null;
  if (AGENTS[agent]) return AGENTS[agent][lang] ?? AGENTS[agent].en;
  return agent;
}

export function t(lang) {
  return new Proxy({}, {
    get(_, key) {
      const entry = STR[key];
      if (!entry) return key;
      return entry[lang] ?? entry.en;
    },
  });
}

// Incident-title parts. Firm names render as-is; everything else localizes.
const AGENTS = {
  listeria: { en: 'Listeria', es: 'Listeria', ko: '리스테리아', zh: '李斯特菌' },
  salmonella: { en: 'Salmonella', es: 'Salmonela', ko: '살모넬라', zh: '沙门氏菌' },
  e_coli: { en: 'E. coli', es: 'E. coli', ko: '대장균(E. coli)', zh: '大肠杆菌' },
  botulism: { en: 'Botulism risk', es: 'Riesgo de botulismo', ko: '보툴리누스 위험', zh: '肉毒杆菌风险' },
  hepatitis_a: { en: 'Hepatitis A', es: 'Hepatitis A', ko: 'A형 간염', zh: '甲型肝炎' },
  norovirus: { en: 'Norovirus', es: 'Norovirus', ko: '노로바이러스', zh: '诺如病毒' },
  cyclospora: { en: 'Cyclospora', es: 'Cyclospora', ko: '시클로스포라', zh: '环孢子虫' },
  cronobacter: { en: 'Cronobacter', es: 'Cronobacter', ko: '크로노박터', zh: '克罗诺杆菌' },
  clostridium: { en: 'Clostridium', es: 'Clostridium', ko: '클로스트리듐', zh: '梭菌' },
  shigella: { en: 'Shigella', es: 'Shigella', ko: '이질균', zh: '志贺氏菌' },
  staph: { en: 'Staph', es: 'Estafilococo', ko: '포도상구균', zh: '葡萄球菌' },
  vibrio: { en: 'Vibrio', es: 'Vibrio', ko: '비브리오', zh: '弧菌' },
  foreign_material: { en: 'Foreign material', es: 'Material extraño', ko: '이물질', zh: '异物' },
  chemical: { en: 'Chemical contamination', es: 'Contaminación química', ko: '화학물질 오염', zh: '化学污染' },
  labeling: { en: 'Labeling error', es: 'Error de etiquetado', ko: '표시사항 오류', zh: '标签错误' },
  uninspected: { en: 'Uninspected product', es: 'Producto sin inspección', ko: '미검사 제품', zh: '未经检验的产品' },
  processing_defect: { en: 'Processing problem', es: 'Problema de procesamiento', ko: '가공 공정 문제', zh: '加工问题' },
  unfit: { en: 'Unfit to eat', es: 'No apto para el consumo', ko: '섭취 부적합', zh: '不宜食用' },
};
const ALLERGEN_I18N = {
  milk: { en: 'milk', es: 'leche', ko: '우유', zh: '牛奶' },
  eggs: { en: 'eggs', es: 'huevo', ko: '계란', zh: '鸡蛋' },
  peanuts: { en: 'peanuts', es: 'cacahuate', ko: '땅콩', zh: '花生' },
  'tree nuts': { en: 'tree nuts', es: 'frutos secos', ko: '견과류', zh: '坚果' },
  wheat: { en: 'wheat', es: 'trigo', ko: '밀', zh: '小麦' },
  soy: { en: 'soy', es: 'soya', ko: '대두', zh: '大豆' },
  fish: { en: 'fish', es: 'pescado', ko: '생선', zh: '鱼类' },
  shellfish: { en: 'shellfish', es: 'mariscos', ko: '갑각류·조개류', zh: '贝类' },
  sesame: { en: 'sesame', es: 'ajonjolí', ko: '참깨', zh: '芝麻' },
  sulfites: { en: 'sulfites', es: 'sulfitos', ko: '아황산염', zh: '亚硫酸盐' },
  mustard: { en: 'mustard', es: 'mostaza', ko: '겨자', zh: '芥末' },
  'the undeclared ingredient': { en: 'an ingredient', es: 'un ingrediente', ko: '성분', zh: '成分' },
};
const UNDECLARED = { en: (a) => `Undeclared ${a}`, es: (a) => `${cap(a)} no declarado`, ko: (a) => `${a} 미표시`, zh: (a) => `未申报${a}` };
const CATS = {
  leafy_greens: { en: 'leafy greens', es: 'verduras de hoja', ko: '잎채소', zh: '叶菜' },
  produce: { en: 'produce', es: 'frutas y verduras', ko: '농산물', zh: '果蔬' },
  deli_meat: { en: 'deli meat', es: 'carnes frías', ko: '델리 육류', zh: '熟食肉' },
  meat_poultry: { en: 'meat & poultry', es: 'carne y aves', ko: '육류·가금류', zh: '肉禽' },
  seafood: { en: 'seafood', es: 'mariscos y pescado', ko: '수산물', zh: '海鲜' },
  dairy: { en: 'dairy', es: 'lácteos', ko: '유제품', zh: '乳制品' },
  eggs: { en: 'eggs', es: 'huevos', ko: '달걀', zh: '蛋类' },
  infant: { en: 'baby & infant food', es: 'alimentos para bebés', ko: '영유아 식품', zh: '婴幼儿食品' },
  frozen: { en: 'frozen food', es: 'alimentos congelados', ko: '냉동식품', zh: '冷冻食品' },
  bakery: { en: 'baked goods', es: 'panadería', ko: '베이커리', zh: '烘焙食品' },
  snacks: { en: 'snacks', es: 'botanas', ko: '스낵', zh: '零食' },
  packaged: { en: 'packaged food', es: 'alimentos envasados', ko: '가공식품', zh: '包装食品' },
  beverage: { en: 'drinks', es: 'bebidas', ko: '음료', zh: '饮品' },
  supplement: { en: 'supplements', es: 'suplementos', ko: '보충제', zh: '补充剂' },
  several: { en: 'several foods', es: 'varios alimentos', ko: '여러 식품', zh: '多种食品' },
  other: { en: 'food', es: 'alimentos', ko: '식품', zh: '食品' },
};
const WHO = {
  multiple: { en: 'multiple brands', es: 'varias marcas', ko: '여러 브랜드', zh: '多个品牌' },
  pha: { en: 'USDA public health alert', es: 'alerta de salud pública del USDA', ko: 'USDA 공중보건 경보', zh: 'USDA 公共健康警报' },
  unknown: { en: 'company not named', es: 'empresa no indicada', ko: '업체명 미상', zh: '未注明公司' },
};
const PATTERN = {
  en: (agent, cat, who) => `${agent} in ${cat} — ${who}`,
  es: (agent, cat, who) => `${agent} en ${cat} — ${who}`,
  ko: (agent, cat, who) => `${cat} ${agent} — ${who}`,
  zh: (agent, cat, who) => `${cat}中的${agent} — ${who}`,
  vi: (agent, cat, who) => `${agent} trong ${cat} — ${who}`,
  tl: (agent, cat, who) => `${agent} sa ${cat} — ${who}`,
  ht: (agent, cat, who) => `${agent} nan ${cat} — ${who}`,
};
// vi/tl/ht labels for generated titles; pathogen proper names stay Latin.
const T3 = {
  AGENTS: { botulism: { vi: 'Nguy cơ botulism', tl: 'Panganib ng botulism', ht: 'Risk botilis' }, foreign_material: { vi: 'Tạp chất lạ', tl: 'Banyagang bagay', ht: 'Kò etranje' }, chemical: { vi: 'Nhiễm hóa chất', tl: 'Kontaminasyon ng kemikal', ht: 'Kontaminasyon chimik' }, labeling: { vi: 'Lỗi nhãn mác', tl: 'Mali sa label', ht: 'Erè etikèt' }, uninspected: { vi: 'Sản phẩm chưa kiểm định', tl: 'Hindi na-inspeksyon na produkto', ht: 'Pwodwi san enspeksyon' }, processing_defect: { vi: 'Lỗi chế biến', tl: 'Problema sa proseso', ht: 'Pwoblèm nan fabrikasyon' }, unfit: { vi: 'Không an toàn để ăn', tl: 'Hindi ligtas kainin', ht: 'Pa bon pou manje' } },
  CATS: { leafy_greens: { vi: 'rau lá', tl: 'madahong gulay', ht: 'legim fèy' }, produce: { vi: 'rau quả', tl: 'prutas at gulay', ht: 'fwi ak legim' }, deli_meat: { vi: 'thịt nguội', tl: 'deli meat', ht: 'vyann deli' }, meat_poultry: { vi: 'thịt và gia cầm', tl: 'karne at manok', ht: 'vyann ak bèt volay' }, seafood: { vi: 'hải sản', tl: 'pagkaing-dagat', ht: 'fwidmè' }, dairy: { vi: 'sản phẩm sữa', tl: 'produktong gatas', ht: 'pwodwi lèt' }, eggs: { vi: 'trứng', tl: 'itlog', ht: 'ze' }, infant: { vi: 'thực phẩm cho trẻ nhỏ', tl: 'pagkain ng sanggol', ht: 'manje pou tibebe' }, frozen: { vi: 'thực phẩm đông lạnh', tl: 'frozen na pagkain', ht: 'manje konjle' }, bakery: { vi: 'bánh nướng', tl: 'tinapay at pastry', ht: 'pen ak patisri' }, snacks: { vi: 'đồ ăn vặt', tl: 'meryenda', ht: 'ti goute' }, packaged: { vi: 'thực phẩm đóng gói', tl: 'nakapaketeng pagkain', ht: 'manje anbale' }, beverage: { vi: 'đồ uống', tl: 'inumin', ht: 'bwason' }, supplement: { vi: 'thực phẩm chức năng', tl: 'supplement', ht: 'siplemen' }, several: { vi: 'nhiều loại thực phẩm', tl: 'ilang pagkain', ht: 'plizyè manje' }, other: { vi: 'thực phẩm', tl: 'pagkain', ht: 'manje' } },
  WHO: { multiple: { vi: 'nhiều nhãn hiệu', tl: 'maraming brand', ht: 'plizyè mak' }, pha: { vi: 'cảnh báo y tế công cộng của USDA', tl: 'public health alert ng USDA', ht: 'alèt sante piblik USDA' }, unknown: { vi: 'chưa nêu tên công ty', tl: 'walang pinangalanang kumpanya', ht: 'konpayi pa nonmen' } },
  ALLERGENS: { milk: { vi: 'sữa', tl: 'gatas', ht: 'lèt' }, eggs: { vi: 'trứng', tl: 'itlog', ht: 'ze' }, peanuts: { vi: 'đậu phộng', tl: 'mani', ht: 'pistach' }, 'tree nuts': { vi: 'hạt cây', tl: 'nuts', ht: 'nwa' }, wheat: { vi: 'lúa mì', tl: 'trigo', ht: 'ble' }, soy: { vi: 'đậu nành', tl: 'soy', ht: 'swa' }, fish: { vi: 'cá', tl: 'isda', ht: 'pwason' }, shellfish: { vi: 'hải sản có vỏ', tl: 'shellfish', ht: 'fwidmè ak koki' }, sesame: { vi: 'mè', tl: 'linga', ht: 'wowoli' }, sulfites: { vi: 'sulfite', tl: 'sulfites', ht: 'silfit' }, mustard: { vi: 'mù tạt', tl: 'mustasa', ht: 'moutad' }, 'the undeclared ingredient': { vi: 'một thành phần', tl: 'isang sangkap', ht: 'yon engredyan' } },
};
for (const [k, v] of Object.entries(T3.AGENTS)) Object.assign(AGENTS[k] || {}, v);
for (const [k, v] of Object.entries(T3.CATS)) Object.assign(CATS[k] || {}, v);
for (const [k, v] of Object.entries(T3.WHO)) Object.assign(WHO[k] || {}, v);
for (const [k, v] of Object.entries(T3.ALLERGENS)) Object.assign(ALLERGEN_I18N[k] || {}, v);
Object.assign(UNDECLARED, { vi: (a) => `Không khai báo ${a}`, tl: (a) => `Hindi idineklarang ${a}`, ht: (a) => `${cap(a)} pa deklare` });
function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
const pick = (table, key, lang) => (table[key] ? (table[key][lang] ?? table[key].en) : key);

/** Assemble an incident title in the given language from titleParts; falls back to the stored
 *  English title for snapshots built before titleParts existed. */
/** Korean particle by final consonant of the last Hangul syllable; hedged form for non-Hangul. */
function koParticle(word, withFinal, withoutFinal) {
  const ch = String(word || '').trim().slice(-1);
  const code = ch.charCodeAt(0);
  if (code >= 0xac00 && code <= 0xd7a3) return (code - 0xac00) % 28 === 0 ? withoutFinal : withFinal;
  return `${withFinal}(${withoutFinal})`;
}

const ALLERGEN_KEY = { milk: 'milk', egg: 'eggs', peanut: 'peanuts', tree_nut: 'tree nuts', wheat: 'wheat', soy: 'soy', fish: 'fish', shellfish: 'shellfish', sesame: 'sesame', sulfites: 'sulfites', mustard: 'mustard', unknown: 'the undeclared ingredient' };

/**
 * One plain sentence per incident — the first thing on a card. Built from the same titleParts
 * as the localized title, plus scope and severity. Every template avoids verb agreement with the
 * food noun (modals, past tense, or colon forms) so "baked goods" and "deli meat" both read right.
 * kind: 'pathogen' | 'allergen' | 'foreign' | 'chemical' | 'labeling' | 'uninspected' | 'unfit' | 'other'
 */
export function plainSentenceFor(lang, inc, stateLabel) {
  const parts = inc.titleParts;
  if (!parts) return null;
  const food = pick(CATS, parts.category || 'other', lang);
  const sev = inc.severity;
  const serious = sev === 'class_1' || sev === 'alert';
  const mild = sev === 'class_2';
  const t = parts.hazardType;
  const kind = t === 'pathogen' ? 'pathogen' : t === 'allergen' ? 'allergen' : t === 'foreign_material' ? 'foreign' : t === 'chemical' ? 'chemical'
    : t === 'labeling' ? 'labeling' : t === 'uninspected' ? 'uninspected' : (t === 'processing' || t === 'other') && parts.agent === 'unfit' ? 'unfit' : 'other';
  let allergen = '';
  if (kind === 'allergen') {
    const keys = parts.allergens?.length ? parts.allergens : [String(parts.agent || '').replace('undeclared_', '')];
    const names = keys.map((k) => pick(ALLERGEN_I18N, ALLERGEN_KEY[k] || k, lang));
    const joiner = { en: ' and ', es: ' y ', ko: '·', zh: '和', vi: ' và ', tl: ' at ', ht: ' ak ' }[lang] || ' and ';
    allergen = names.join(joiner);
  }
  const scope = inc.scope;
  const n = (inc.statesUnion || []).length;
  const st = stateLabel || (inc.statesUnion || [])[0] || '';
  const F = cap(food);
  const L = {
    en: () => {
      const sc = scope === 'nationwide' ? ' sold nationwide' : scope === 'single_state' ? ` sold in ${st}` : scope === 'multi_state' ? ` sold in ${n} states` : '';
      const h = kind === 'pathogen' ? (serious ? 'could make you seriously sick' : mild ? 'could make you sick' : 'may carry germs')
        : kind === 'allergen' ? `may contain ${allergen} not listed on the label`
        : kind === 'foreign' ? 'may contain pieces of metal, plastic, or other material'
        : kind === 'chemical' ? 'may be contaminated with a chemical'
        : kind === 'labeling' ? 'may have a labeling or packaging problem'
        : kind === 'uninspected' ? 'did not get the required safety inspection'
        : kind === 'unfit' ? 'may not be safe to eat'
        : serious ? 'could make you seriously sick' : mild ? 'could make you sick' : null;
      return h ? `${F}${sc} ${h}.` : `Recall: ${food}${sc}.`;
    },
    es: () => {
      // "Comer X podría…" keeps the verb singular whatever the food noun is; note-forms use a colon.
      const sc = scope === 'nationwide' ? ' a la venta en todo el país' : scope === 'single_state' ? ` a la venta en ${st}` : scope === 'multi_state' ? ` a la venta en ${n} estados` : '';
      if (kind === 'pathogen' || (kind === 'other' && (serious || mild))) return `Comer ${food}${sc} ${serious ? 'podría enfermarle gravemente' : mild ? 'podría enfermarle' : 'podría exponerle a gérmenes'}.`;
      const h = kind === 'allergen' ? `puede contener ${allergen} que no aparece en la etiqueta`
        : kind === 'foreign' ? 'puede contener trozos de metal, plástico u otro material'
        : kind === 'chemical' ? 'puede tener contaminación química'
        : kind === 'labeling' ? 'puede tener un problema de etiquetado o envase'
        : kind === 'uninspected' ? 'no recibió la inspección de seguridad requerida'
        : kind === 'unfit' ? 'puede no ser seguro para comer' : null;
      return h ? `${F}${sc}: ${h}.` : `Retiro del mercado: ${food}${sc}.`;
    },
    ko: () => {
      const sc = scope === 'nationwide' ? '전국에서 판매된 ' : scope === 'single_state' ? `${st}에서 판매된 ` : scope === 'multi_state' ? `${n}개 주에서 판매된 ` : '';
      const h = kind === 'pathogen' ? (serious ? '심각한 질병을 일으킬 수 있습니다' : mild ? '병을 일으킬 수 있습니다' : '세균이 있을 수 있습니다')
        : kind === 'allergen' ? `라벨에 표시되지 않은 ${allergen}${koParticle(allergen, '이', '가')} 들어 있을 수 있습니다`
        : kind === 'foreign' ? '금속, 플라스틱 등 이물질이 들어 있을 수 있습니다'
        : kind === 'chemical' ? '화학물질에 오염되었을 수 있습니다'
        : kind === 'labeling' ? '라벨 또는 포장에 문제가 있을 수 있습니다'
        : kind === 'uninspected' ? '필요한 안전 검사를 받지 않았습니다'
        : kind === 'unfit' ? '먹기에 안전하지 않을 수 있습니다'
        : serious ? '심각한 질병을 일으킬 수 있습니다' : mild ? '병을 일으킬 수 있습니다' : '리콜되었습니다';
      return `${sc}${food}${koParticle(food, '은', '는')} ${h}.`;
    },
    zh: () => {
      const sc = scope === 'nationwide' ? '全国销售的' : scope === 'single_state' ? `在${st}销售的` : scope === 'multi_state' ? `在${n}个州销售的` : '';
      const h = kind === 'pathogen' ? (serious ? '可能导致严重疾病' : mild ? '可能让您生病' : '可能带有细菌')
        : kind === 'allergen' ? `可能含有标签上未注明的${allergen}`
        : kind === 'foreign' ? '可能含有金属、塑料或其他异物'
        : kind === 'chemical' ? '可能受到化学物质污染'
        : kind === 'labeling' ? '可能存在标签或包装问题'
        : kind === 'uninspected' ? '未经过必要的安全检验'
        : kind === 'unfit' ? '可能不宜食用'
        : serious ? '可能导致严重疾病' : mild ? '可能让您生病' : '已被召回';
      return `${sc}${food}${h}。`;
    },
    vi: () => {
      const sc = scope === 'nationwide' ? ' bán trên toàn quốc' : scope === 'single_state' ? ` bán ở ${st}` : scope === 'multi_state' ? ` bán ở ${n} tiểu bang` : '';
      const h = kind === 'pathogen' ? (serious ? 'có thể gây bệnh nặng' : mild ? 'có thể gây bệnh' : 'có thể nhiễm vi khuẩn')
        : kind === 'allergen' ? `có thể chứa ${allergen} không ghi trên nhãn`
        : kind === 'foreign' ? 'có thể lẫn mảnh kim loại, nhựa hoặc vật lạ'
        : kind === 'chemical' ? 'có thể nhiễm hóa chất'
        : kind === 'labeling' ? 'có thể có vấn đề về nhãn hoặc bao bì'
        : kind === 'uninspected' ? 'chưa được kiểm định an toàn theo quy định'
        : kind === 'unfit' ? 'có thể không an toàn để ăn'
        : serious ? 'có thể gây bệnh nặng' : mild ? 'có thể gây bệnh' : 'đã bị thu hồi';
      return `${F}${sc} ${h}.`;
    },
    tl: () => {
      const sc = scope === 'nationwide' ? ' na ibinenta sa buong bansa' : scope === 'single_state' ? ` na ibinenta sa ${st}` : scope === 'multi_state' ? ` na ibinenta sa ${n} estado` : '';
      const h = kind === 'pathogen' ? (serious ? 'maaaring magdulot ng malubhang sakit' : mild ? 'maaaring magpasakit' : 'maaaring may mikrobyo')
        : kind === 'allergen' ? `maaaring may ${allergen} na wala sa label`
        : kind === 'foreign' ? 'maaaring may piraso ng metal, plastik, o ibang bagay'
        : kind === 'chemical' ? 'maaaring kontaminado ng kemikal'
        : kind === 'labeling' ? 'maaaring may problema sa label o pakete'
        : kind === 'uninspected' ? 'hindi dumaan sa kinakailangang inspeksyon'
        : kind === 'unfit' ? 'maaaring hindi ligtas kainin'
        : serious ? 'maaaring magdulot ng malubhang sakit' : mild ? 'maaaring magpasakit' : 'nire-recall';
      return `${F}${sc} ay ${h}.`;
    },
    ht: () => {
      const sc = scope === 'nationwide' ? ' yo vann nan tout peyi a' : scope === 'single_state' ? ` yo vann nan ${st}` : scope === 'multi_state' ? ` yo vann nan ${n} eta` : '';
      const h = kind === 'pathogen' ? (serious ? 'ka fè ou malad grav' : mild ? 'ka fè ou malad' : 'ka gen mikwòb')
        : kind === 'allergen' ? `ka gen ${allergen} ladan l ki pa sou etikèt la`
        : kind === 'foreign' ? 'ka gen moso metal, plastik oswa lòt bagay ladan l'
        : kind === 'chemical' ? 'ka kontamine ak yon pwodwi chimik'
        : kind === 'labeling' ? 'ka gen yon pwoblèm etikèt oswa anbalaj'
        : kind === 'uninspected' ? 'pa t jwenn enspeksyon sekirite ki nesesè a'
        : kind === 'unfit' ? 'ka pa bon pou manje'
        : serious ? 'ka fè ou malad grav' : mild ? 'ka fè ou malad' : 'rele tounen';
      return `${F}${sc} ${h}.`;
    },
  };
  return (L[lang] || L.en)();
}

export function incidentTitleFor(lang, parts, fallback) {
  if (!parts) return fallback;
  let agent;
  if (parts.agent && parts.agent.startsWith('undeclared_')) {
    const keys = (parts.allergens?.length ? parts.allergens : [parts.agent.slice('undeclared_'.length)]);
    const names = keys.map((k) => {
      const label = ALLERGEN_KEY[k] || k;
      return pick(ALLERGEN_I18N, label, lang);
    });
    const joiner = { en: ' and ', es: ' y ', ko: '·', zh: '和' }[lang] || ' and ';
    agent = (UNDECLARED[lang] || UNDECLARED.en)(names.join(joiner));
  } else if (parts.agent) {
    agent = pick(AGENTS, parts.agent, lang);
  } else {
    agent = { en: 'Unread hazard', es: 'Riesgo sin clasificar', ko: '미확인 위해요소', zh: '未识别的危害' }[lang] || 'Unread hazard';
  }
  const cat = pick(CATS, parts.category || 'other', lang);
  const who = parts.whoKind === 'firm' && parts.who ? parts.who : pick(WHO, parts.whoKind || 'unknown', lang);
  return (PATTERN[lang] || PATTERN.en)(agent, cat, who);
}

export function langTag(lang) { return (LANGS.find((l) => l.code === lang) || LANGS[0]).tag; }
