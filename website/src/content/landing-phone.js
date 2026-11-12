/**
 * Landing pages for people with a photo that is too big: the phone, a size
 * limit, an upload form. Every locale has its own copy (none fall back to
 * English), and the steps use the iPhone app's own words in that language
 * (mobile/src/i18n/locales), so what a visitor reads is what they will tap.
 *
 * Facts these pages rely on, from the app (mobile/src/engine/presets.ts):
 * Message is about 400 KB a photo; Email keeps all photos together under 5 MB;
 * Upload form offers 1 MB (default), 500 KB, 200 KB and 2 MB and saves JPEG;
 * sizes are decimal (1 MB = 1,000,000 bytes); a file never gets bigger.
 * The web app's Size limit (under Dimensions) takes any size in MB.
 */

const SLUGS = {
  iphone: 'reduce-photo-size-iphone',
  mb1: 'compress-photo-to-1mb',
  kb500: 'compress-photo-to-500kb',
  kb200: 'compress-photo-to-200kb',
  tooLarge: 'photo-too-large-to-upload',
};

const RELATED = {
  [SLUGS.iphone]: [SLUGS.tooLarge, SLUGS.mb1, 'compress-image-for-email'],
  [SLUGS.mb1]: [SLUGS.kb500, SLUGS.kb200, SLUGS.tooLarge],
  [SLUGS.kb500]: [SLUGS.mb1, SLUGS.kb200, SLUGS.tooLarge],
  [SLUGS.kb200]: [SLUGS.kb500, SLUGS.mb1, SLUGS.tooLarge],
  [SLUGS.tooLarge]: [SLUGS.mb1, SLUGS.kb200, SLUGS.iphone],
};

/** Copy per page, then per locale. `related` and `audience` are added below. */
const COPY = {
  [SLUGS.iphone]: {
    en: {
      metaTitle: 'Reduce Photo Size on iPhone, Free and Private | Compresso',
      metaDescription:
        'Make iPhone photos smaller in a few taps. Say what they are for and Compresso picks the size. Free, no ads, nothing uploaded.',
      h1: 'How to reduce photo size on iPhone',
      answer:
        'iPhone photos are often several megabytes each, too big for many emails, chats and forms. Compresso is a free iPhone app that makes them smaller on the phone itself. You say what the photos are for and it picks the right size. Your originals stay untouched and nothing is uploaded.',
      steps: [
        'Install Compresso from the App Store and tap Choose photos.',
        'Say what they are for: Message, Email, Upload form, Save space or Website.',
        'Tap Make them lighter, then Save to Photos or Share.',
      ],
      faq: [
        {
          q: 'Will the photos look worse?',
          a: 'Only as much as the purpose needs. For a message each photo ends up around 400 KB, which still looks sharp on a phone. Drag across the photo to compare before and after. Compresso never makes a file bigger than the original.',
        },
        {
          q: 'What happens to my original photos?',
          a: 'They stay exactly as they are. The smaller copies are saved in Photos next to them, under the same date.',
        },
        {
          q: 'Are my photos uploaded anywhere?',
          a: 'No. Everything happens on your iPhone. There is no account, no ads and no tracking.',
        },
        {
          q: 'Can I do it without installing an app?',
          a: 'Yes. The free web app does the same in Safari or any other browser, also without uploading your photos.',
        },
      ],
    },
    es: {
      metaTitle: 'Reducir el tamaño de fotos en iPhone, gratis y privado | Compresso',
      metaDescription:
        'Haz más ligeras las fotos del iPhone en pocos toques. Di para qué son y Compresso elige el tamaño. Gratis, sin anuncios, sin subir nada.',
      h1: 'Cómo reducir el tamaño de una foto en iPhone',
      answer:
        'Las fotos del iPhone suelen pesar varios megas cada una, demasiado para muchos correos, chats y formularios. Compresso es una app gratuita para iPhone que las hace más ligeras en el propio teléfono. Dices para qué son las fotos y elige el tamaño adecuado. Tus originales no se tocan y no se sube nada.',
      steps: [
        'Instala Compresso desde el App Store y toca Elegir fotos.',
        'Di para qué son: Mensaje, Correo, Formulario, Ahorrar espacio o Sitio web.',
        'Toca Hacerlas más ligeras y luego Guardar en Fotos o Compartir.',
      ],
      faq: [
        {
          q: '¿Las fotos se verán peor?',
          a: 'Solo lo que exige el uso. Para un mensaje cada foto queda en unos 400 KB, que en el móvil se ve nítida. Desliza sobre la foto para comparar el antes y el después. Compresso nunca hace un archivo más pesado que el original.',
        },
        {
          q: '¿Qué pasa con mis fotos originales?',
          a: 'Se quedan tal cual. Las copias ligeras se guardan en Fotos junto a ellas, con la misma fecha.',
        },
        {
          q: '¿Se suben mis fotos a algún sitio?',
          a: 'No. Todo ocurre en tu iPhone. Sin cuenta, sin anuncios y sin rastreo.',
        },
        {
          q: '¿Puedo hacerlo sin instalar una app?',
          a: 'Sí. La web app gratuita hace lo mismo en Safari o en cualquier navegador, también sin subir tus fotos.',
        },
      ],
    },
    fr: {
      metaTitle: 'Réduire la taille des photos sur iPhone, gratuit et privé | Compresso',
      metaDescription:
        'Allégez les photos de votre iPhone en quelques touches. Dites à quoi elles servent, Compresso choisit la taille. Gratuit, sans pub, rien n’est envoyé.',
      h1: 'Comment réduire la taille d’une photo sur iPhone',
      answer:
        'Les photos d’iPhone pèsent souvent plusieurs mégaoctets, trop pour beaucoup d’e-mails, de messageries et de formulaires. Compresso est une app iPhone gratuite qui les allège sur le téléphone lui-même. Vous dites à quoi servent les photos, elle choisit la bonne taille. Vos originaux restent intacts et rien n’est envoyé.',
      steps: [
        'Installez Compresso depuis l’App Store et touchez Choisir des photos.',
        'Dites à quoi elles servent : Message, E-mail, Formulaire, Gagner de la place ou Site web.',
        'Touchez Les alléger, puis Enregistrer dans Photos ou Partager.',
      ],
      faq: [
        {
          q: 'Les photos seront-elles moins belles ?',
          a: 'Juste ce qu’il faut pour l’usage. Pour un message, chaque photo fait environ 400 Ko et reste nette sur un téléphone. Glissez sur la photo pour comparer avant et après. Compresso ne rend jamais un fichier plus lourd que l’original.',
        },
        {
          q: 'Que deviennent mes photos originales ?',
          a: 'Elles restent exactement comme elles sont. Les copies allégées sont enregistrées dans Photos à côté d’elles, à la même date.',
        },
        {
          q: 'Mes photos sont-elles envoyées quelque part ?',
          a: 'Non. Tout se passe sur votre iPhone. Pas de compte, pas de pub, pas de suivi.',
        },
        {
          q: 'Puis-je le faire sans installer d’app ?',
          a: 'Oui. L’app web gratuite fait la même chose dans Safari ou tout autre navigateur, sans envoyer vos photos non plus.',
        },
      ],
    },
    de: {
      metaTitle: 'Fotogröße auf dem iPhone verkleinern, kostenlos und privat | Compresso',
      metaDescription:
        'Mach iPhone-Fotos mit wenigen Tippern kleiner. Sag, wofür sie sind, und Compresso wählt die Größe. Kostenlos, ohne Werbung, ohne Upload.',
      h1: 'So verkleinerst du Fotos auf dem iPhone',
      answer:
        'iPhone-Fotos sind oft mehrere Megabyte groß, zu groß für viele E-Mails, Chats und Formulare. Compresso ist eine kostenlose iPhone-App, die sie direkt auf dem Handy kleiner macht. Du sagst, wofür die Fotos sind, und sie wählt die passende Größe. Deine Originale bleiben unverändert und nichts wird hochgeladen.',
      steps: [
        'Installiere Compresso aus dem App Store und tippe auf Fotos auswählen.',
        'Sag, wofür sie sind: Nachricht, E-Mail, Formular, Speicher sparen oder Website.',
        'Tippe auf Leichter machen und dann auf In Fotos sichern oder Teilen.',
      ],
      faq: [
        {
          q: 'Sehen die Fotos danach schlechter aus?',
          a: 'Nur so weit, wie der Zweck es verlangt. Für eine Nachricht landet jedes Foto bei etwa 400 KB und wirkt auf dem Handy weiter scharf. Wisch über das Foto, um vorher und nachher zu vergleichen. Compresso macht eine Datei nie größer als das Original.',
        },
        {
          q: 'Was passiert mit meinen Originalfotos?',
          a: 'Sie bleiben genau so, wie sie sind. Die kleineren Kopien landen in Fotos direkt daneben, mit demselben Datum.',
        },
        {
          q: 'Werden meine Fotos irgendwo hochgeladen?',
          a: 'Nein. Alles passiert auf deinem iPhone. Kein Konto, keine Werbung, kein Tracking.',
        },
        {
          q: 'Geht das auch ohne App?',
          a: 'Ja. Die kostenlose Web-App macht dasselbe in Safari oder jedem anderen Browser, ebenfalls ohne Upload.',
        },
      ],
    },
    it: {
      metaTitle: 'Ridurre le dimensioni delle foto su iPhone, gratis e privato | Compresso',
      metaDescription:
        'Alleggerisci le foto dell’iPhone in pochi tocchi. Di’ a cosa servono e Compresso sceglie la dimensione. Gratis, senza pubblicità, niente caricato.',
      h1: 'Come ridurre le dimensioni di una foto su iPhone',
      answer:
        'Le foto dell’iPhone pesano spesso diversi megabyte, troppo per molte email, chat e moduli. Compresso è un’app gratuita per iPhone che le alleggerisce direttamente sul telefono. Dici a cosa servono le foto e sceglie la dimensione giusta. Gli originali restano intatti e niente viene caricato.',
      steps: [
        'Installa Compresso dall’App Store e tocca Scegli le foto.',
        'Di’ a cosa servono: Messaggio, Email, Modulo online, Liberare spazio o Sito web.',
        'Tocca Alleggeriscile, poi Salva in Foto o Condividi.',
      ],
      faq: [
        {
          q: 'Le foto si vedranno peggio?',
          a: 'Solo quanto serve allo scopo. Per un messaggio ogni foto arriva a circa 400 KB e sul telefono resta nitida. Scorri sulla foto per confrontare prima e dopo. Compresso non rende mai un file più pesante dell’originale.',
        },
        {
          q: 'Cosa succede alle foto originali?',
          a: 'Restano esattamente come sono. Le copie leggere vengono salvate in Foto accanto a loro, con la stessa data.',
        },
        {
          q: 'Le mie foto vengono caricate da qualche parte?',
          a: 'No. Tutto avviene sul tuo iPhone. Nessun account, nessuna pubblicità, nessun tracciamento.',
        },
        {
          q: 'Posso farlo senza installare un’app?',
          a: 'Sì. La web app gratuita fa lo stesso in Safari o in qualsiasi browser, anche lei senza caricare le foto.',
        },
      ],
    },
    'pt-BR': {
      metaTitle: 'Diminuir o tamanho de fotos no iPhone, grátis e privado | Compresso',
      metaDescription:
        'Deixe as fotos do iPhone mais leves em poucos toques. Diga para que são e o Compresso escolhe o tamanho. Grátis, sem anúncios, nada é enviado.',
      h1: 'Como diminuir o tamanho de uma foto no iPhone',
      answer:
        'As fotos do iPhone costumam ter vários megas cada, grandes demais para muitos e-mails, conversas e formulários. O Compresso é um app gratuito para iPhone que deixa as fotos mais leves no próprio celular. Você diz para que são as fotos e ele escolhe o tamanho certo. Os originais ficam intactos e nada é enviado.',
      steps: [
        'Instale o Compresso pela App Store e toque em Escolher fotos.',
        'Diga para que são: Mensagem, E-mail, Formulário, Liberar espaço ou Site.',
        'Toque em Deixar mais leves e depois em Salvar em Fotos ou Compartilhar.',
      ],
      faq: [
        {
          q: 'As fotos vão ficar piores?',
          a: 'Só o necessário para o uso. Para mensagem, cada foto fica com uns 400 KB e continua nítida no celular. Arraste sobre a foto para comparar antes e depois. O Compresso nunca deixa um arquivo maior que o original.',
        },
        {
          q: 'O que acontece com as minhas fotos originais?',
          a: 'Ficam exatamente como estão. As cópias leves são salvas em Fotos ao lado delas, com a mesma data.',
        },
        {
          q: 'Minhas fotos são enviadas para algum lugar?',
          a: 'Não. Tudo acontece no seu iPhone. Sem conta, sem anúncios e sem rastreamento.',
        },
        {
          q: 'Dá para fazer sem instalar um app?',
          a: 'Dá. O web app gratuito faz o mesmo no Safari ou em qualquer navegador, também sem enviar suas fotos.',
        },
      ],
    },
    'zh-Hans': {
      metaTitle: '在 iPhone 上缩小照片大小，免费且私密 | Compresso',
      metaDescription:
        '轻点几下就能让 iPhone 照片变小。告诉它照片的用途，Compresso 自动选好大小。免费、无广告、不上传。',
      h1: '如何在 iPhone 上缩小照片大小',
      answer:
        'iPhone 拍的照片往往每张都有好几 MB，发邮件、聊天或填表时常常太大。Compresso 是一款免费的 iPhone 应用，直接在手机上把照片变小。你只需告诉它照片用来做什么，它就会选出合适的大小。原图保持不变，什么都不会上传。',
      steps: [
        '从 App Store 安装 Compresso，轻点“选择照片”。',
        '告诉它用途：发消息、发邮件、上传表格、节省空间或网站。',
        '轻点“开始压缩”，然后“存储到照片”或“分享”。',
      ],
      faq: [
        {
          q: '照片会变得难看吗？',
          a: '只压到用途所需的程度。发消息时每张约 400 KB，在手机上看依然清晰。在照片上滑动即可对比前后效果。Compresso 绝不会让文件比原图更大。',
        },
        {
          q: '我的原图会怎样？',
          a: '原图完全不变。压缩后的副本存放在“照片”中原图旁边，日期相同。',
        },
        {
          q: '我的照片会被上传吗？',
          a: '不会。一切都在你的 iPhone 上完成。没有账号，没有广告，没有追踪。',
        },
        {
          q: '不装应用也能做吗？',
          a: '可以。免费的网页版在 Safari 或任何浏览器里都能做到，同样不会上传你的照片。',
        },
      ],
    },
  },

  [SLUGS.mb1]: {
    en: {
      metaTitle: 'Compress a Photo to Under 1 MB, Free and Private | Compresso',
      metaDescription:
        'Get any photo under 1 MB for an upload form, application or email, at the best quality that fits. On iPhone or in your browser, nothing uploaded.',
      h1: 'Compress a photo to under 1 MB',
      answer:
        'Many forms only accept photos under 1 MB. Compresso finds the highest quality that still fits under the limit, so the photo stays as sharp as it can. It works on your iPhone or in your browser, and the photo never leaves your device, which matters for IDs and documents.',
      steps: [
        'Open Compresso on your iPhone and choose the photo.',
        'Pick Upload form. The limit starts at 1 MB.',
        'Tap Make it lighter, then save or share the result.',
      ],
      faq: [
        {
          q: 'I am on a computer or an Android phone.',
          a: 'Open the free web app, open Dimensions, set Size limit to 1 MB and add the photo. It works in any modern browser.',
        },
        {
          q: 'Is 1 MB the same as 1,024 KB?',
          a: 'Forms disagree on this. Compresso aims for 1,000,000 bytes, which fits under either reading.',
        },
        {
          q: 'What if a photo cannot get under 1 MB?',
          a: 'Compresso also reduces the dimensions when needed, so almost every photo fits. If one still does not, it tells you instead of failing quietly.',
        },
      ],
    },
    es: {
      metaTitle: 'Comprimir una foto a menos de 1 MB, gratis y privado | Compresso',
      metaDescription:
        'Deja cualquier foto por debajo de 1 MB para un formulario, una solicitud o un correo, con la mejor calidad posible. En iPhone o en el navegador, sin subir nada.',
      h1: 'Comprime una foto a menos de 1 MB',
      answer:
        'Muchos formularios solo aceptan fotos de menos de 1 MB. Compresso busca la mayor calidad que aún cabe en el límite, así la foto queda lo más nítida posible. Funciona en tu iPhone o en el navegador, y la foto nunca sale de tu dispositivo, algo importante con documentos de identidad.',
      steps: [
        'Abre Compresso en tu iPhone y elige la foto.',
        'Elige Formulario. El límite empieza en 1 MB.',
        'Toca Hacerla más ligera y guarda o comparte el resultado.',
      ],
      faq: [
        {
          q: 'Estoy en un ordenador o en un Android.',
          a: 'Abre la web app gratuita, abre Dimensiones, pon el Límite de peso en 1 MB y añade la foto. Funciona en cualquier navegador moderno.',
        },
        {
          q: '¿1 MB es lo mismo que 1024 KB?',
          a: 'Los formularios no se ponen de acuerdo. Compresso apunta a 1 000 000 bytes, que cabe en cualquiera de las dos lecturas.',
        },
        {
          q: '¿Y si una foto no baja de 1 MB?',
          a: 'Compresso también reduce las dimensiones cuando hace falta, así que casi todas caben. Si alguna no, te lo dice en vez de fallar en silencio.',
        },
      ],
    },
    fr: {
      metaTitle: 'Compresser une photo sous 1 Mo, gratuit et privé | Compresso',
      metaDescription:
        'Passez n’importe quelle photo sous 1 Mo pour un formulaire, un dossier ou un e-mail, avec la meilleure qualité possible. Sur iPhone ou dans le navigateur, sans envoi.',
      h1: 'Compresser une photo sous 1 Mo',
      answer:
        'Beaucoup de formulaires n’acceptent que des photos de moins de 1 Mo. Compresso cherche la meilleure qualité qui tient encore sous la limite, pour une photo aussi nette que possible. Il fonctionne sur votre iPhone ou dans le navigateur, et la photo ne quitte jamais votre appareil, ce qui compte pour une pièce d’identité.',
      steps: [
        'Ouvrez Compresso sur votre iPhone et choisissez la photo.',
        'Choisissez Formulaire. La limite commence à 1 Mo.',
        'Touchez L’alléger, puis enregistrez ou partagez le résultat.',
      ],
      faq: [
        {
          q: 'Je suis sur ordinateur ou sur Android.',
          a: 'Ouvrez l’app web gratuite, ouvrez Dimensions, réglez le Poids maximal sur 1 Mo et ajoutez la photo. Elle fonctionne dans tout navigateur récent.',
        },
        {
          q: '1 Mo, c’est 1 024 Ko ?',
          a: 'Les formulaires ne sont pas d’accord entre eux. Compresso vise 1 000 000 octets, ce qui passe dans les deux cas.',
        },
        {
          q: 'Et si une photo ne descend pas sous 1 Mo ?',
          a: 'Compresso réduit aussi les dimensions si besoin, donc presque toutes les photos passent. Sinon, il vous le dit au lieu d’échouer sans rien dire.',
        },
      ],
    },
    de: {
      metaTitle: 'Foto unter 1 MB komprimieren, kostenlos und privat | Compresso',
      metaDescription:
        'Bring jedes Foto unter 1 MB, für Formular, Bewerbung oder E-Mail, in der besten Qualität, die passt. Auf dem iPhone oder im Browser, ohne Upload.',
      h1: 'Foto auf unter 1 MB komprimieren',
      answer:
        'Viele Formulare nehmen nur Fotos unter 1 MB an. Compresso sucht die höchste Qualität, die noch unter die Grenze passt, damit das Foto so scharf wie möglich bleibt. Es läuft auf deinem iPhone oder im Browser, und das Foto verlässt nie dein Gerät, was bei Ausweisen und Dokumenten zählt.',
      steps: [
        'Öffne Compresso auf dem iPhone und wähle das Foto.',
        'Wähle Formular. Die Grenze steht zuerst auf 1 MB.',
        'Tippe auf Leichter machen und sichere oder teile das Ergebnis.',
      ],
      faq: [
        {
          q: 'Ich bin am Computer oder auf Android.',
          a: 'Öffne die kostenlose Web-App, öffne Maße, stell das Größenlimit auf 1 MB und füge das Foto hinzu. Sie läuft in jedem aktuellen Browser.',
        },
        {
          q: 'Ist 1 MB dasselbe wie 1.024 KB?',
          a: 'Da sind sich Formulare nicht einig. Compresso zielt auf 1.000.000 Byte, das passt bei beiden Lesarten.',
        },
        {
          q: 'Und wenn ein Foto nicht unter 1 MB kommt?',
          a: 'Compresso verkleinert bei Bedarf auch die Abmessungen, daher passt fast jedes Foto. Wenn nicht, sagt es dir das, statt still zu scheitern.',
        },
      ],
    },
    it: {
      metaTitle: 'Comprimere una foto sotto 1 MB, gratis e privato | Compresso',
      metaDescription:
        'Porta qualsiasi foto sotto 1 MB per un modulo, una domanda o un’email, con la qualità migliore che ci sta. Su iPhone o nel browser, senza caricare niente.',
      h1: 'Comprimi una foto sotto 1 MB',
      answer:
        'Molti moduli accettano solo foto sotto 1 MB. Compresso trova la qualità più alta che rientra ancora nel limite, così la foto resta il più nitida possibile. Funziona sull’iPhone o nel browser, e la foto non lascia mai il dispositivo, cosa importante per documenti d’identità.',
      steps: [
        'Apri Compresso sull’iPhone e scegli la foto.',
        'Scegli Modulo online. Il limite parte da 1 MB.',
        'Tocca Alleggeriscila, poi salva o condividi il risultato.',
      ],
      faq: [
        {
          q: 'Sono su un computer o su Android.',
          a: 'Apri la web app gratuita, apri Dimensioni, imposta il Limite di peso a 1 MB e aggiungi la foto. Funziona in qualsiasi browser recente.',
        },
        {
          q: '1 MB è uguale a 1024 KB?',
          a: 'I moduli non sono d’accordo. Compresso punta a 1.000.000 di byte, che rientra in entrambe le letture.',
        },
        {
          q: 'E se una foto non scende sotto 1 MB?',
          a: 'Compresso riduce anche le dimensioni quando serve, quindi quasi ogni foto ci sta. Se una non ci riesce, te lo dice invece di fallire in silenzio.',
        },
      ],
    },
    'pt-BR': {
      metaTitle: 'Comprimir uma foto para menos de 1 MB, grátis e privado | Compresso',
      metaDescription:
        'Deixe qualquer foto abaixo de 1 MB para formulário, inscrição ou e-mail, com a melhor qualidade que cabe. No iPhone ou no navegador, sem enviar nada.',
      h1: 'Comprima uma foto para menos de 1 MB',
      answer:
        'Muitos formulários só aceitam fotos com menos de 1 MB. O Compresso encontra a maior qualidade que ainda cabe no limite, então a foto fica o mais nítida possível. Funciona no iPhone ou no navegador, e a foto nunca sai do seu aparelho, o que importa com documentos como RG e CNH.',
      steps: [
        'Abra o Compresso no iPhone e escolha a foto.',
        'Escolha Formulário. O limite começa em 1 MB.',
        'Toque em Deixar mais leve e salve ou compartilhe o resultado.',
      ],
      faq: [
        {
          q: 'Estou no computador ou num Android.',
          a: 'Abra o web app gratuito, abra Dimensões, coloque o Limite de tamanho em 1 MB e adicione a foto. Funciona em qualquer navegador atual.',
        },
        {
          q: '1 MB é o mesmo que 1024 KB?',
          a: 'Os formulários não concordam entre si. O Compresso mira em 1.000.000 de bytes, que cabe nas duas leituras.',
        },
        {
          q: 'E se a foto não ficar abaixo de 1 MB?',
          a: 'O Compresso também reduz as dimensões quando precisa, então quase toda foto cabe. Se alguma não couber, ele avisa em vez de falhar calado.',
        },
      ],
    },
    'zh-Hans': {
      metaTitle: '把照片压缩到 1 MB 以下，免费且私密 | Compresso',
      metaDescription:
        '把任何照片压到 1 MB 以下，用于上传表格、报名或邮件，并保留能放下的最佳画质。iPhone 或浏览器都能用，不上传。',
      h1: '把照片压缩到 1 MB 以下',
      answer:
        '很多表格只接受 1 MB 以下的照片。Compresso 会在限制之内找到最高的画质，让照片尽量清晰。它在你的 iPhone 或浏览器里运行，照片从不离开你的设备，这对证件照和文件尤其重要。',
      steps: [
        '在 iPhone 上打开 Compresso，选择照片。',
        '选择“上传表格”，默认限制为 1 MB。',
        '轻点“开始压缩”，然后存储或分享结果。',
      ],
      faq: [
        {
          q: '我用的是电脑或安卓手机。',
          a: '打开免费的网页版，展开“尺寸”，把“体积上限”设为 1 MB，再添加照片。任何较新的浏览器都能用。',
        },
        {
          q: '1 MB 等于 1024 KB 吗？',
          a: '各个表格的算法不一样。Compresso 以 1,000,000 字节为目标，两种算法下都不会超出。',
        },
        {
          q: '如果照片压不到 1 MB 以下怎么办？',
          a: '必要时 Compresso 还会缩小尺寸，所以几乎所有照片都能达标。如果仍然不行，它会明确告诉你，而不是悄悄失败。',
        },
      ],
    },
  },

  [SLUGS.kb500]: {
    en: {
      metaTitle: 'Compress a Photo to Under 500 KB, Free and Private | Compresso',
      metaDescription:
        'Fit a photo under 500 KB for a job portal, school form or profile picture, at the best quality that fits. On iPhone or in your browser, nothing uploaded.',
      h1: 'Compress a photo to under 500 KB',
      answer:
        'Job portals, school systems and profile pictures often cap photos at 500 KB. Compresso picks the highest quality that fits under that, and shrinks the dimensions only when it has to. The photo is processed on your iPhone or in your browser and never uploaded.',
      steps: [
        'Open Compresso on your iPhone and choose the photo.',
        'Pick Upload form, then 500 KB under Each photo under.',
        'Tap Make it lighter, then save or share the result.',
      ],
      faq: [
        {
          q: 'I am on a computer or an Android phone.',
          a: 'Open the free web app, open Dimensions, set Size limit to 0.5 MB and add the photo.',
        },
        {
          q: 'Will a 500 KB photo still look good?',
          a: 'For a form or a profile picture, yes. 500 KB is plenty for a sharp photo at the sizes these sites show. Drag across the result to compare it with the original before you upload.',
        },
        {
          q: 'Can I do several photos at once?',
          a: 'Yes. Choose them all, and each one is made to fit under the limit on its own.',
        },
      ],
    },
    es: {
      metaTitle: 'Comprimir una foto a menos de 500 KB, gratis y privado | Compresso',
      metaDescription:
        'Deja una foto por debajo de 500 KB para un portal de empleo, un formulario escolar o una foto de perfil, con la mejor calidad posible. En iPhone o en el navegador, sin subir nada.',
      h1: 'Comprime una foto a menos de 500 KB',
      answer:
        'Los portales de empleo, los sistemas escolares y las fotos de perfil suelen limitar las fotos a 500 KB. Compresso elige la mayor calidad que cabe y solo reduce las dimensiones si hace falta. La foto se procesa en tu iPhone o en el navegador y nunca se sube.',
      steps: [
        'Abre Compresso en tu iPhone y elige la foto.',
        'Elige Formulario y luego 500 KB en Cada foto por debajo de.',
        'Toca Hacerla más ligera y guarda o comparte el resultado.',
      ],
      faq: [
        {
          q: 'Estoy en un ordenador o en un Android.',
          a: 'Abre la web app gratuita, abre Dimensiones, pon el Límite de peso en 0,5 MB y añade la foto.',
        },
        {
          q: '¿Una foto de 500 KB se verá bien?',
          a: 'Para un formulario o una foto de perfil, sí. 500 KB dan de sobra para una foto nítida al tamaño en que se muestra. Desliza sobre el resultado para compararlo con el original antes de subirlo.',
        },
        {
          q: '¿Puedo hacer varias fotos a la vez?',
          a: 'Sí. Elígelas todas y cada una se ajusta al límite por separado.',
        },
      ],
    },
    fr: {
      metaTitle: 'Compresser une photo sous 500 Ko, gratuit et privé | Compresso',
      metaDescription:
        'Faites passer une photo sous 500 Ko pour un site d’emploi, un dossier scolaire ou une photo de profil, avec la meilleure qualité possible. Sur iPhone ou dans le navigateur, sans envoi.',
      h1: 'Compresser une photo sous 500 Ko',
      answer:
        'Les sites d’emploi, les plateformes scolaires et les photos de profil limitent souvent les photos à 500 Ko. Compresso choisit la meilleure qualité qui tient sous cette limite et ne réduit les dimensions que si nécessaire. La photo est traitée sur votre iPhone ou dans le navigateur, jamais envoyée.',
      steps: [
        'Ouvrez Compresso sur votre iPhone et choisissez la photo.',
        'Choisissez Formulaire, puis 500 Ko sous Chaque photo sous.',
        'Touchez L’alléger, puis enregistrez ou partagez le résultat.',
      ],
      faq: [
        {
          q: 'Je suis sur ordinateur ou sur Android.',
          a: 'Ouvrez l’app web gratuite, ouvrez Dimensions, réglez le Poids maximal sur 0,5 Mo et ajoutez la photo.',
        },
        {
          q: 'Une photo de 500 Ko sera-t-elle encore belle ?',
          a: 'Pour un formulaire ou une photo de profil, oui. 500 Ko suffisent largement pour une photo nette à la taille affichée. Glissez sur le résultat pour le comparer à l’original avant l’envoi.',
        },
        {
          q: 'Puis-je traiter plusieurs photos à la fois ?',
          a: 'Oui. Choisissez-les toutes, chacune est ajustée à la limite séparément.',
        },
      ],
    },
    de: {
      metaTitle: 'Foto unter 500 KB komprimieren, kostenlos und privat | Compresso',
      metaDescription:
        'Bring ein Foto unter 500 KB, für Jobportal, Schulformular oder Profilbild, in der besten Qualität, die passt. Auf dem iPhone oder im Browser, ohne Upload.',
      h1: 'Foto auf unter 500 KB komprimieren',
      answer:
        'Jobportale, Schulsysteme und Profilbilder begrenzen Fotos oft auf 500 KB. Compresso wählt die höchste Qualität, die darunter passt, und verkleinert die Abmessungen nur, wenn es sein muss. Das Foto wird auf deinem iPhone oder im Browser verarbeitet und nie hochgeladen.',
      steps: [
        'Öffne Compresso auf dem iPhone und wähle das Foto.',
        'Wähle Formular und dann 500 KB bei Jedes Foto unter.',
        'Tippe auf Leichter machen und sichere oder teile das Ergebnis.',
      ],
      faq: [
        {
          q: 'Ich bin am Computer oder auf Android.',
          a: 'Öffne die kostenlose Web-App, öffne Maße, stell das Größenlimit auf 0,5 MB und füge das Foto hinzu.',
        },
        {
          q: 'Sieht ein 500-KB-Foto noch gut aus?',
          a: 'Für ein Formular oder Profilbild, ja. 500 KB reichen locker für ein scharfes Foto in der Größe, in der es gezeigt wird. Wisch über das Ergebnis, um es vor dem Hochladen mit dem Original zu vergleichen.',
        },
        {
          q: 'Geht das mit mehreren Fotos auf einmal?',
          a: 'Ja. Wähl sie alle aus, jedes wird einzeln unter die Grenze gebracht.',
        },
      ],
    },
    it: {
      metaTitle: 'Comprimere una foto sotto 500 KB, gratis e privato | Compresso',
      metaDescription:
        'Porta una foto sotto 500 KB per un portale di lavoro, un modulo scolastico o una foto profilo, con la qualità migliore che ci sta. Su iPhone o nel browser, senza caricare niente.',
      h1: 'Comprimi una foto sotto 500 KB',
      answer:
        'Portali di lavoro, piattaforme scolastiche e foto profilo limitano spesso le foto a 500 KB. Compresso sceglie la qualità più alta che ci sta e riduce le dimensioni solo se serve. La foto viene elaborata sull’iPhone o nel browser e non viene mai caricata.',
      steps: [
        'Apri Compresso sull’iPhone e scegli la foto.',
        'Scegli Modulo online, poi 500 KB in Ogni foto sotto.',
        'Tocca Alleggeriscila, poi salva o condividi il risultato.',
      ],
      faq: [
        {
          q: 'Sono su un computer o su Android.',
          a: 'Apri la web app gratuita, apri Dimensioni, imposta il Limite di peso a 0,5 MB e aggiungi la foto.',
        },
        {
          q: 'Una foto da 500 KB si vedrà ancora bene?',
          a: 'Per un modulo o una foto profilo, sì. 500 KB bastano e avanzano per una foto nitida alla dimensione in cui viene mostrata. Scorri sul risultato per confrontarlo con l’originale prima di caricarlo.',
        },
        {
          q: 'Posso fare più foto insieme?',
          a: 'Sì. Sceglile tutte e ognuna viene portata sotto il limite per conto suo.',
        },
      ],
    },
    'pt-BR': {
      metaTitle: 'Comprimir uma foto para menos de 500 KB, grátis e privado | Compresso',
      metaDescription:
        'Deixe uma foto abaixo de 500 KB para site de vagas, matrícula ou foto de perfil, com a melhor qualidade que cabe. No iPhone ou no navegador, sem enviar nada.',
      h1: 'Comprima uma foto para menos de 500 KB',
      answer:
        'Sites de vagas, sistemas de escola e fotos de perfil costumam limitar as fotos a 500 KB. O Compresso escolhe a maior qualidade que cabe e só reduz as dimensões quando precisa. A foto é processada no iPhone ou no navegador e nunca é enviada.',
      steps: [
        'Abra o Compresso no iPhone e escolha a foto.',
        'Escolha Formulário e depois 500 KB em Cada foto abaixo de.',
        'Toque em Deixar mais leve e salve ou compartilhe o resultado.',
      ],
      faq: [
        {
          q: 'Estou no computador ou num Android.',
          a: 'Abra o web app gratuito, abra Dimensões, coloque o Limite de tamanho em 0,5 MB e adicione a foto.',
        },
        {
          q: 'Uma foto de 500 KB ainda fica boa?',
          a: 'Para formulário ou foto de perfil, fica. 500 KB sobram para uma foto nítida no tamanho em que ela aparece. Arraste sobre o resultado para comparar com o original antes de enviar.',
        },
        {
          q: 'Dá para fazer várias fotos de uma vez?',
          a: 'Dá. Escolha todas e cada uma é ajustada ao limite separadamente.',
        },
      ],
    },
    'zh-Hans': {
      metaTitle: '把照片压缩到 500 KB 以下，免费且私密 | Compresso',
      metaDescription:
        '把照片压到 500 KB 以下，用于招聘网站、学校表格或头像，并保留能放下的最佳画质。iPhone 或浏览器都能用，不上传。',
      h1: '把照片压缩到 500 KB 以下',
      answer:
        '招聘网站、学校系统和头像常把照片限制在 500 KB。Compresso 会选出在此限制下最高的画质，只在必要时才缩小尺寸。照片在你的 iPhone 或浏览器中处理，从不上传。',
      steps: [
        '在 iPhone 上打开 Compresso，选择照片。',
        '选择“上传表格”，再在“每张照片小于”中选 500 KB。',
        '轻点“开始压缩”，然后存储或分享结果。',
      ],
      faq: [
        {
          q: '我用的是电脑或安卓手机。',
          a: '打开免费的网页版，展开“尺寸”，把“体积上限”设为 0.5 MB，再添加照片。',
        },
        {
          q: '500 KB 的照片还好看吗？',
          a: '用于表格或头像完全够用。按网站显示的尺寸，500 KB 足以保持清晰。上传前在结果上滑动，即可与原图对比。',
        },
        {
          q: '能一次处理多张照片吗？',
          a: '可以。全部选上，每张都会各自压到限制以下。',
        },
      ],
    },
  },

  [SLUGS.kb200]: {
    en: {
      metaTitle: 'Compress a Photo to Under 200 KB, Free and Private | Compresso',
      metaDescription:
        'Fit an ID photo, passport photo or exam form photo under 200 KB, at the best quality that fits. On iPhone or in your browser, nothing uploaded.',
      h1: 'Compress a photo to under 200 KB',
      answer:
        'ID photos, visa and passport portals, exam registrations and government forms often ask for photos under 200 KB. Compresso picks the highest quality that fits and reduces the dimensions as much as needed. Because these are personal documents, it is worth knowing that the photo is processed on your iPhone or in your browser and never uploaded.',
      steps: [
        'Open Compresso on your iPhone and choose the photo.',
        'Pick Upload form, then 200 KB under Each photo under.',
        'Tap Make it lighter, then save or share the result.',
      ],
      faq: [
        {
          q: 'The form asks for less than 200 KB, like 100 KB or 50 KB.',
          a: 'Use the free web app: open Dimensions and set Size limit in MB (100 KB is 0.1 MB) and add the photo. The iPhone app goes down to 200 KB.',
        },
        {
          q: 'I am on a computer or an Android phone.',
          a: 'Open the free web app, open Dimensions, set Size limit to 0.2 MB and add the photo.',
        },
        {
          q: 'The form also asks for exact pixel dimensions.',
          a: 'In the web app you can set the maximum width and height as well as the size. Crop the photo to the right shape first in the Photos app if the form asks for a fixed ratio.',
        },
      ],
    },
    es: {
      metaTitle: 'Comprimir una foto a menos de 200 KB, gratis y privado | Compresso',
      metaDescription:
        'Deja una foto de carnet, de pasaporte o para un examen por debajo de 200 KB, con la mejor calidad posible. En iPhone o en el navegador, sin subir nada.',
      h1: 'Comprime una foto a menos de 200 KB',
      answer:
        'Las fotos de carnet, los portales de visados y pasaportes, las inscripciones a exámenes y los trámites oficiales suelen pedir fotos de menos de 200 KB. Compresso elige la mayor calidad que cabe y reduce las dimensiones lo necesario. Como son documentos personales, conviene saber que la foto se procesa en tu iPhone o en el navegador y nunca se sube.',
      steps: [
        'Abre Compresso en tu iPhone y elige la foto.',
        'Elige Formulario y luego 200 KB en Cada foto por debajo de.',
        'Toca Hacerla más ligera y guarda o comparte el resultado.',
      ],
      faq: [
        {
          q: 'El formulario pide menos de 200 KB, como 100 KB o 50 KB.',
          a: 'Usa la web app gratuita: abre Dimensiones y pon el Límite de peso en MB (100 KB son 0,1 MB) y añade la foto. La app de iPhone llega hasta 200 KB.',
        },
        {
          q: 'Estoy en un ordenador o en un Android.',
          a: 'Abre la web app gratuita, abre Dimensiones, pon el Límite de peso en 0,2 MB y añade la foto.',
        },
        {
          q: 'El formulario también pide medidas exactas en píxeles.',
          a: 'En la web app puedes fijar el ancho y el alto máximos además del peso. Si piden una proporción fija, recorta antes la foto en la app Fotos.',
        },
      ],
    },
    fr: {
      metaTitle: 'Compresser une photo sous 200 Ko, gratuit et privé | Compresso',
      metaDescription:
        'Faites passer une photo d’identité ou pour une inscription à un examen sous 200 Ko, avec la meilleure qualité possible. Sur iPhone ou dans le navigateur, sans envoi.',
      h1: 'Compresser une photo sous 200 Ko',
      answer:
        'Les photos d’identité, les portails de visa et de passeport, les inscriptions aux examens et les démarches administratives demandent souvent des photos de moins de 200 Ko. Compresso choisit la meilleure qualité qui tient et réduit les dimensions autant que nécessaire. Comme ce sont des documents personnels, bon à savoir : la photo est traitée sur votre iPhone ou dans le navigateur, jamais envoyée.',
      steps: [
        'Ouvrez Compresso sur votre iPhone et choisissez la photo.',
        'Choisissez Formulaire, puis 200 Ko sous Chaque photo sous.',
        'Touchez L’alléger, puis enregistrez ou partagez le résultat.',
      ],
      faq: [
        {
          q: 'Le formulaire demande moins de 200 Ko, par exemple 100 Ko ou 50 Ko.',
          a: 'Utilisez l’app web gratuite : ouvrez Dimensions et réglez le Poids maximal en Mo (100 Ko = 0,1 Mo) et ajoutez la photo. L’app iPhone descend jusqu’à 200 Ko.',
        },
        {
          q: 'Je suis sur ordinateur ou sur Android.',
          a: 'Ouvrez l’app web gratuite, ouvrez Dimensions, réglez le Poids maximal sur 0,2 Mo et ajoutez la photo.',
        },
        {
          q: 'Le formulaire impose aussi des dimensions en pixels.',
          a: 'Dans l’app web, vous pouvez fixer la largeur et la hauteur maximales en plus du poids. Si un format précis est demandé, recadrez d’abord la photo dans l’app Photos.',
        },
      ],
    },
    de: {
      metaTitle: 'Foto unter 200 KB komprimieren, kostenlos und privat | Compresso',
      metaDescription:
        'Bring ein Passfoto, Bewerbungsfoto oder Foto für eine Prüfungsanmeldung unter 200 KB, in der besten Qualität, die passt. Auf dem iPhone oder im Browser, ohne Upload.',
      h1: 'Foto auf unter 200 KB komprimieren',
      answer:
        'Passfotos, Visa- und Behördenportale und Prüfungsanmeldungen verlangen oft Fotos unter 200 KB. Compresso wählt die höchste Qualität, die passt, und verkleinert die Abmessungen so weit wie nötig. Weil es um persönliche Dokumente geht, gut zu wissen: Das Foto wird auf deinem iPhone oder im Browser verarbeitet und nie hochgeladen.',
      steps: [
        'Öffne Compresso auf dem iPhone und wähle das Foto.',
        'Wähle Formular und dann 200 KB bei Jedes Foto unter.',
        'Tippe auf Leichter machen und sichere oder teile das Ergebnis.',
      ],
      faq: [
        {
          q: 'Das Formular will weniger als 200 KB, etwa 100 KB oder 50 KB.',
          a: 'Nimm die kostenlose Web-App: Öffne Maße und stell das Größenlimit in MB ein (100 KB sind 0,1 MB) und füge das Foto hinzu. Die iPhone-App geht bis 200 KB.',
        },
        {
          q: 'Ich bin am Computer oder auf Android.',
          a: 'Öffne die kostenlose Web-App, öffne Maße, stell das Größenlimit auf 0,2 MB und füge das Foto hinzu.',
        },
        {
          q: 'Das Formular verlangt auch genaue Pixelmaße.',
          a: 'In der Web-App kannst du neben der Größe auch die maximale Breite und Höhe festlegen. Wird ein festes Seitenverhältnis verlangt, schneide das Foto vorher in der Fotos-App zu.',
        },
      ],
    },
    it: {
      metaTitle: 'Comprimere una foto sotto 200 KB, gratis e privato | Compresso',
      metaDescription:
        'Porta una foto tessera, per il passaporto o per l’iscrizione a un concorso sotto 200 KB, con la qualità migliore che ci sta. Su iPhone o nel browser, senza caricare niente.',
      h1: 'Comprimi una foto sotto 200 KB',
      answer:
        'Foto tessera, portali per visti e passaporti, iscrizioni a concorsi e pratiche online chiedono spesso foto sotto 200 KB. Compresso sceglie la qualità più alta che ci sta e riduce le dimensioni quanto serve. Trattandosi di documenti personali, è bene sapere che la foto viene elaborata sull’iPhone o nel browser e non viene mai caricata.',
      steps: [
        'Apri Compresso sull’iPhone e scegli la foto.',
        'Scegli Modulo online, poi 200 KB in Ogni foto sotto.',
        'Tocca Alleggeriscila, poi salva o condividi il risultato.',
      ],
      faq: [
        {
          q: 'Il modulo chiede meno di 200 KB, per esempio 100 KB o 50 KB.',
          a: 'Usa la web app gratuita: apri Dimensioni e imposta il Limite di peso in MB (100 KB sono 0,1 MB) e aggiungi la foto. L’app per iPhone arriva fino a 200 KB.',
        },
        {
          q: 'Sono su un computer o su Android.',
          a: 'Apri la web app gratuita, apri Dimensioni, imposta il Limite di peso a 0,2 MB e aggiungi la foto.',
        },
        {
          q: 'Il modulo chiede anche misure precise in pixel.',
          a: 'Nella web app puoi impostare larghezza e altezza massime oltre al peso. Se serve un formato fisso, ritaglia prima la foto nell’app Foto.',
        },
      ],
    },
    'pt-BR': {
      metaTitle: 'Comprimir uma foto para menos de 200 KB, grátis e privado | Compresso',
      metaDescription:
        'Deixe uma foto 3x4, de passaporte ou de inscrição em concurso abaixo de 200 KB, com a melhor qualidade que cabe. No iPhone ou no navegador, sem enviar nada.',
      h1: 'Comprima uma foto para menos de 200 KB',
      answer:
        'Fotos 3x4, portais de visto e passaporte, inscrições em concursos e vestibulares e serviços do governo costumam pedir fotos com menos de 200 KB. O Compresso escolhe a maior qualidade que cabe e reduz as dimensões o quanto for preciso. Como são documentos pessoais, vale saber que a foto é processada no iPhone ou no navegador e nunca é enviada.',
      steps: [
        'Abra o Compresso no iPhone e escolha a foto.',
        'Escolha Formulário e depois 200 KB em Cada foto abaixo de.',
        'Toque em Deixar mais leve e salve ou compartilhe o resultado.',
      ],
      faq: [
        {
          q: 'O formulário pede menos de 200 KB, como 100 KB ou 50 KB.',
          a: 'Use o web app gratuito: abra Dimensões e coloque o Limite de tamanho em MB (100 KB são 0,1 MB) e adicione a foto. O app de iPhone vai até 200 KB.',
        },
        {
          q: 'Estou no computador ou num Android.',
          a: 'Abra o web app gratuito, abra Dimensões, coloque o Limite de tamanho em 0,2 MB e adicione a foto.',
        },
        {
          q: 'O formulário também pede medidas exatas em pixels.',
          a: 'No web app dá para definir a largura e a altura máximas além do tamanho. Se pedirem uma proporção fixa, recorte antes a foto no app Fotos.',
        },
      ],
    },
    'zh-Hans': {
      metaTitle: '把照片压缩到 200 KB 以下，免费且私密 | Compresso',
      metaDescription:
        '把证件照、护照照片或考试报名照片压到 200 KB 以下，并保留能放下的最佳画质。iPhone 或浏览器都能用，不上传。',
      h1: '把照片压缩到 200 KB 以下',
      answer:
        '证件照、签证和护照网站、考试报名以及政务表格常要求照片小于 200 KB。Compresso 会选出能放下的最高画质，并按需缩小尺寸。这些都是个人证件，值得一提的是：照片只在你的 iPhone 或浏览器中处理，从不上传。',
      steps: [
        '在 iPhone 上打开 Compresso，选择照片。',
        '选择“上传表格”，再在“每张照片小于”中选 200 KB。',
        '轻点“开始压缩”，然后存储或分享结果。',
      ],
      faq: [
        {
          q: '表格要求小于 200 KB，比如 100 KB 或 50 KB。',
          a: '请用免费的网页版：展开“尺寸”，以 MB 为单位设置“体积上限”（100 KB 即 0.1 MB），再添加照片。iPhone 应用最小到 200 KB。',
        },
        {
          q: '我用的是电脑或安卓手机。',
          a: '打开免费的网页版，展开“尺寸”，把“体积上限”设为 0.2 MB，再添加照片。',
        },
        {
          q: '表格还要求精确的像素尺寸。',
          a: '在网页版中，除了文件大小，还可以设置最大宽度和高度。如果要求固定比例，请先在“照片”应用中裁剪。',
        },
      ],
    },
  },

  [SLUGS.tooLarge]: {
    en: {
      metaTitle: 'Photo Too Large to Upload? Fix "File Too Large" Free | Compresso',
      metaDescription:
        'A website says your photo is too large? Find the limit and make the photo fit in a few taps, on iPhone or in your browser. Free, nothing uploaded.',
      h1: 'Photo too large to upload? Here is the fix',
      answer:
        'When a site says "file too large", your photo is over its size limit. The limit is usually written near the upload button, often 1 MB, 2 MB or 5 MB. Make the photo smaller than that and the upload goes through. Compresso does it in a few taps on iPhone or in any browser, without sending the photo anywhere.',
      steps: [
        'Find the size limit next to the upload button or in the form’s instructions.',
        'In Compresso, choose the photo, pick Upload form and set the limit.',
        'Upload the smaller copy. Your original stays in your library.',
      ],
      faq: [
        {
          q: 'Why are phone photos so large?',
          a: 'Phone cameras take 12 to 48 megapixel photos, far more detail than a form needs. Making the file smaller for the form does not change the original.',
        },
        {
          q: 'The form only accepts JPG.',
          a: 'Compresso saves form photos as JPEG, the format forms accept most often, even when the original is HEIC.',
        },
        {
          q: 'Is it safe for ID cards and documents?',
          a: 'Yes. The photo is processed on your device and never uploaded to Compresso or anyone else. There is no account and no tracking.',
        },
        {
          q: 'No limit is written anywhere.',
          a: 'Try 1 MB first; it is the most common limit. If the site still refuses, try 500 KB.',
        },
      ],
    },
    es: {
      metaTitle: '¿Foto demasiado grande para subir? Arregla «archivo demasiado grande» | Compresso',
      metaDescription:
        '¿Una web dice que tu foto es demasiado grande? Busca el límite y haz que quepa en pocos toques, en iPhone o en el navegador. Gratis, sin subir nada.',
      h1: '¿Foto demasiado grande para subir? Así se arregla',
      answer:
        'Cuando una web dice «archivo demasiado grande», tu foto supera su límite de tamaño. El límite suele estar escrito junto al botón de subir, a menudo 1 MB, 2 MB o 5 MB. Deja la foto por debajo y la subida funciona. Compresso lo hace en pocos toques en iPhone o en cualquier navegador, sin enviar la foto a ningún sitio.',
      steps: [
        'Busca el límite de tamaño junto al botón de subir o en las instrucciones del formulario.',
        'En Compresso, elige la foto, toca Formulario y pon el límite.',
        'Sube la copia ligera. Tu original sigue en tu fototeca.',
      ],
      faq: [
        {
          q: '¿Por qué pesan tanto las fotos del móvil?',
          a: 'Las cámaras de los móviles hacen fotos de 12 a 48 megapíxeles, mucho más detalle del que necesita un formulario. Aligerar la foto para el formulario no cambia el original.',
        },
        {
          q: 'El formulario solo acepta JPG.',
          a: 'Compresso guarda las fotos para formularios en JPEG, el formato que más aceptan, aunque el original sea HEIC.',
        },
        {
          q: '¿Es seguro con DNI y documentos?',
          a: 'Sí. La foto se procesa en tu dispositivo y nunca se sube ni a Compresso ni a nadie. Sin cuenta y sin rastreo.',
        },
        {
          q: 'No pone el límite en ninguna parte.',
          a: 'Prueba primero con 1 MB, que es el límite más común. Si la web sigue rechazándola, prueba con 500 KB.',
        },
      ],
    },
    fr: {
      metaTitle: 'Photo trop lourde à envoyer ? Réglez « fichier trop volumineux » | Compresso',
      metaDescription:
        'Un site dit que votre photo est trop lourde ? Trouvez la limite et faites-la passer en quelques touches, sur iPhone ou dans le navigateur. Gratuit, sans envoi.',
      h1: 'Photo trop lourde pour un formulaire ? Voici la solution',
      answer:
        'Quand un site affiche « fichier trop volumineux », votre photo dépasse sa limite de taille. Elle est en général indiquée près du bouton d’envoi, souvent 1 Mo, 2 Mo ou 5 Mo. Passez la photo sous cette limite et l’envoi fonctionne. Compresso le fait en quelques touches sur iPhone ou dans n’importe quel navigateur, sans envoyer la photo nulle part.',
      steps: [
        'Repérez la limite de taille près du bouton d’envoi ou dans les consignes du formulaire.',
        'Dans Compresso, choisissez la photo, touchez Formulaire et réglez la limite.',
        'Envoyez la copie allégée. L’original reste dans votre photothèque.',
      ],
      faq: [
        {
          q: 'Pourquoi les photos de téléphone sont-elles si lourdes ?',
          a: 'Les appareils photo des téléphones prennent des photos de 12 à 48 mégapixels, bien plus de détails qu’un formulaire n’en demande. Alléger la photo pour le formulaire ne change pas l’original.',
        },
        {
          q: 'Le formulaire n’accepte que le JPG.',
          a: 'Compresso enregistre les photos pour formulaires en JPEG, le format le plus accepté, même si l’original est en HEIC.',
        },
        {
          q: 'Est-ce sûr pour une carte d’identité ou des documents ?',
          a: 'Oui. La photo est traitée sur votre appareil et n’est jamais envoyée, ni à Compresso ni à personne. Pas de compte, pas de suivi.',
        },
        {
          q: 'Aucune limite n’est indiquée.',
          a: 'Essayez d’abord 1 Mo, la limite la plus courante. Si le site refuse encore, essayez 500 Ko.',
        },
      ],
    },
    de: {
      metaTitle: 'Foto zu groß zum Hochladen? „Datei zu groß“ kostenlos lösen | Compresso',
      metaDescription:
        'Eine Website sagt, dein Foto ist zu groß? Finde die Grenze und bring das Foto mit wenigen Tippern darunter, auf dem iPhone oder im Browser. Kostenlos, ohne Upload.',
      h1: 'Foto zu groß zum Hochladen? So geht’s',
      answer:
        'Wenn eine Website „Datei zu groß“ meldet, liegt dein Foto über ihrer Größengrenze. Die steht meist neben dem Upload-Knopf, oft 1 MB, 2 MB oder 5 MB. Bring das Foto darunter, dann klappt der Upload. Compresso erledigt das mit wenigen Tippern auf dem iPhone oder in jedem Browser, ohne das Foto irgendwohin zu schicken.',
      steps: [
        'Such die Größengrenze neben dem Upload-Knopf oder in den Hinweisen zum Formular.',
        'Wähl in Compresso das Foto, tippe auf Formular und stell die Grenze ein.',
        'Lade die kleinere Kopie hoch. Dein Original bleibt in deiner Mediathek.',
      ],
      faq: [
        {
          q: 'Warum sind Handyfotos so groß?',
          a: 'Handykameras machen Fotos mit 12 bis 48 Megapixeln, viel mehr Details, als ein Formular braucht. Das Foto fürs Formular zu verkleinern ändert das Original nicht.',
        },
        {
          q: 'Das Formular nimmt nur JPG.',
          a: 'Compresso sichert Formularfotos als JPEG, das Format, das Formulare am häufigsten annehmen, auch wenn das Original HEIC ist.',
        },
        {
          q: 'Ist das sicher für Ausweise und Dokumente?',
          a: 'Ja. Das Foto wird auf deinem Gerät verarbeitet und nie hochgeladen, weder zu Compresso noch sonst wohin. Kein Konto, kein Tracking.',
        },
        {
          q: 'Nirgends steht eine Grenze.',
          a: 'Probier zuerst 1 MB, das ist die häufigste Grenze. Lehnt die Seite es weiter ab, probier 500 KB.',
        },
      ],
    },
    it: {
      metaTitle: 'Foto troppo grande da caricare? Risolvi «file troppo grande» | Compresso',
      metaDescription:
        'Un sito dice che la tua foto è troppo grande? Trova il limite e falla rientrare in pochi tocchi, su iPhone o nel browser. Gratis, senza caricare niente.',
      h1: 'Foto troppo grande da caricare? Ecco la soluzione',
      answer:
        'Quando un sito dice «file troppo grande», la tua foto supera il suo limite di dimensione. Di solito è scritto vicino al pulsante di caricamento, spesso 1 MB, 2 MB o 5 MB. Porta la foto sotto quel limite e il caricamento va a buon fine. Compresso lo fa in pochi tocchi su iPhone o in qualsiasi browser, senza mandare la foto da nessuna parte.',
      steps: [
        'Trova il limite di dimensione vicino al pulsante di caricamento o nelle istruzioni del modulo.',
        'In Compresso scegli la foto, tocca Modulo online e imposta il limite.',
        'Carica la copia leggera. L’originale resta nella tua libreria.',
      ],
      faq: [
        {
          q: 'Perché le foto del telefono pesano così tanto?',
          a: 'Le fotocamere dei telefoni scattano foto da 12 a 48 megapixel, molto più dettaglio di quanto serva a un modulo. Alleggerire la foto per il modulo non cambia l’originale.',
        },
        {
          q: 'Il modulo accetta solo JPG.',
          a: 'Compresso salva le foto per i moduli in JPEG, il formato accettato più spesso, anche se l’originale è HEIC.',
        },
        {
          q: 'È sicuro per carta d’identità e documenti?',
          a: 'Sì. La foto viene elaborata sul tuo dispositivo e non viene mai caricata, né su Compresso né altrove. Nessun account, nessun tracciamento.',
        },
        {
          q: 'Il limite non è scritto da nessuna parte.',
          a: 'Prova prima con 1 MB, il limite più comune. Se il sito la rifiuta ancora, prova con 500 KB.',
        },
      ],
    },
    'pt-BR': {
      metaTitle: 'Foto grande demais para enviar? Resolva o “arquivo muito grande” | Compresso',
      metaDescription:
        'Um site diz que sua foto é grande demais? Descubra o limite e faça a foto caber em poucos toques, no iPhone ou no navegador. Grátis, sem enviar nada.',
      h1: 'Foto grande demais para enviar? Veja como resolver',
      answer:
        'Quando um site diz “arquivo muito grande”, sua foto passou do limite de tamanho dele. O limite costuma estar escrito perto do botão de envio, muitas vezes 1 MB, 2 MB ou 5 MB. Deixe a foto abaixo disso e o envio funciona. O Compresso faz isso em poucos toques no iPhone ou em qualquer navegador, sem mandar a foto para lugar nenhum.',
      steps: [
        'Procure o limite de tamanho perto do botão de envio ou nas instruções do formulário.',
        'No Compresso, escolha a foto, toque em Formulário e defina o limite.',
        'Envie a cópia leve. O original continua na sua fototeca.',
      ],
      faq: [
        {
          q: 'Por que as fotos do celular são tão pesadas?',
          a: 'As câmeras de celular tiram fotos de 12 a 48 megapixels, muito mais detalhe do que um formulário precisa. Deixar a foto leve para o formulário não muda o original.',
        },
        {
          q: 'O formulário só aceita JPG.',
          a: 'O Compresso salva as fotos para formulários em JPEG, o formato mais aceito, mesmo quando o original é HEIC.',
        },
        {
          q: 'É seguro para RG, CNH e documentos?',
          a: 'É. A foto é processada no seu aparelho e nunca é enviada, nem para o Compresso nem para ninguém. Sem conta e sem rastreamento.',
        },
        {
          q: 'Não tem limite escrito em lugar nenhum.',
          a: 'Tente primeiro 1 MB, que é o limite mais comum. Se o site ainda recusar, tente 500 KB.',
        },
      ],
    },
    'zh-Hans': {
      metaTitle: '照片太大无法上传？免费解决“文件过大” | Compresso',
      metaDescription:
        '网站提示照片太大？找到大小限制，轻点几下就能让照片达标，iPhone 或浏览器都能用。免费，不上传。',
      h1: '照片太大传不上去？这样解决',
      answer:
        '网站提示“文件过大”，说明照片超过了它的大小限制。限制通常写在上传按钮旁边，常见的是 1 MB、2 MB 或 5 MB。把照片压到限制以下，就能顺利上传。Compresso 在 iPhone 或任何浏览器里轻点几下就能做到，照片不会发送到任何地方。',
      steps: [
        '在上传按钮旁或表格说明中找到大小限制。',
        '在 Compresso 中选择照片，选“上传表格”并设好限制。',
        '上传压缩后的副本，原图仍保留在你的图库中。',
      ],
      faq: [
        {
          q: '为什么手机照片这么大？',
          a: '手机摄像头拍出的照片有 1200 万到 4800 万像素，细节远超表格所需。为表格压缩照片不会改变原图。',
        },
        {
          q: '表格只接受 JPG。',
          a: 'Compresso 会把用于表格的照片存为 JPEG，这是表格最常接受的格式，即使原图是 HEIC 也一样。',
        },
        {
          q: '用来处理身份证和证件安全吗？',
          a: '安全。照片只在你的设备上处理，不会上传到 Compresso 或任何地方。没有账号，没有追踪。',
        },
        {
          q: '哪里都没写大小限制。',
          a: '先试 1 MB，这是最常见的限制。如果网站仍然拒绝，再试 500 KB。',
        },
      ],
    },
  },
};

/** @type {Record<string, Record<string, object>>} */
export const PHONE_PAGES = Object.fromEntries(
  Object.entries(COPY).map(([slug, byLocale]) => [
    slug,
    Object.fromEntries(
      Object.entries(byLocale).map(([locale, content]) => [
        locale,
        { ...content, related: RELATED[slug], audience: 'people' },
      ]),
    ),
  ]),
);

export const PHONE_SLUGS = Object.values(SLUGS);
