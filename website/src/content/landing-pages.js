/**
 * Tier A programmatic SEO landing pages — 10 intents × 7 locales.
 */
export const LANDING_PAGE_SLUGS = [
  'compress-images-online-free',
  'compress-images-without-uploading',
  'private-image-compressor',
  'heic-to-jpeg',
  'heic-to-webp',
  'compress-heic-online',
  'compress-image-under-2mb',
  'compress-image-for-email',
  'offline-image-compressor',
  'batch-compress-images',
];

/** @type {Record<string, Record<string, object>>} */
export const LANDING_PAGES = {
  'compress-images-online-free': {
    en: {
      metaTitle: 'Compress Images Online Free — No Upload, Runs In Your Browser | Compresso',
      metaDescription:
        'Compress images online for free without uploading them to a server. Compresso runs entirely in your browser, works offline, and supports JPEG, PNG, WebP, AVIF, and HEIC.',
      h1: 'Compress images online, free and private',
      answer:
        'Compresso is a free online image compressor that runs entirely in your browser. Your photos never leave your device — there is no server upload, no account, and no file-size cap.',
      steps: [
        'Open the Compresso app in your browser.',
        'Drop or select the images you want to compress.',
        'Adjust quality, format, or max size — then download the optimized file.',
      ],
      faq: [
        { q: 'Is it really free?', a: 'Yes. Compresso is free, open source, and requires no account.' },
        { q: 'Are my images uploaded?', a: 'No. Compression happens locally on your device. Zero bytes are sent to any server.' },
      ],
      related: ['compress-images-without-uploading', 'private-image-compressor', 'offline-image-compressor'],
    },
    es: {
      metaTitle: 'Comprimir imágenes online gratis — sin subir, en tu navegador | Compresso',
      metaDescription:
        'Comprime imágenes online gratis sin subirlas a un servidor. Compresso funciona en tu navegador, offline, con JPEG, PNG, WebP, AVIF y HEIC.',
      h1: 'Comprime imágenes online, gratis y en privado',
      answer:
        'Compresso es un compresor de imágenes online gratuito que funciona entero en tu navegador. Tus fotos no salen de tu dispositivo: sin subida a servidor, sin cuenta y sin límite de tamaño.',
      steps: [
        'Abre la app Compresso en tu navegador.',
        'Arrastra o selecciona las imágenes a comprimir.',
        'Ajusta calidad, formato o tamaño máximo y descarga el archivo optimizado.',
      ],
      faq: [
        { q: '¿Es realmente gratis?', a: 'Sí. Compresso es gratuito, open source y no requiere cuenta.' },
        { q: '¿Se suben mis imágenes?', a: 'No. La compresión ocurre en tu dispositivo. Cero bytes enviados a servidores.' },
      ],
      related: ['compress-images-without-uploading', 'private-image-compressor', 'offline-image-compressor'],
    },
    fr: {
      metaTitle: 'Compresser des images en ligne gratuitement — sans envoi | Compresso',
      metaDescription:
        'Compressez des images en ligne gratuitement sans les envoyer à un serveur. Compresso fonctionne dans le navigateur, hors ligne, avec JPEG, PNG, WebP, AVIF et HEIC.',
      h1: 'Compressez des images en ligne, gratuitement et en privé',
      answer:
        'Compresso est un compresseur d’images en ligne gratuit qui fonctionne entièrement dans votre navigateur. Vos photos ne quittent jamais votre appareil — pas d’envoi serveur, pas de compte, pas de limite de taille.',
      steps: [
        'Ouvrez l’application Compresso dans votre navigateur.',
        'Déposez ou sélectionnez les images à compresser.',
        'Ajustez qualité, format ou taille max, puis téléchargez le fichier optimisé.',
      ],
      faq: [
        { q: 'Est-ce vraiment gratuit ?', a: 'Oui. Compresso est gratuit, open source et sans compte.' },
        { q: 'Mes images sont-elles envoyées ?', a: 'Non. La compression se fait localement. Zéro octet envoyé à un serveur.' },
      ],
      related: ['compress-images-without-uploading', 'private-image-compressor', 'offline-image-compressor'],
    },
    de: {
      metaTitle: 'Bilder online kostenlos komprimieren — ohne Upload | Compresso',
      metaDescription:
        'Bilder online kostenlos komprimieren, ohne Upload auf einen Server. Compresso läuft im Browser, offline, mit JPEG, PNG, WebP, AVIF und HEIC.',
      h1: 'Bilder online kostenlos und privat komprimieren',
      answer:
        'Compresso ist ein kostenloser Online-Bildkompressor, der vollständig in deinem Browser läuft. Deine Fotos verlassen dein Gerät nie — kein Server-Upload, kein Konto, kein Größenlimit.',
      steps: [
        'Öffne die Compresso-App im Browser.',
        'Ziehe Bilder hinein oder wähle sie aus.',
        'Passe Qualität, Format oder Maximalgröße an und lade die optimierte Datei herunter.',
      ],
      faq: [
        { q: 'Ist es wirklich kostenlos?', a: 'Ja. Compresso ist kostenlos, Open Source und ohne Konto.' },
        { q: 'Werden meine Bilder hochgeladen?', a: 'Nein. Komprimierung erfolgt lokal. Null Bytes an Server.' },
      ],
      related: ['compress-images-without-uploading', 'private-image-compressor', 'offline-image-compressor'],
    },
    it: {
      metaTitle: 'Comprimere immagini online gratis — senza upload | Compresso',
      metaDescription:
        'Comprimi immagini online gratis senza caricarle su un server. Compresso funziona nel browser, offline, con JPEG, PNG, WebP, AVIF e HEIC.',
      h1: 'Comprimi immagini online, gratis e in privato',
      answer:
        'Compresso è un compressore di immagini online gratuito che funziona interamente nel browser. Le tue foto non lasciano mai il dispositivo — nessun upload, nessun account, nessun limite di dimensione.',
      steps: [
        'Apri l’app Compresso nel browser.',
        'Trascina o seleziona le immagini da comprimere.',
        'Regola qualità, formato o dimensione massima e scarica il file ottimizzato.',
      ],
      faq: [
        { q: 'È davvero gratis?', a: 'Sì. Compresso è gratuito, open source e senza account.' },
        { q: 'Le mie immagini vengono caricate?', a: 'No. La compressione avviene localmente. Zero byte inviati ai server.' },
      ],
      related: ['compress-images-without-uploading', 'private-image-compressor', 'offline-image-compressor'],
    },
    'pt-BR': {
      metaTitle: 'Comprimir imagens online grátis — sem envio, no navegador | Compresso',
      metaDescription:
        'Comprima imagens online grátis sem enviar a um servidor. O Compresso roda no navegador, offline, com JPEG, PNG, WebP, AVIF e HEIC.',
      h1: 'Comprima imagens online, grátis e em privado',
      answer:
        'O Compresso é um compressor de imagens online gratuito que roda inteiro no seu navegador. Suas fotos não saem do dispositivo — sem envio a servidor, sem conta e sem limite de tamanho.',
      steps: [
        'Abra o app Compresso no navegador.',
        'Arraste ou selecione as imagens para comprimir.',
        'Ajuste qualidade, formato ou tamanho máximo e baixe o arquivo otimizado.',
      ],
      faq: [
        { q: 'É realmente grátis?', a: 'Sim. O Compresso é gratuito, open source e não exige conta.' },
        { q: 'Minhas imagens são enviadas?', a: 'Não. A compressão é local. Zero bytes enviados a servidores.' },
      ],
      related: ['compress-images-without-uploading', 'private-image-compressor', 'offline-image-compressor'],
    },
    'zh-Hans': {
      metaTitle: '免费在线压缩图片 — 无需上传，浏览器内运行 | Compresso',
      metaDescription:
        '免费在线压缩图片，无需上传到服务器。Compresso 在浏览器中运行，支持离线，兼容 JPEG、PNG、WebP、AVIF 和 HEIC。',
      h1: '免费、私密地在线压缩图片',
      answer:
        'Compresso 是一款完全在浏览器中运行的免费在线图片压缩工具。您的照片不会离开设备——无需上传服务器、无需账号、无文件大小限制。',
      steps: [
        '在浏览器中打开 Compresso 应用。',
        '拖放或选择要压缩的图片。',
        '调整质量、格式或最大大小，然后下载优化后的文件。',
      ],
      faq: [
        { q: '真的免费吗？', a: '是的。Compresso 免费开源，无需账号。' },
        { q: '图片会被上传吗？', a: '不会。压缩在本地完成，零字节发送到服务器。' },
      ],
      related: ['compress-images-without-uploading', 'private-image-compressor', 'offline-image-compressor'],
    },
  },
  'compress-images-without-uploading': {
    en: {
      metaTitle: 'Compress Images Without Uploading — 100% Browser-Side | Compresso',
      metaDescription:
        'Compress and resize images without uploading them anywhere. Compresso processes photos entirely on your device. Verify zero network requests in DevTools.',
      h1: 'Compress images without uploading them anywhere',
      answer:
        'Unlike TinyPNG and iLoveIMG, Compresso never sends your images to a server. Compression uses the browser Canvas API locally — you can verify zero upload bytes in the Network tab.',
      steps: [
        'Open Compresso — no signup required.',
        'Load your image from disk, clipboard, or drag-and-drop.',
        'Download the compressed file directly from your browser.',
      ],
      faq: [
        { q: 'How is this different from TinyPNG?', a: 'TinyPNG uploads your files to their servers. Compresso keeps everything on your device.' },
        { q: 'Can I verify privacy?', a: 'Yes. Open DevTools → Network, compress an image, and confirm zero image upload requests.' },
      ],
      related: ['private-image-compressor', 'compress-images-online-free', 'offline-image-compressor'],
    },
    es: {
      metaTitle: 'Comprimir imágenes sin subirlas — 100% en el navegador | Compresso',
      metaDescription:
        'Comprime y redimensiona imágenes sin subirlas a ningún sitio. Compresso procesa las fotos en tu dispositivo. Verifica cero solicitudes de red en DevTools.',
      h1: 'Comprime imágenes sin subirlas a ningún sitio',
      answer:
        'A diferencia de TinyPNG e iLoveIMG, Compresso nunca envía tus imágenes a un servidor. La compresión usa la Canvas API del navegador localmente.',
      steps: ['Abre Compresso sin registrarte.', 'Carga tu imagen desde disco, portapapeles o arrastrando.', 'Descarga el archivo comprimido desde el navegador.'],
      faq: [
        { q: '¿En qué se diferencia de TinyPNG?', a: 'TinyPNG sube tus archivos a sus servidores. Compresso lo mantiene todo en tu dispositivo.' },
        { q: '¿Puedo verificar la privacidad?', a: 'Sí. Abre DevTools → Red, comprime una imagen y confirma cero subidas.' },
      ],
      related: ['private-image-compressor', 'compress-images-online-free', 'offline-image-compressor'],
    },
    fr: {
      metaTitle: 'Compresser des images sans les envoyer — 100 % navigateur | Compresso',
      metaDescription:
        'Compressez et redimensionnez sans envoyer vos images. Compresso traite tout sur votre appareil. Vérifiez zéro requête réseau dans DevTools.',
      h1: 'Compressez des images sans les envoyer nulle part',
      answer:
        'Contrairement à TinyPNG et iLoveIMG, Compresso n’envoie jamais vos images à un serveur. La compression utilise l’API Canvas localement.',
      steps: ['Ouvrez Compresso sans inscription.', 'Chargez votre image depuis le disque, le presse-papiers ou par glisser-déposer.', 'Téléchargez le fichier compressé depuis le navigateur.'],
      faq: [
        { q: 'Quelle différence avec TinyPNG ?', a: 'TinyPNG envoie vos fichiers à ses serveurs. Compresso garde tout sur votre appareil.' },
        { q: 'Puis-je vérifier la confidentialité ?', a: 'Oui. DevTools → Réseau, compressez une image, confirmez zéro envoi.' },
      ],
      related: ['private-image-compressor', 'compress-images-online-free', 'offline-image-compressor'],
    },
    de: {
      metaTitle: 'Bilder komprimieren ohne Upload — 100 % im Browser | Compresso',
      metaDescription:
        'Bilder komprimieren und skalieren ohne Upload. Compresso verarbeitet alles auf deinem Gerät. Null Netzwerkanfragen in DevTools prüfbar.',
      h1: 'Bilder komprimieren, ohne sie irgendwo hochzuladen',
      answer:
        'Anders als TinyPNG und iLoveIMG sendet Compresso deine Bilder nie an einen Server. Komprimierung erfolgt lokal über die Canvas API.',
      steps: ['Compresso öffnen — keine Anmeldung.', 'Bild von Festplatte, Zwischenablage oder per Drag-and-Drop laden.', 'Komprimierte Datei direkt aus dem Browser herunterladen.'],
      faq: [
        { q: 'Unterschied zu TinyPNG?', a: 'TinyPNG lädt Dateien auf Server hoch. Compresso bleibt vollständig lokal.' },
        { q: 'Privatsphäre prüfbar?', a: 'Ja. DevTools → Netzwerk, Bild komprimieren, null Upload bestätigen.' },
      ],
      related: ['private-image-compressor', 'compress-images-online-free', 'offline-image-compressor'],
    },
    it: {
      metaTitle: 'Comprimere immagini senza caricarle — 100% nel browser | Compresso',
      metaDescription:
        'Comprimi e ridimensiona senza caricare le immagini. Compresso elabora tutto sul dispositivo. Verifica zero richieste di rete in DevTools.',
      h1: 'Comprimi immagini senza caricarle da nessuna parte',
      answer:
        'A differenza di TinyPNG e iLoveIMG, Compresso non invia mai le tue immagini a un server. La compressione usa la Canvas API localmente.',
      steps: ['Apri Compresso senza registrazione.', 'Carica l’immagine da disco, appunti o trascinamento.', 'Scarica il file compresso dal browser.'],
      faq: [
        { q: 'Differenza con TinyPNG?', a: 'TinyPNG carica i file sui suoi server. Compresso resta sul tuo dispositivo.' },
        { q: 'Posso verificare la privacy?', a: 'Sì. DevTools → Rete, comprimi un’immagine, conferma zero upload.' },
      ],
      related: ['private-image-compressor', 'compress-images-online-free', 'offline-image-compressor'],
    },
    'pt-BR': {
      metaTitle: 'Comprimir imagens sem enviar — 100% no navegador | Compresso',
      metaDescription:
        'Comprima e redimensione sem enviar imagens. O Compresso processa tudo no seu dispositivo. Verifique zero requisições de rede no DevTools.',
      h1: 'Comprima imagens sem enviá-las a lugar nenhum',
      answer:
        'Diferente do TinyPNG e iLoveIMG, o Compresso nunca envia suas imagens a um servidor. A compressão usa a Canvas API localmente.',
      steps: ['Abra o Compresso sem cadastro.', 'Carregue a imagem do disco, clipboard ou arrastando.', 'Baixe o arquivo comprimido pelo navegador.'],
      faq: [
        { q: 'Qual a diferença do TinyPNG?', a: 'O TinyPNG envia arquivos aos servidores deles. O Compresso mantém tudo no seu dispositivo.' },
        { q: 'Posso verificar a privacidade?', a: 'Sim. DevTools → Rede, comprima uma imagem, confirme zero envios.' },
      ],
      related: ['private-image-compressor', 'compress-images-online-free', 'offline-image-compressor'],
    },
    'zh-Hans': {
      metaTitle: '无需上传即可压缩图片 — 100% 浏览器端 | Compresso',
      metaDescription:
        '压缩和调整图片大小而无需上传到任何地方。Compresso 完全在您的设备上处理。可在 DevTools 中验证零网络请求。',
      h1: '压缩图片，无需上传到任何服务器',
      answer:
        '与 TinyPNG 和 iLoveIMG 不同，Compresso 从不将图片发送到服务器。压缩在本地通过浏览器 Canvas API 完成。',
      steps: ['打开 Compresso，无需注册。', '从磁盘、剪贴板或拖放加载图片。', '直接从浏览器下载压缩后的文件。'],
      faq: [
        { q: '与 TinyPNG 有何不同？', a: 'TinyPNG 将文件上传到其服务器。Compresso 一切都在您的设备上。' },
        { q: '可以验证隐私吗？', a: '可以。DevTools → 网络，压缩图片，确认零上传。' },
      ],
      related: ['private-image-compressor', 'compress-images-online-free', 'offline-image-compressor'],
    },
  },
  'private-image-compressor': {
    en: {
      metaTitle: 'Private Image Compressor — Zero Upload, Client-Side Only | Compresso',
      metaDescription:
        'Private image compressor that never uploads your photos. Ideal for sensitive documents, healthcare forms, and banking uploads. 100% client-side.',
      h1: 'Private image compressor — zero bytes uploaded',
      answer:
        'Compresso is a private image compressor by architecture, not policy. Images are processed with the Canvas API on your device. No cloud, no API keys, no third-party servers.',
      steps: ['Open the app — works offline after first load.', 'Compress sensitive photos locally.', 'Upload the optimized file only to the destination you choose.'],
      faq: [
        { q: 'Is it safe for passport or medical photos?', a: 'Yes. Your original never leaves your device during compression.' },
        { q: 'Does the website track my images?', a: 'No image data is transmitted. Compression is entirely local.' },
      ],
      related: ['compress-images-without-uploading', 'compress-image-under-2mb', 'heic-to-jpeg'],
    },
    es: {
      metaTitle: 'Compresor de imágenes privado — cero subida | Compresso',
      metaDescription: 'Compresor privado que nunca sube tus fotos. Ideal para documentos sensibles y formularios. 100% del lado del cliente.',
      h1: 'Compresor de imágenes privado — cero bytes subidos',
      answer: 'Compresso es privado por arquitectura, no por política. Las imágenes se procesan con Canvas API en tu dispositivo.',
      steps: ['Abre la app — funciona offline tras la primera carga.', 'Comprime fotos sensibles localmente.', 'Sube el archivo optimizado solo al destino que elijas.'],
      faq: [
        { q: '¿Es seguro para fotos de pasaporte o médicas?', a: 'Sí. El original no sale de tu dispositivo durante la compresión.' },
        { q: '¿El sitio rastrea mis imágenes?', a: 'No se transmiten datos de imagen. Todo es local.' },
      ],
      related: ['compress-images-without-uploading', 'compress-image-under-2mb', 'heic-to-jpeg'],
    },
    fr: {
      metaTitle: 'Compresseur d’images privé — zéro envoi | Compresso',
      metaDescription: 'Compresseur privé qui n’envoie jamais vos photos. Idéal pour documents sensibles. 100 % côté client.',
      h1: 'Compresseur d’images privé — zéro octet envoyé',
      answer: 'Compresso est privé par architecture. Les images sont traitées via Canvas API sur votre appareil.',
      steps: ['Ouvrez l’app — fonctionne hors ligne après le premier chargement.', 'Compressez localement les photos sensibles.', 'Envoyez le fichier optimisé uniquement où vous le choisissez.'],
      faq: [
        { q: 'Sûr pour photos passeport ou médicales ?', a: 'Oui. L’original ne quitte jamais votre appareil.' },
        { q: 'Le site suit-il mes images ?', a: 'Aucune donnée d’image transmise. Tout est local.' },
      ],
      related: ['compress-images-without-uploading', 'compress-image-under-2mb', 'heic-to-jpeg'],
    },
    de: {
      metaTitle: 'Privater Bildkompressor — null Upload | Compresso',
      metaDescription: 'Privater Bildkompressor ohne Foto-Upload. Ideal für sensible Dokumente. 100 % clientseitig.',
      h1: 'Privater Bildkompressor — null Bytes hochgeladen',
      answer: 'Compresso ist durch Architektur privat. Bilder werden per Canvas API auf deinem Gerät verarbeitet.',
      steps: ['App öffnen — offline nach erstem Laden.', 'Sensible Fotos lokal komprimieren.', 'Optimierte Datei nur an gewünschtes Ziel senden.'],
      faq: [
        { q: 'Sicher für Pass- oder Medizinfotos?', a: 'Ja. Das Original verlässt dein Gerät nicht.' },
        { q: 'Trackt die Website meine Bilder?', a: 'Keine Bilddaten übertragen. Alles lokal.' },
      ],
      related: ['compress-images-without-uploading', 'compress-image-under-2mb', 'heic-to-jpeg'],
    },
    it: {
      metaTitle: 'Compressore immagini privato — zero upload | Compresso',
      metaDescription: 'Compressore privato che non carica mai le tue foto. Ideale per documenti sensibili. 100% lato client.',
      h1: 'Compressore immagini privato — zero byte caricati',
      answer: 'Compresso è privato per architettura. Le immagini sono elaborate con Canvas API sul dispositivo.',
      steps: ['Apri l’app — funziona offline dopo il primo caricamento.', 'Comprimi foto sensibili localmente.', 'Carica il file ottimizzato solo dove scegli tu.'],
      faq: [
        { q: 'Sicuro per foto passaporto o mediche?', a: 'Sì. L’originale non lascia il dispositivo.' },
        { q: 'Il sito traccia le mie immagini?', a: 'Nessun dato immagine trasmesso. Tutto locale.' },
      ],
      related: ['compress-images-without-uploading', 'compress-image-under-2mb', 'heic-to-jpeg'],
    },
    'pt-BR': {
      metaTitle: 'Compressor de imagens privado — zero envio | Compresso',
      metaDescription: 'Compressor privado que nunca envia suas fotos. Ideal para documentos sensíveis. 100% no cliente.',
      h1: 'Compressor de imagens privado — zero bytes enviados',
      answer: 'O Compresso é privado por arquitetura. As imagens são processadas com Canvas API no seu dispositivo.',
      steps: ['Abra o app — funciona offline após o primeiro carregamento.', 'Comprima fotos sensíveis localmente.', 'Envie o arquivo otimizado apenas ao destino escolhido.'],
      faq: [
        { q: 'É seguro para fotos de passaporte ou médicas?', a: 'Sim. O original não sai do dispositivo.' },
        { q: 'O site rastreia minhas imagens?', a: 'Nenhum dado de imagem é transmitido. Tudo local.' },
      ],
      related: ['compress-images-without-uploading', 'compress-image-under-2mb', 'heic-to-jpeg'],
    },
    'zh-Hans': {
      metaTitle: '私密图片压缩工具 — 零上传 | Compresso',
      metaDescription: '从不不上传照片的私密压缩工具。适用于敏感文档。100% 客户端。',
      h1: '私密图片压缩 — 零字节上传',
      answer: 'Compresso 在架构层面保证隐私。图片通过 Canvas API 在您的设备上处理。',
      steps: ['打开应用——首次加载后可离线使用。', '在本地压缩敏感照片。', '仅将优化后的文件上传到您选择的目标。'],
      faq: [
        { q: '护照或医疗照片安全吗？', a: '安全。原图在压缩过程中不会离开设备。' },
        { q: '网站会追踪我的图片吗？', a: '不传输任何图片数据。完全本地处理。' },
      ],
      related: ['compress-images-without-uploading', 'compress-image-under-2mb', 'heic-to-jpeg'],
    },
  },
  'heic-to-jpeg': {
    en: {
      metaTitle: 'HEIC to JPEG — Convert In Your Browser, No Upload | Compresso',
      metaDescription:
        'Convert HEIC to JPEG in your browser without uploading. Compresso decodes iPhone HEIC/HEIF photos locally and outputs JPEG, WebP, or AVIF.',
      h1: 'Convert HEIC to JPEG in your browser',
      answer:
        'Compresso is one of the few tools that accepts HEIC input directly in the browser. Safari decodes natively; other browsers lazy-load a WASM decoder. Output JPEG, WebP, or AVIF — all locally.',
      steps: ['Open Compresso and drop your .heic file.', 'Choose JPEG or Auto format.', 'Download the converted image — nothing was uploaded.'],
      faq: [
        { q: 'Does it work on Windows and Android?', a: 'Yes. Non-Safari browsers load a WASM HEIC decoder on first use.' },
        { q: 'Will the JPEG be larger than the HEIC?', a: 'Compresso guarantees lossy output never exceeds the source size.' },
      ],
      related: ['heic-to-webp', 'compress-heic-online', 'private-image-compressor'],
    },
    es: {
      metaTitle: 'HEIC a JPEG — convertir en el navegador sin subir | Compresso',
      metaDescription: 'Convierte HEIC a JPEG en el navegador sin subir. Compresso decodifica fotos HEIC/HEIF de iPhone localmente.',
      h1: 'Convierte HEIC a JPEG en tu navegador',
      answer: 'Compresso acepta HEIC directamente en el navegador. Safari decodifica de forma nativa; otros navegadores cargan un decodificador WASM.',
      steps: ['Abre Compresso y suelta tu archivo .heic.', 'Elige JPEG o formato Auto.', 'Descarga la imagen convertida — sin subidas.'],
      faq: [
        { q: '¿Funciona en Windows y Android?', a: 'Sí. Los navegadores que no son Safari cargan un decodificador WASM.' },
        { q: '¿El JPEG será más grande que el HEIC?', a: 'Compresso garantiza que la salida con pérdida no supera el tamaño original.' },
      ],
      related: ['heic-to-webp', 'compress-heic-online', 'private-image-compressor'],
    },
    fr: {
      metaTitle: 'HEIC en JPEG — convertir dans le navigateur | Compresso',
      metaDescription: 'Convertissez HEIC en JPEG dans le navigateur sans envoi. Compresso décode les photos HEIC/HEIF d’iPhone localement.',
      h1: 'Convertir HEIC en JPEG dans votre navigateur',
      answer: 'Compresso accepte le HEIC directement dans le navigateur. Safari décode nativement ; les autres chargent un décodeur WASM.',
      steps: ['Ouvrez Compresso et déposez votre fichier .heic.', 'Choisissez JPEG ou Auto.', 'Téléchargez l’image convertie — rien n’a été envoyé.'],
      faq: [
        { q: 'Fonctionne sur Windows et Android ?', a: 'Oui. Les navigateurs non-Safari chargent un décodeur WASM HEIC.' },
        { q: 'Le JPEG sera-t-il plus gros que le HEIC ?', a: 'Compresso garantit que la sortie avec perte ne dépasse pas la source.' },
      ],
      related: ['heic-to-webp', 'compress-heic-online', 'private-image-compressor'],
    },
    de: {
      metaTitle: 'HEIC zu JPEG — im Browser konvertieren | Compresso',
      metaDescription: 'HEIC zu JPEG im Browser konvertieren ohne Upload. Compresso dekodiert iPhone-HEIC/HEIF lokal.',
      h1: 'HEIC zu JPEG im Browser konvertieren',
      answer: 'Compresso akzeptiert HEIC direkt im Browser. Safari dekodiert nativ; andere Browser laden einen WASM-Decoder.',
      steps: ['Compresso öffnen und .heic-Datei ablegen.', 'JPEG oder Auto wählen.', 'Konvertiertes Bild herunterladen — kein Upload.'],
      faq: [
        { q: 'Funktioniert auf Windows und Android?', a: 'Ja. Nicht-Safari-Browser laden einen WASM-HEIC-Decoder.' },
        { q: 'Wird das JPEG größer als HEIC?', a: 'Compresso garantiert, dass verlustbehaftete Ausgabe die Quellgröße nicht überschreitet.' },
      ],
      related: ['heic-to-webp', 'compress-heic-online', 'private-image-compressor'],
    },
    it: {
      metaTitle: 'HEIC in JPEG — convertire nel browser | Compresso',
      metaDescription: 'Converti HEIC in JPEG nel browser senza upload. Compresso decodifica HEIC/HEIF iPhone localmente.',
      h1: 'Converti HEIC in JPEG nel browser',
      answer: 'Compresso accetta HEIC direttamente nel browser. Safari decodifica nativamente; altri browser caricano un decoder WASM.',
      steps: ['Apri Compresso e rilascia il file .heic.', 'Scegli JPEG o Auto.', 'Scarica l’immagine convertita — nessun upload.'],
      faq: [
        { q: 'Funziona su Windows e Android?', a: 'Sì. I browser non Safari caricano un decoder WASM HEIC.' },
        { q: 'Il JPEG sarà più grande del HEIC?', a: 'Compresso garantisce che l’output lossy non superi la dimensione sorgente.' },
      ],
      related: ['heic-to-webp', 'compress-heic-online', 'private-image-compressor'],
    },
    'pt-BR': {
      metaTitle: 'HEIC para JPEG — converter no navegador | Compresso',
      metaDescription: 'Converta HEIC para JPEG no navegador sem envio. O Compresso decodifica fotos HEIC/HEIF do iPhone localmente.',
      h1: 'Converta HEIC para JPEG no navegador',
      answer: 'O Compresso aceita HEIC diretamente no navegador. Safari decodifica nativamente; outros carregam decodificador WASM.',
      steps: ['Abra o Compresso e solte o arquivo .heic.', 'Escolha JPEG ou Auto.', 'Baixe a imagem convertida — nada foi enviado.'],
      faq: [
        { q: 'Funciona no Windows e Android?', a: 'Sim. Navegadores não-Safari carregam decodificador WASM HEIC.' },
        { q: 'O JPEG ficará maior que o HEIC?', a: 'O Compresso garante que saída com perda não excede o tamanho original.' },
      ],
      related: ['heic-to-webp', 'compress-heic-online', 'private-image-compressor'],
    },
    'zh-Hans': {
      metaTitle: 'HEIC 转 JPEG — 浏览器内转换，无需上传 | Compresso',
      metaDescription: '在浏览器中将 HEIC 转为 JPEG，无需上传。Compresso 在本地解码 iPhone HEIC/HEIF 照片。',
      h1: '在浏览器中将 HEIC 转换为 JPEG',
      answer: 'Compresso 是少数可直接在浏览器中接受 HEIC 的工具之一。Safari 原生解码；其他浏览器懒加载 WASM 解码器。',
      steps: ['打开 Compresso 并拖入 .heic 文件。', '选择 JPEG 或自动格式。', '下载转换后的图片——全程无上传。'],
      faq: [
        { q: 'Windows 和 Android 可用吗？', a: '可以。非 Safari 浏览器会加载 WASM HEIC 解码器。' },
        { q: 'JPEG 会比 HEIC 更大吗？', a: 'Compresso 保证有损输出不超过源文件大小。' },
      ],
      related: ['heic-to-webp', 'compress-heic-online', 'private-image-compressor'],
    },
  },
};

// Remaining pages — compact but complete for all locales via fallback helper
const PAGE_STUBS = {
  'heic-to-webp': {
    en: {
      metaTitle: 'HEIC to WebP — Convert In Browser, No Upload | Compresso',
      metaDescription: 'Convert HEIC to WebP in your browser. Local decoding, modern format, zero server upload.',
      h1: 'Convert HEIC to WebP in your browser',
      answer: 'Compresso converts iPhone HEIC photos to WebP locally. WebP typically yields smaller files than JPEG at similar quality.',
      steps: ['Open Compresso.', 'Drop your HEIC file and select WebP or Auto.', 'Download the WebP — processed entirely on your device.'],
      faq: [{ q: 'Why WebP over JPEG?', a: 'WebP often produces smaller files at the same visual quality.' }],
      related: ['heic-to-jpeg', 'compress-heic-online', 'compress-images-online-free'],
    },
  },
  'compress-heic-online': {
    en: {
      metaTitle: 'Compress HEIC Online — Free, Private, In Browser | Compresso',
      metaDescription: 'Compress HEIC photos online without uploading. Reduce iPhone photo size locally in your browser.',
      h1: 'Compress HEIC photos online, privately',
      answer: 'Compresso accepts HEIC/HEIF directly and compresses or converts to JPEG, WebP, or AVIF — all in your browser with zero upload.',
      steps: ['Open the app.', 'Load your HEIC file.', 'Set max size or quality and download.'],
      faq: [{ q: 'Can I target a max file size?', a: 'Yes. Use maxSizeMB to fit upload limits like 2 MB forms.' }],
      related: ['heic-to-jpeg', 'heic-to-webp', 'compress-image-under-2mb'],
    },
  },
  'compress-image-under-2mb': {
    en: {
      metaTitle: 'Compress Image Under 2MB — For Forms & Uploads | Compresso',
      metaDescription: 'Compress images to under 2 MB for government forms, banking portals, and email. Browser-side, no upload.',
      h1: 'Compress an image to under 2 MB',
      answer: 'Compresso binary-searches quality to fit your size target. Set maxSizeMB: 2 and it finds the highest quality that stays under 2 MB — locally in your browser.',
      steps: ['Open Compresso.', 'Load your image.', 'Set max size to 2 MB and download.'],
      faq: [{ q: 'Works for passport or visa forms?', a: 'Yes. Processing is local — ideal for sensitive documents.' }],
      related: ['compress-image-for-email', 'private-image-compressor', 'compress-heic-online'],
    },
  },
  'compress-image-for-email': {
    en: {
      metaTitle: 'Compress Image for Email Attachment — Free | Compresso',
      metaDescription: 'Reduce image size for email attachments. Compress photos to fit provider limits without uploading to a third party.',
      h1: 'Compress images for email attachments',
      answer: 'Email providers often limit attachments to 10–25 MB. Compresso shrinks photos locally so they fit — without sending your images to a compression service.',
      steps: ['Open Compresso.', 'Load the photo.', 'Download the smaller file and attach to your email.'],
      faq: [{ q: 'Will quality be acceptable?', a: 'Compresso uses modern formats (WebP/AVIF) and never-bigger guarantee for lossy output.' }],
      related: ['compress-image-under-2mb', 'compress-images-online-free', 'offline-image-compressor'],
    },
  },
  'offline-image-compressor': {
    en: {
      metaTitle: 'Offline Image Compressor — PWA, No Upload | Compresso',
      metaDescription: 'Compress images offline after installing Compresso as a PWA. Works without internet, nothing uploaded.',
      h1: 'Offline image compressor',
      answer: 'Compresso works offline once loaded. Install it as a PWA and compress images anywhere — on a plane, in a secure environment, or with no connection.',
      steps: ['Open Compresso and install when prompted.', 'Go offline — the app still works.', 'Compress images locally with no network.'],
      faq: [{ q: 'Does offline mode upload later?', a: 'No. Compression never involves a server. Offline means fully local.' }],
      related: ['compress-images-online-free', 'private-image-compressor', 'compress-images-without-uploading'],
    },
  },
  'batch-compress-images': {
    en: {
      metaTitle: 'Batch Compress Images — Web Worker Parallel Batching | Compresso',
      metaDescription: 'Compress many images in parallel with compresso.js/pool Web Workers. Same API, non-blocking UI, client-side only.',
      h1: 'Batch compress images in parallel',
      answer: 'For developers, compresso.js/pool runs a resilient Web Worker pool to compress many files in parallel without blocking the UI. For consumers, the Compresso app supports multi-image workflows.',
      steps: ['Developers: npm install compresso.js and import createPool from compresso.js/pool.', 'Call pool.compressMany(files, options).', 'End users: open the Compresso app for batch compression.'],
      faq: [{ q: 'Does batch upload images to a server?', a: 'Never. All batch processing is client-side.' }],
      related: ['compress-images-online-free', 'offline-image-compressor', 'private-image-compressor'],
    },
  },
};

/** Fill missing locale content from English for stub pages. */
for (const slug of Object.keys(PAGE_STUBS)) {
  const en = PAGE_STUBS[slug].en;
  LANDING_PAGES[slug] = LANDING_PAGES[slug] || {};
  for (const locale of ['en', 'es', 'fr', 'de', 'it', 'pt-BR', 'zh-Hans']) {
    if (!LANDING_PAGES[slug][locale]) {
      LANDING_PAGES[slug][locale] = { ...en };
    }
  }
}

export const LANDING_UI = {
  en: {
    howTitle: 'How it works',
    faqTitle: 'Common questions',
    relatedTitle: 'Related',
    cta: 'Open the free app',
    devTitle: 'For developers',
    devBody: 'Embed compression in your upload flow:',
  },
  es: {
    howTitle: 'Cómo funciona',
    faqTitle: 'Preguntas comunes',
    relatedTitle: 'Relacionado',
    cta: 'Abrir la app gratis',
    devTitle: 'Para desarrolladores',
    devBody: 'Integra la compresión en tu flujo de subida:',
  },
  fr: {
    howTitle: 'Comment ça marche',
    faqTitle: 'Questions courantes',
    relatedTitle: 'Associé',
    cta: 'Ouvrir l’app gratuite',
    devTitle: 'Pour les développeurs',
    devBody: 'Intégrez la compression dans votre flux d’envoi :',
  },
  de: {
    howTitle: 'So funktioniert’s',
    faqTitle: 'Häufige Fragen',
    relatedTitle: 'Verwandt',
    cta: 'Kostenlose App öffnen',
    devTitle: 'Für Entwickler',
    devBody: 'Komprimierung in den Upload-Flow einbinden:',
  },
  it: {
    howTitle: 'Come funziona',
    faqTitle: 'Domande comuni',
    relatedTitle: 'Correlati',
    cta: 'Apri l’app gratuita',
    devTitle: 'Per sviluppatori',
    devBody: 'Integra la compressione nel flusso di upload:',
  },
  'pt-BR': {
    howTitle: 'Como funciona',
    faqTitle: 'Perguntas comuns',
    relatedTitle: 'Relacionado',
    cta: 'Abrir o app grátis',
    devTitle: 'Para desenvolvedores',
    devBody: 'Integre a compressão no fluxo de upload:',
  },
  'zh-Hans': {
    howTitle: '使用方法',
    faqTitle: '常见问题',
    relatedTitle: '相关页面',
    cta: '打开免费应用',
    devTitle: '开发者',
    devBody: '在上传流程中嵌入压缩：',
  },
};

export function getLandingPage(slug, locale) {
  const page = LANDING_PAGES[slug];
  if (!page) return null;
  const content = page[locale] || page.en;
  const ui = LANDING_UI[locale] || LANDING_UI.en;
  return { slug, content, ui };
}

export function landingJsonLd(content, slug) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: content.h1,
    description: content.metaDescription,
    mainEntity: content.faq?.length
      ? {
          '@type': 'FAQPage',
          mainEntity: content.faq.map((f) => ({
            '@type': 'Question',
            name: f.q,
            acceptedAnswer: { '@type': 'Answer', text: f.a },
          })),
        }
      : undefined,
  };
}

export function generateLandingStaticParams() {
  const params = [];
  for (const slug of LANDING_PAGE_SLUGS) {
    for (const locale of ['en', 'es', 'fr', 'de', 'it', 'pt-br', 'zh-hans']) {
      params.push({ locale, slug });
    }
  }
  return params;
}
