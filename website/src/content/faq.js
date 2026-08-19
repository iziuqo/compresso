/**
 * FAQ content for SEO/AEO — all seven product locales.
 * Source: README.md §FAQ
 */
export const FAQ_ITEMS = [
  {
    id: 'compress-before-upload',
    en: {
      q: 'How do I compress an image in the browser before uploading?',
      a: 'Read the file from an input element, pass it to compress(file, { quality, maxWidth }), and upload result.file. Everything runs client-side — the image never leaves the browser until you upload it. See the quick start in the documentation.',
    },
    es: {
      q: '¿Cómo comprimo una imagen en el navegador antes de subirla?',
      a: 'Lee el archivo desde un input, pásalo a compress(file, { quality, maxWidth }) y sube result.file. Todo se ejecuta en el cliente: la imagen no sale del navegador hasta que tú la subes. Consulta el inicio rápido en la documentación.',
    },
    fr: {
      q: 'Comment compresser une image dans le navigateur avant de l’envoyer ?',
      a: 'Lisez le fichier depuis un input, passez-le à compress(file, { quality, maxWidth }), puis envoyez result.file. Tout s’exécute côté client — l’image ne quitte jamais le navigateur tant que vous ne l’envoyez pas. Voir le démarrage rapide dans la documentation.',
    },
    de: {
      q: 'Wie komprimiere ich ein Bild im Browser vor dem Hochladen?',
      a: 'Lies die Datei aus einem Input, übergib sie an compress(file, { quality, maxWidth }) und lade result.file hoch. Alles läuft clientseitig — das Bild verlässt den Browser erst, wenn du es hochlädst. Siehe Schnellstart in der Dokumentation.',
    },
    it: {
      q: 'Come comprimo un’immagine nel browser prima di caricarla?',
      a: 'Leggi il file da un input, passalo a compress(file, { quality, maxWidth }) e carica result.file. Tutto avviene lato client — l’immagine non lascia il browser finché non la carichi tu. Vedi l’avvio rapido nella documentazione.',
    },
    'pt-BR': {
      q: 'Como comprimir uma imagem no navegador antes de enviar?',
      a: 'Leia o arquivo de um input, passe para compress(file, { quality, maxWidth }) e envie result.file. Tudo roda no cliente — a imagem não sai do navegador até você enviá-la. Veja o início rápido na documentação.',
    },
    'zh-Hans': {
      q: '如何在上传前在浏览器中压缩图片？',
      a: '从 input 读取文件，传入 compress(file, { quality, maxWidth })，然后上传 result.file。一切都在客户端运行——图片在你上传之前不会离开浏览器。请参阅文档中的快速入门。',
    },
  },
  {
    id: 'heic-convert',
    en: {
      q: 'How do I convert a HEIC image to JPEG or WebP in JavaScript?',
      a: 'Pass the .heic or .heif file directly to compress(file, { format: "auto" }). Compresso decodes HEIC natively on Safari and via a lazy WASM decoder elsewhere, then outputs a standard web format.',
    },
    es: {
      q: '¿Cómo convierto una imagen HEIC a JPEG o WebP en JavaScript?',
      a: 'Pasa el archivo .heic o .heif directamente a compress(file, { format: "auto" }). Compresso decodifica HEIC de forma nativa en Safari y con un decodificador WASM perezoso en otros navegadores, y devuelve un formato web estándar.',
    },
    fr: {
      q: 'Comment convertir une image HEIC en JPEG ou WebP en JavaScript ?',
      a: 'Passez le fichier .heic ou .heif directement à compress(file, { format: "auto" }). Compresso décode le HEIC nativement sur Safari et via un décodeur WASM chargé à la demande ailleurs, puis produit un format web standard.',
    },
    de: {
      q: 'Wie konvertiere ich ein HEIC-Bild in JavaScript zu JPEG oder WebP?',
      a: 'Übergib die .heic- oder .heif-Datei direkt an compress(file, { format: "auto" }). Compresso dekodiert HEIC nativ in Safari und andernorts per lazy WASM-Decoder und gibt ein Standard-Webformat aus.',
    },
    it: {
      q: 'Come converto un’immagine HEIC in JPEG o WebP in JavaScript?',
      a: 'Passa il file .heic o .heif direttamente a compress(file, { format: "auto" }). Compresso decodifica HEIC nativamente su Safari e tramite un decoder WASM lazy altrove, poi restituisce un formato web standard.',
    },
    'pt-BR': {
      q: 'Como converter uma imagem HEIC para JPEG ou WebP em JavaScript?',
      a: 'Passe o arquivo .heic ou .heif diretamente para compress(file, { format: "auto" }). O Compresso decodifica HEIC nativamente no Safari e via decodificador WASM lazy em outros navegadores, retornando um formato web padrão.',
    },
    'zh-Hans': {
      q: '如何在 JavaScript 中将 HEIC 图片转换为 JPEG 或 WebP？',
      a: '将 .heic 或 .heif 文件直接传入 compress(file, { format: "auto" })。Compresso 在 Safari 上原生解码 HEIC，在其他浏览器上通过懒加载 WASM 解码器，然后输出标准 Web 格式。',
    },
  },
  {
    id: 'bigger-output',
    en: {
      q: 'Why did my compressed image get bigger than the original?',
      a: 'With most tools, re-encoding an already-efficient source (like an iPhone HEIC) to JPEG can inflate it. Compresso guarantees this never happens on lossy output: the file is capped at the source size, and on browsers without WebP/AVIF it reduces resolution instead of ballooning the file.',
    },
    es: {
      q: '¿Por qué mi imagen comprimida quedó más grande que la original?',
      a: 'En la mayoría de herramientas, volver a codificar una fuente ya eficiente (como un HEIC de iPhone) a JPEG puede inflarla. Compresso garantiza que esto no ocurre en salida con pérdida: el archivo se limita al tamaño de origen y, en navegadores sin WebP/AVIF, reduce la resolución en lugar de aumentar el peso.',
    },
    fr: {
      q: 'Pourquoi mon image compressée est-elle devenue plus grande que l’originale ?',
      a: 'Avec la plupart des outils, réencoder une source déjà efficace (comme un HEIC d’iPhone) en JPEG peut l’enflammer. Compresso garantit que cela n’arrive jamais en sortie avec perte : la taille est plafonnée à la source et, sans WebP/AVIF, la résolution est réduite plutôt que le fichier grossi.',
    },
    de: {
      q: 'Warum wurde mein komprimiertes Bild größer als das Original?',
      a: 'Bei den meisten Tools kann das Neuencodieren einer bereits effizienten Quelle (z. B. iPhone-HEIC) zu JPEG sie vergrößern. Compresso garantiert bei verlustbehafteter Ausgabe, dass dies nie passiert: Die Dateigröße ist auf die Quelle begrenzt, und ohne WebP/AVIF wird die Auflösung reduziert statt die Datei aufzublasen.',
    },
    it: {
      q: 'Perché la mia immagine compressa è diventata più grande dell’originale?',
      a: 'Con la maggior parte degli strumenti, ricodificare una sorgente già efficiente (come un HEIC di iPhone) in JPEG può gonfiarla. Compresso garantisce che non accada mai in uscita lossy: la dimensione è limitata alla sorgente e, senza WebP/AVIF, riduce la risoluzione invece di aumentare il file.',
    },
    'pt-BR': {
      q: 'Por que minha imagem comprimida ficou maior que a original?',
      a: 'Na maioria das ferramentas, reencodar uma fonte já eficiente (como HEIC do iPhone) para JPEG pode inflar o arquivo. O Compresso garante que isso não acontece em saída com perda: o tamanho é limitado ao original e, sem WebP/AVIF, reduz a resolução em vez de aumentar o arquivo.',
    },
    'zh-Hans': {
      q: '为什么压缩后的图片比原图还大？',
      a: '大多数工具在将已高效的源文件（如 iPhone HEIC）重新编码为 JPEG 时可能会变大。Compresso 保证有损输出绝不会如此：文件大小上限为源文件大小；在不支持 WebP/AVIF 的浏览器上会降低分辨率，而不是让文件膨胀。',
    },
  },
  {
    id: 'no-server',
    en: {
      q: 'Does it need a server or backend?',
      a: 'No. Compresso is 100% client-side (Canvas API). No servers, no API keys, no image ever uploaded to a third party.',
    },
    es: {
      q: '¿Necesita un servidor o backend?',
      a: 'No. Compresso es 100% del lado del cliente (Canvas API). Sin servidores, sin claves API, ninguna imagen se sube a terceros.',
    },
    fr: {
      q: 'Faut-il un serveur ou un backend ?',
      a: 'Non. Compresso est 100 % côté client (Canvas API). Pas de serveurs, pas de clés API, aucune image envoyée à un tiers.',
    },
    de: {
      q: 'Braucht es einen Server oder Backend?',
      a: 'Nein. Compresso ist 100 % clientseitig (Canvas API). Keine Server, keine API-Schlüssel, kein Bild wird an Dritte hochgeladen.',
    },
    it: {
      q: 'Serve un server o un backend?',
      a: 'No. Compresso è 100% lato client (Canvas API). Nessun server, nessuna chiave API, nessuna immagine caricata a terzi.',
    },
    'pt-BR': {
      q: 'Precisa de servidor ou backend?',
      a: 'Não. O Compresso é 100% no cliente (Canvas API). Sem servidores, sem chaves de API, nenhuma imagem enviada a terceiros.',
    },
    'zh-Hans': {
      q: '需要服务器或后端吗？',
      a: '不需要。Compresso 100% 在客户端运行（Canvas API）。无需服务器、无需 API 密钥，图片不会上传到任何第三方。',
    },
  },
  {
    id: 'frameworks',
    en: {
      q: 'Does it work with React, Vue, and Next.js?',
      a: 'Yes — it is framework-agnostic. Import compress from compresso.js in any upload flow. Examples for React, Vue, Svelte, Angular, and Next.js ship in the repository.',
    },
    es: {
      q: '¿Funciona con React, Vue y Next.js?',
      a: 'Sí — es agnóstico al framework. Importa compress desde compresso.js en cualquier flujo de subida. Hay ejemplos para React, Vue, Svelte, Angular y Next.js en el repositorio.',
    },
    fr: {
      q: 'Est-ce compatible avec React, Vue et Next.js ?',
      a: 'Oui — agnostique au framework. Importez compress depuis compresso.js dans n’importe quel flux d’envoi. Des exemples React, Vue, Svelte, Angular et Next.js sont fournis.',
    },
    de: {
      q: 'Funktioniert es mit React, Vue und Next.js?',
      a: 'Ja — framework-agnostisch. Importiere compress aus compresso.js in jeden Upload-Flow. Beispiele für React, Vue, Svelte, Angular und Next.js liegen im Repository.',
    },
    it: {
      q: 'Funziona con React, Vue e Next.js?',
      a: 'Sì — è agnostico rispetto al framework. Importa compress da compresso.js in qualsiasi flusso di upload. Esempi per React, Vue, Svelte, Angular e Next.js sono nel repository.',
    },
    'pt-BR': {
      q: 'Funciona com React, Vue e Next.js?',
      a: 'Sim — é agnóstico a frameworks. Importe compress de compresso.js em qualquer fluxo de upload. Exemplos para React, Vue, Svelte, Angular e Next.js estão no repositório.',
    },
    'zh-Hans': {
      q: '支持 React、Vue 和 Next.js 吗？',
      a: '支持——与框架无关。在任何上传流程中从 compresso.js 导入 compress 即可。仓库中提供 React、Vue、Svelte、Angular 和 Next.js 示例。',
    },
  },
  {
    id: 'parallel-batch',
    en: {
      q: 'How do I compress many images in parallel without blocking the UI?',
      a: 'Import createPool from compresso.js/pool — it runs a Web Worker pool with the same API, falling back to the main thread automatically where Workers are unavailable.',
    },
    es: {
      q: '¿Cómo comprimo muchas imágenes en paralelo sin bloquear la interfaz?',
      a: 'Importa createPool desde compresso.js/pool — ejecuta un pool de Web Workers con la misma API y vuelve al hilo principal automáticamente donde no haya Workers.',
    },
    fr: {
      q: 'Comment compresser plusieurs images en parallèle sans bloquer l’interface ?',
      a: 'Importez createPool depuis compresso.js/pool — un pool de Web Workers avec la même API, repli automatique sur le thread principal si les Workers ne sont pas disponibles.',
    },
    de: {
      q: 'Wie komprimiere ich viele Bilder parallel, ohne die UI zu blockieren?',
      a: 'Importiere createPool aus compresso.js/pool — ein Web-Worker-Pool mit derselben API, automatischer Fallback auf den Main Thread, wo Workers fehlen.',
    },
    it: {
      q: 'Come comprimo molte immagini in parallelo senza bloccare l’interfaccia?',
      a: 'Importa createPool da compresso.js/pool — un pool di Web Worker con la stessa API, con fallback automatico al main thread dove i Worker non sono disponibili.',
    },
    'pt-BR': {
      q: 'Como comprimir muitas imagens em paralelo sem travar a interface?',
      a: 'Importe createPool de compresso.js/pool — executa um pool de Web Workers com a mesma API, com fallback automático para a thread principal onde Workers não estão disponíveis.',
    },
    'zh-Hans': {
      q: '如何并行压缩多张图片而不阻塞界面？',
      a: '从 compresso.js/pool 导入 createPool——它运行 Web Worker 池，API 相同，在不支持 Worker 的环境自动回退到主线程。',
    },
  },
  {
    id: 'csp-heic',
    en: {
      q: 'My site has a strict CSP — why does HEIC input fail?',
      a: 'It is usually a missing wasm-unsafe-eval in script-src (the HEIC decoder is WASM-based), or a missing worker-src self if you use compresso.js/pool. See the CSP section in the documentation for a full policy example.',
    },
    es: {
      q: 'Mi sitio tiene una CSP estricta — ¿por qué falla la entrada HEIC?',
      a: 'Suele faltar wasm-unsafe-eval en script-src (el decodificador HEIC usa WASM) o worker-src self si usas compresso.js/pool. Consulta la sección CSP en la documentación.',
    },
    fr: {
      q: 'Mon site a une CSP stricte — pourquoi l’entrée HEIC échoue-t-elle ?',
      a: 'Il manque généralement wasm-unsafe-eval dans script-src (le décodeur HEIC est en WASM) ou worker-src self avec compresso.js/pool. Voir la section CSP de la documentation.',
    },
    de: {
      q: 'Meine Site hat eine strenge CSP — warum schlägt HEIC-Eingabe fehl?',
      a: 'Meist fehlt wasm-unsafe-eval in script-src (HEIC-Decoder ist WASM-basiert) oder worker-src self bei compresso.js/pool. Siehe CSP-Abschnitt in der Dokumentation.',
    },
    it: {
      q: 'Il mio sito ha una CSP rigida — perché l’input HEIC fallisce?',
      a: 'Di solito manca wasm-unsafe-eval in script-src (il decoder HEIC è WASM) o worker-src self con compresso.js/pool. Vedi la sezione CSP nella documentazione.',
    },
    'pt-BR': {
      q: 'Meu site tem CSP rigorosa — por que a entrada HEIC falha?',
      a: 'Geralmente falta wasm-unsafe-eval em script-src (o decodificador HEIC é WASM) ou worker-src self ao usar compresso.js/pool. Veja a seção CSP na documentação.',
    },
    'zh-Hans': {
      q: '我的网站有严格的 CSP——为什么 HEIC 输入会失败？',
      a: '通常是因为 script-src 缺少 wasm-unsafe-eval（HEIC 解码器基于 WASM），或使用 compresso.js/pool 时缺少 worker-src self。请参阅文档中的 CSP 部分。',
    },
  },
];

export const FAQ_PAGE_COPY = {
  en: {
    title: 'Frequently Asked Questions',
    metaTitle: 'Compresso FAQ: Browser Image Compression Questions Answered',
    metaDescription:
      'Answers about compressing images in the browser, HEIC conversion, never-bigger guarantee, React/Vue integration, Web Worker batching, and CSP requirements.',
    intro: 'Direct answers about Compresso, the free browser-native image optimizer and 3.6 KB JavaScript library.',
    docsLink: 'Read the documentation',
    appLink: 'Open the app',
  },
  es: {
    title: 'Preguntas frecuentes',
    metaTitle: 'FAQ de Compresso: compresión de imágenes en el navegador',
    metaDescription:
      'Respuestas sobre compresión en el navegador, conversión HEIC, garantía de no aumentar el tamaño, integración React/Vue, procesamiento por lotes con Workers y CSP.',
    intro: 'Respuestas directas sobre Compresso, el optimizador de imágenes gratuito en el navegador y la librería JavaScript de 3,6 KB.',
    docsLink: 'Leer la documentación',
    appLink: 'Abrir la app',
  },
  fr: {
    title: 'Questions fréquentes',
    metaTitle: 'FAQ Compresso : compression d’images dans le navigateur',
    metaDescription:
      'Réponses sur la compression navigateur, la conversion HEIC, la garantie « jamais plus gros », l’intégration React/Vue, le batch Web Workers et la CSP.',
    intro: 'Réponses directes sur Compresso, l’optimiseur d’images gratuit dans le navigateur et la bibliothèque JavaScript de 3,6 Ko.',
    docsLink: 'Lire la documentation',
    appLink: 'Ouvrir l’application',
  },
  de: {
    title: 'Häufig gestellte Fragen',
    metaTitle: 'Compresso FAQ: Bildkomprimierung im Browser',
    metaDescription:
      'Antworten zu Browser-Komprimierung, HEIC-Konvertierung, Never-bigger-Garantie, React/Vue-Integration, Web-Worker-Batching und CSP.',
    intro: 'Direkte Antworten zu Compresso, dem kostenlosen Browser-Bildoptimierer und der 3,6-KB-JavaScript-Bibliothek.',
    docsLink: 'Dokumentation lesen',
    appLink: 'App öffnen',
  },
  it: {
    title: 'Domande frequenti',
    metaTitle: 'FAQ Compresso: compressione immagini nel browser',
    metaDescription:
      'Risposte su compressione nel browser, conversione HEIC, garanzia never-bigger, integrazione React/Vue, batch Web Worker e CSP.',
    intro: 'Risposte dirette su Compresso, l’ottimizzatore gratuito nel browser e la libreria JavaScript da 3,6 KB.',
    docsLink: 'Leggi la documentazione',
    appLink: 'Apri l’app',
  },
  'pt-BR': {
    title: 'Perguntas frequentes',
    metaTitle: 'FAQ Compresso: compressão de imagens no navegador',
    metaDescription:
      'Respostas sobre compressão no navegador, conversão HEIC, garantia never-bigger, integração React/Vue, batch com Web Workers e CSP.',
    intro: 'Respostas diretas sobre o Compresso, otimizador gratuito no navegador e biblioteca JavaScript de 3,6 KB.',
    docsLink: 'Ler a documentação',
    appLink: 'Abrir o app',
  },
  'zh-Hans': {
    title: '常见问题',
    metaTitle: 'Compresso 常见问题：浏览器图片压缩',
    metaDescription:
      '关于浏览器压缩、HEIC 转换、永不更大保证、React/Vue 集成、Web Worker 批量处理和 CSP 的解答。',
    intro: '关于 Compresso 免费浏览器图片优化工具及 3.6 KB JavaScript 库的直接解答。',
    docsLink: '阅读文档',
    appLink: '打开应用',
  },
};

export function getFaqForLocale(locale) {
  const copy = FAQ_PAGE_COPY[locale] || FAQ_PAGE_COPY.en;
  const items = FAQ_ITEMS.map((item) => ({
    id: item.id,
    ...(item[locale] || item.en),
  }));
  return { copy, items };
}

export function faqJsonLd(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.a,
      },
    })),
  };
}

export function faqHowToJsonLd(items) {
  const first = items[0];
  if (!first) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: first.q,
    description: first.a,
    step: [
      {
        '@type': 'HowToStep',
        text: 'Read the image from a file input in your web application.',
      },
      {
        '@type': 'HowToStep',
        text: 'Pass the file to compress(file, { quality, maxWidth, format: "auto" }).',
      },
      {
        '@type': 'HowToStep',
        text: 'Upload result.file — compression stayed entirely in the browser.',
      },
    ],
  };
}
