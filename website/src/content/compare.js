/**
 * Comparison page content — all seven product locales.
 */
export const COMPARE_PAGE_COPY = {
  en: {
    title: 'How Compresso Compares',
    metaTitle: 'Compresso vs TinyPNG, Squoosh, compressorjs & More',
    metaDescription:
      'Feature comparison of Compresso against browser and server-side image compressors. HEIC input, AVIF output, never-bigger guarantee, 3.6 KB bundle, zero upload.',
    intro:
      'Compresso occupies a unique intersection: free, browser-native, private (zero upload), with HEIC input and a 3.6 KB embeddable library. This table compares the facts.',
    whenNotTitle: 'When not to use Compresso',
    whenNotBody:
      'For server-side batch processing use sharp; for pixel-level editing use Jimp; for highest-quality downscale-only use pica. Compresso optimizes user-selected images in the browser before upload.',
    appLink: 'Try the free app',
    npmLink: 'Install compresso.js',
  },
  es: {
    title: 'Cómo se compara Compresso',
    metaTitle: 'Compresso vs TinyPNG, Squoosh, compressorjs y más',
    metaDescription:
      'Comparación de Compresso con compresores en navegador y en servidor. Entrada HEIC, salida AVIF, garantía never-bigger, paquete de 3,6 KB, cero subida.',
    intro:
      'Compresso ocupa un cruce único: gratis, nativo del navegador, privado (cero subida), con entrada HEIC y una librería integrable de 3,6 KB.',
    whenNotTitle: 'Cuándo no usar Compresso',
    whenNotBody:
      'Para procesamiento por lotes en servidor usa sharp; para edición a nivel de píxel Jimp; para solo reducir con máxima calidad pica. Compresso optimiza imágenes elegidas por el usuario en el navegador antes de subirlas.',
    appLink: 'Probar la app gratis',
    npmLink: 'Instalar compresso.js',
  },
  fr: {
    title: 'Comment Compresso se compare',
    metaTitle: 'Compresso vs TinyPNG, Squoosh, compressorjs et autres',
    metaDescription:
      'Comparaison de Compresso avec les compresseurs navigateur et serveur. Entrée HEIC, sortie AVIF, garantie never-bigger, bundle 3,6 Ko, zéro envoi.',
    intro:
      'Compresso occupe une intersection unique : gratuit, natif navigateur, privé (zéro envoi), entrée HEIC et bibliothèque intégrable de 3,6 Ko.',
    whenNotTitle: 'Quand ne pas utiliser Compresso',
    whenNotBody:
      'Pour le traitement serveur par lots utilisez sharp ; pour l’édition pixel par pixel Jimp ; pour un downscale de très haute qualité pica. Compresso optimise les images choisies par l’utilisateur dans le navigateur avant envoi.',
    appLink: 'Essayer l’app gratuite',
    npmLink: 'Installer compresso.js',
  },
  de: {
    title: 'Compresso im Vergleich',
    metaTitle: 'Compresso vs TinyPNG, Squoosh, compressorjs & mehr',
    metaDescription:
      'Funktionsvergleich von Compresso mit Browser- und Server-Kompressoren. HEIC-Eingabe, AVIF-Ausgabe, Never-bigger-Garantie, 3,6-KB-Bundle, kein Upload.',
    intro:
      'Compresso besetzt eine einzigartige Schnittmenge: kostenlos, browsernativ, privat (null Upload), HEIC-Eingabe und 3,6-KB-Einbettungsbibliothek.',
    whenNotTitle: 'Wann Compresso nicht nutzen',
    whenNotBody:
      'Für serverseitige Stapelverarbeitung sharp; für Pixelbearbeitung Jimp; für rein hochwertiges Downscaling pica. Compresso optimiert vom Nutzer gewählte Bilder im Browser vor dem Upload.',
    appLink: 'Kostenlose App testen',
    npmLink: 'compresso.js installieren',
  },
  it: {
    title: 'Come si confronta Compresso',
    metaTitle: 'Compresso vs TinyPNG, Squoosh, compressorjs e altri',
    metaDescription:
      'Confronto tra Compresso e compressori browser e server. Input HEIC, output AVIF, garanzia never-bigger, bundle 3,6 KB, zero upload.',
    intro:
      'Compresso occupa un’intersezione unica: gratuito, nativo browser, privato (zero upload), input HEIC e libreria integrabile da 3,6 KB.',
    whenNotTitle: 'Quando non usare Compresso',
    whenNotBody:
      'Per elaborazione batch lato server usa sharp; per editing a livello pixel Jimp; per downscale di altissima qualità pica. Compresso ottimizza le immagini scelte dall’utente nel browser prima del caricamento.',
    appLink: 'Prova l’app gratuita',
    npmLink: 'Installa compresso.js',
  },
  'pt-BR': {
    title: 'Como o Compresso se compara',
    metaTitle: 'Compresso vs TinyPNG, Squoosh, compressorjs e mais',
    metaDescription:
      'Comparação do Compresso com compressores no navegador e no servidor. Entrada HEIC, saída AVIF, garantia never-bigger, pacote 3,6 KB, zero envio.',
    intro:
      'O Compresso ocupa uma interseção única: gratuito, nativo do navegador, privado (zero envio), entrada HEIC e biblioteca integrável de 3,6 KB.',
    whenNotTitle: 'Quando não usar o Compresso',
    whenNotBody:
      'Para processamento em lote no servidor use sharp; para edição pixel a pixel Jimp; para downscale de altíssima qualidade pica. O Compresso otimiza imagens escolhidas pelo usuário no navegador antes do envio.',
    appLink: 'Experimentar o app grátis',
    npmLink: 'Instalar compresso.js',
  },
  'zh-Hans': {
    title: 'Compresso 对比',
    metaTitle: 'Compresso vs TinyPNG、Squoosh、compressorjs 等',
    metaDescription:
      'Compresso 与浏览器及服务端压缩工具的功能对比。HEIC 输入、AVIF 输出、永不更大保证、3.6 KB 体积、零上传。',
    intro:
      'Compresso 占据独特交集：免费、浏览器原生、隐私（零上传）、HEIC 输入及 3.6 KB 可嵌入库。',
    whenNotTitle: '何时不使用 Compresso',
    whenNotBody:
      '服务端批量处理用 sharp；像素级编辑用 Jimp；仅最高质量缩小用 pica。Compresso 在上传前于浏览器中优化用户选择的图片。',
    appLink: '免费试用应用',
    npmLink: '安装 compresso.js',
  },
};

export const COMPARISON_ROWS = [
  { key: 'bundle', en: 'Bundle (min+gzip)', values: ['3.8 KB', '4.6 KB', '19.6 KB', '15.7 KB'] },
  { key: 'deps', en: 'Required dependencies', values: ['0', '2', '1', '2'] },
  { key: 'heic', en: 'HEIC / HEIF input', values: ['yes', 'no', 'no', 'no'] },
  { key: 'avif', en: 'AVIF output', values: ['yes', 'no', 'no', 'no'] },
  { key: 'auto', en: 'Auto best format', values: ['yes', 'no', 'no', 'no'] },
  { key: 'never', en: 'Never larger than input', values: ['yes', 'no', 'no', 'no'] },
  { key: 'maxsize', en: 'Target max file size', values: ['yes', 'no', 'yes', 'no'] },
  { key: 'worker', en: 'Web Worker batching', values: ['yes', 'no', 'yes', 'yes'] },
];

export const COMPARISON_COLUMNS = ['compresso.js', 'compressorjs', 'browser-image-compression', 'pica'];

export const ROW_LABELS = {
  en: {
    bundle: 'Bundle (min+gzip)',
    deps: 'Required dependencies',
    heic: 'HEIC / HEIF input',
    avif: 'AVIF output',
    auto: 'Auto best format',
    never: 'Never larger than input',
    maxsize: 'Target max file size',
    worker: 'Web Worker batching',
    yes: 'Yes',
    no: 'No',
  },
  es: {
    bundle: 'Paquete (min+gzip)',
    deps: 'Dependencias requeridas',
    heic: 'Entrada HEIC / HEIF',
    avif: 'Salida AVIF',
    auto: 'Formato automático',
    never: 'Nunca más grande que el original',
    maxsize: 'Tamaño máximo objetivo',
    worker: 'Lotes con Web Worker',
    yes: 'Sí',
    no: 'No',
  },
  fr: {
    bundle: 'Bundle (min+gzip)',
    deps: 'Dépendances requises',
    heic: 'Entrée HEIC / HEIF',
    avif: 'Sortie AVIF',
    auto: 'Meilleur format auto',
    never: 'Jamais plus gros que l’original',
    maxsize: 'Taille max cible',
    worker: 'Batch Web Worker',
    yes: 'Oui',
    no: 'Non',
  },
  de: {
    bundle: 'Bundle (min+gzip)',
    deps: 'Erforderliche Abhängigkeiten',
    heic: 'HEIC / HEIF-Eingabe',
    avif: 'AVIF-Ausgabe',
    auto: 'Auto-Bestformat',
    never: 'Nie größer als Eingabe',
    maxsize: 'Ziel-Maximalgröße',
    worker: 'Web-Worker-Batching',
    yes: 'Ja',
    no: 'Nein',
  },
  it: {
    bundle: 'Bundle (min+gzip)',
    deps: 'Dipendenze richieste',
    heic: 'Input HEIC / HEIF',
    avif: 'Output AVIF',
    auto: 'Formato migliore auto',
    never: 'Mai più grande dell’originale',
    maxsize: 'Dimensione max target',
    worker: 'Batch Web Worker',
    yes: 'Sì',
    no: 'No',
  },
  'pt-BR': {
    bundle: 'Pacote (min+gzip)',
    deps: 'Dependências necessárias',
    heic: 'Entrada HEIC / HEIF',
    avif: 'Saída AVIF',
    auto: 'Melhor formato automático',
    never: 'Nunca maior que o original',
    maxsize: 'Tamanho máximo alvo',
    worker: 'Lote com Web Worker',
    yes: 'Sim',
    no: 'Não',
  },
  'zh-Hans': {
    bundle: '包体积 (min+gzip)',
    deps: '必需依赖',
    heic: 'HEIC / HEIF 输入',
    avif: 'AVIF 输出',
    auto: '自动最佳格式',
    never: '永不比原图更大',
    maxsize: '目标最大文件大小',
    worker: 'Web Worker 批量',
    yes: '是',
    no: '否',
  },
};

export function getCompareForLocale(locale) {
  const copy = COMPARE_PAGE_COPY[locale] || COMPARE_PAGE_COPY.en;
  const labels = ROW_LABELS[locale] || ROW_LABELS.en;
  return { copy, labels };
}

export function compareJsonLd(locale) {
  const copy = COMPARE_PAGE_COPY[locale] || COMPARE_PAGE_COPY.en;
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: copy.title,
    description: copy.metaDescription,
    about: COMPARISON_COLUMNS.map((name) => ({ '@type': 'SoftwareApplication', name })),
  };
}
