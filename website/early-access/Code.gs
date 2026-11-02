/**
 * Compresso early access: the backend of compresso.izaias.xyz/<lang>/early/.
 *
 * Bound to a Google Sheet and deployed as a web app (README.md has the steps).
 * Each signup becomes one row, and the invite goes out from the Gmail account
 * that owns the script, in the language the visitor was reading the page in,
 * with the steps for the phone they chose.
 *
 * The site is a static export with no server of its own, which is why this
 * lives here: the sheet is the database, Gmail is the mail service, and
 * neither costs anything. A consumer account sends about 100 emails a day;
 * past that, rows wait as "pending" and sendPending() delivers them.
 *
 * This file is the source of truth for the email. After changing it, paste it
 * into the Apps Script editor again and redeploy (Deploy > Manage deployments >
 * edit > New version), so the web app URL stays the same.
 */

const SHEET = 'Signups';
const HEADERS = ['Time', 'Name', 'Email', 'Phone', 'Language', 'Source', 'Status'];
const COL = Object.fromEntries(HEADERS.map((h, i) => [h, i + 1]));

const SITE = 'https://compresso.izaias.xyz';
const LINKS = {
  group: 'https://groups.google.com/g/compresso-testers',
  optIn: 'https://play.google.com/apps/testing/xyz.izaias.compresso',
  play: 'https://play.google.com/store/apps/details?id=xyz.izaias.compresso',
  testflightApp: 'https://apps.apple.com/app/testflight/id899247664',
  testflight: 'https://testflight.apple.com/join/c2Pe11Me',
};

/** Route slugs, as in website/src/lib/locale-routes.js. */
const SLUGS = { en: 'en', es: 'es', fr: 'fr', de: 'de', it: 'it', 'pt-BR': 'pt-br', 'zh-Hans': 'zh-hans' };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/* ------------------------------------------------------------------ web app */

function doPost(e) {
  let body;
  try { body = JSON.parse(e.postData.contents); } catch (err) { return reply({ ok: false, error: 'bad-request' }); }

  // The page's hidden field. A person never fills it; answering "ok" tells a
  // bot nothing it could learn from.
  if (body.website) return reply({ ok: true });

  const email = clean(body.email, 254).toLowerCase();
  if (!EMAIL.test(email)) return reply({ ok: false, error: 'email' });

  const signup = {
    email,
    name: clean(body.name, 60),
    platform: body.platform === 'ios' ? 'ios' : 'android',
    locale: COPY[body.locale] ? body.locale : 'en',
    source: clean(body.source, 40) || 'direct',
  };

  // one writer at a time, so two quick signups cannot land on the same row
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  let status;
  try {
    status = deliver(signup);
    save(signup, status);
  } finally {
    lock.releaseLock();
  }
  return reply(status === 'failed' ? { ok: false, error: 'send' } : { ok: true });
}

/** Opening the web app URL in a browser shows this, which is a quick health check. */
function doGet() {
  return reply({ ok: true, service: 'compresso-early-access' });
}

function reply(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

/* -------------------------------------------------------------------- sheet */

function sheet() {
  const book = SpreadsheetApp.getActive();
  let s = book.getSheetByName(SHEET);
  if (!s) {
    s = book.insertSheet(SHEET);
    s.appendRow(HEADERS);
    s.setFrozenRows(1);
    s.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
  }
  return s;
}

/**
 * One row per address. Signing up again (another phone, a lost email) updates
 * the row and sends a fresh invite, rather than stacking duplicates.
 */
function save(signup, status) {
  const s = sheet();
  const values = [new Date(), safe(signup.name), signup.email, signup.platform, signup.locale, safe(signup.source), status];
  const hit = s.getRange(2, COL.Email, Math.max(s.getLastRow() - 1, 1)).createTextFinder(signup.email)
    .matchEntireCell(true).findNext();
  if (hit) s.getRange(hit.getRow(), 1, 1, values.length).setValues([values]);
  else s.appendRow(values);
}

/** Text from the page, trimmed and capped. */
function clean(value, max) {
  return String(value || '').trim().slice(0, max);
}

/** A leading apostrophe stops Sheets reading visitor text as a formula. */
function safe(text) {
  return text.replace(/^[=+\-@]/, "'$&");
}

/* -------------------------------------------------------------------- email */

/** Sends the invite if today's quota allows, and says what happened:
    sent, pending (no quota left today) or failed (Gmail refused it). */
function deliver(signup) {
  if (MailApp.getRemainingDailyQuota() < 1) return 'pending';
  const c = COPY[signup.locale];
  const first = signup.name.split(/\s+/)[0];
  try {
    MailApp.sendEmail({
      to: signup.email,
      subject: c.subject,
      name: 'Compresso',
      body: renderText(c, signup.platform, first, signup.locale),
      htmlBody: renderHtml(c, signup.platform, first, signup.locale),
    });
    return 'sent';
  } catch (err) {
    console.error(err);
    return 'failed';
  }
}

/**
 * Sends every invite still waiting on quota. Run it by hand, or add a daily
 * time-driven trigger for it (Triggers > Add trigger > sendPending).
 */
function sendPending() {
  const s = sheet();
  const rows = s.getDataRange().getValues().slice(1);
  rows.forEach((r, i) => {
    if (r[COL.Status - 1] !== 'pending') return;
    const signup = { name: String(r[COL.Name - 1]), email: r[COL.Email - 1], platform: r[COL.Phone - 1], locale: r[COL.Language - 1] };
    const status = deliver(signup);
    s.getRange(i + 2, COL.Status).setValue(status);
  });
}

/** Sends both versions of the invite in one language to yourself, to check them. */
function preview(locale = 'en') {
  const me = Session.getEffectiveUser().getEmail();
  ['android', 'ios'].forEach((platform) => deliver({ email: me, name: 'Ana', platform, locale }));
}

function steps(c, platform) {
  return platform === 'ios'
    ? [[c.ios1, LINKS.testflightApp], [c.ios2, LINKS.testflight]]
    : [[c.android1, LINKS.group], [c.android2, LINKS.optIn], [c.android3, LINKS.play]];
}

function pageUrl(locale) {
  return `${SITE}/${SLUGS[locale]}/early/`;
}

function renderText(c, platform, first, locale) {
  const title = first ? c.titleName.replace('{name}', first) : c.title;
  const list = steps(c, platform).map(([s, url], i) => `${i + 1}. ${s.title}\n${s.body}\n${url}`).join('\n\n');
  const note = platform === 'ios' ? c.iosNote : c.androidNote;
  return [title, c.intro, list, note, c.thanks, `${c.share} ${pageUrl(locale)}`, '—', c.footer].join('\n\n');
}

/* The HTML is tables and inline styles because that is what every client
   renders the same: Gmail drops <style> blocks in some views, Outlook ignores
   flex and grid. Colours are the product's own: true black, white ink, greys
   as white at fixed opacities, no accent anywhere. Geist is named first for
   the clients that have it; the rest fall back to the system sans. */

const SANS = "Geist,-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,'PingFang SC','Microsoft YaHei',sans-serif";
const MONO = "'Geist Mono',ui-monospace,SFMono-Regular,Menlo,Consolas,monospace";
const INK = '#FFFFFF';
const INK2 = '#9E9E9E'; // white at 62% on black
const INK3 = '#6B6B6B'; // 38%
const LINE = '#1F1F1F'; // 12%

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** A link that survives every client as a pill: the cell carries the colour. */
function button(label, url) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
    <td bgcolor="${INK}" style="border-radius:999px;">
      <a href="${url}" target="_blank" style="display:inline-block;padding:12px 22px;font-family:${SANS};font-size:14px;font-weight:500;line-height:16px;color:#000000;text-decoration:none;border-radius:999px;">${esc(label)}</a>
    </td></tr></table>`;
}

function step(s, url, n) {
  return `<tr><td style="padding:24px 0;border-top:1px solid ${LINE};">
    <div style="font-family:${MONO};font-size:12px;line-height:16px;color:${INK3};">${String(n).padStart(2, '0')}</div>
    <div style="padding-top:12px;font-family:${SANS};font-size:16px;font-weight:500;line-height:22px;color:${INK};letter-spacing:-0.2px;">${esc(s.title)}</div>
    <div style="padding:6px 0 18px;font-family:${SANS};font-size:14px;line-height:22px;color:${INK2};">${esc(s.body)}</div>
    ${button(s.button, url)}
  </td></tr>`;
}

function renderHtml(c, platform, first, locale) {
  const title = first ? c.titleName.replace('{name}', esc(first)) : esc(c.title);
  const label = `${c.label} · ${platform === 'ios' ? 'iPhone' : 'Android'}`;
  const note = platform === 'ios' ? c.iosNote : c.androidNote;
  const slug = SLUGS[locale];
  const page = pageUrl(locale);

  return `<!doctype html>
<html lang="${locale}"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark">
<title>${esc(c.subject)}</title>
</head>
<body style="margin:0;padding:0;background:#000000;-webkit-font-smoothing:antialiased;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(c.preheader)}&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#000000" style="background:#000000;">
<tr><td align="center" style="padding:40px 20px 56px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;">
    <tr><td style="padding-bottom:56px;">
      <a href="${page}" target="_blank"><img src="${SITE}/early/mark.png" width="132" height="24" alt="compresso" style="display:block;border:0;"></a>
    </td></tr>

    <tr><td style="font-family:${SANS};font-size:11px;font-weight:500;line-height:14px;letter-spacing:1.8px;text-transform:uppercase;color:${INK3};">${esc(label)}</td></tr>
    <tr><td style="padding-top:14px;font-family:${SANS};font-size:34px;font-weight:300;line-height:38px;letter-spacing:-1px;color:${INK};">${title}</td></tr>
    <tr><td style="padding-top:16px;font-family:${SANS};font-size:16px;line-height:25px;color:${INK2};">${esc(c.intro)}</td></tr>

    <tr><td align="center" style="padding:40px 0 16px;">
      <img src="${SITE}/early/${slug}/compare.jpg" width="240" alt="${esc(c.imageAlt)}" style="display:block;width:240px;max-width:70%;height:auto;border:0;">
    </td></tr>

    <tr><td><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      ${steps(c, platform).map(([s, url], i) => step(s, url, i + 1)).join('')}
    </table></td></tr>

    <tr><td style="padding:20px 22px;border-radius:14px;background:#0C0C0C;border:1px solid ${LINE};font-family:${SANS};font-size:14px;line-height:22px;color:${INK2};">${esc(note)}</td></tr>

    <tr><td style="padding-top:40px;font-family:${SANS};font-size:15px;line-height:24px;color:${INK2};">
      ${esc(c.thanks)}
    </td></tr>
    <tr><td style="padding-top:16px;font-family:${SANS};font-size:15px;line-height:24px;color:${INK2};">
      ${esc(c.share)} <a href="${page}" target="_blank" style="color:${INK};text-decoration:underline;">${page.replace('https://', '')}</a>
    </td></tr>

    <tr><td style="padding-top:56px;border-bottom:1px solid ${LINE};"></td></tr>
    <tr><td style="padding-top:20px;font-family:${SANS};font-size:12px;line-height:18px;color:${INK3};">${esc(c.footer)}</td></tr>
  </table>
</td></tr>
</table>
</body></html>`;
}

/* --------------------------------------------------------------------- copy

   The same voice as the page: plain, warm, no exclamation marks. Every step
   says what tapping does before asking for the tap. */

const COPY = {
  en: {
    subject: 'Your Compresso invite is here',
    preheader: 'About two minutes, and it’s on your phone before everyone else’s.',
    label: 'Your invite',
    titleName: '{name}, you’re in.',
    title: 'You’re in.',
    intro: 'You get Compresso before everyone else. It takes about two minutes, and each step below has one button.',
    imageAlt: 'Compresso comparing a photo before and after.',
    android1: { title: 'Join the testers group', body: 'Google lets testers in through this group. Open it signed in with the Google account on your phone, and tap Join group.', button: 'Join the group' },
    android2: { title: 'Become a tester', body: 'This tells Google Play that the app may appear for you.', button: 'Become a tester' },
    android3: { title: 'Install from Google Play', body: 'It installs like any other app and updates itself.', button: 'Open Google Play' },
    androidNote: 'One favour: keep it installed for 14 days. Google asks for two weeks of real use before a new app can open to everyone. You’re how it gets there.',
    ios1: { title: 'Install TestFlight', body: 'TestFlight is Apple’s own app for trying apps before they launch.', button: 'Get TestFlight' },
    ios2: { title: 'Open your invite', body: 'Open it on your iPhone, tap Accept, then Install.', button: 'Open the invite' },
    iosNote: 'TestFlight keeps Compresso up to date for you. It needs iOS 16.4 or later.',
    thanks: 'Thank you for being first. If something feels off, or just right, reply to this email. It goes straight to the person who built Compresso.',
    share: 'Know someone who’d want in too? Pass this on:',
    footer: 'You asked for this invite at compresso.izaias.xyz. It’s the only email you’ll get.',
  },
  'pt-BR': {
    subject: 'Seu convite do Compresso chegou',
    preheader: 'Uns dois minutos, e ele está no seu celular antes de todo mundo.',
    label: 'Seu convite',
    titleName: '{name}, você entrou.',
    title: 'Pronto, você entrou.',
    intro: 'Você recebe o Compresso antes de todo mundo. Leva uns dois minutos, e cada passo abaixo tem um botão só.',
    imageAlt: 'O Compresso comparando uma foto antes e depois.',
    android1: { title: 'Entre no grupo de testadores', body: 'O Google libera os testadores por este grupo. Abra com a conta Google do seu celular e toque em Participar do grupo.', button: 'Entrar no grupo' },
    android2: { title: 'Ative seu acesso', body: 'Na página que abrir, toque em Torne-se um testador. Isso avisa o Google Play que o app pode aparecer para você.', button: 'Ativar acesso' },
    android3: { title: 'Instale pelo Google Play', body: 'Instala como qualquer outro app e se atualiza sozinho.', button: 'Abrir o Google Play' },
    androidNote: 'Um favor: mantenha o app instalado por 14 dias. O Google pede duas semanas de uso real antes de liberar um app novo para todo mundo. É com a sua ajuda que ele chega lá.',
    ios1: { title: 'Instale o TestFlight', body: 'O TestFlight é o app da própria Apple para testar apps antes do lançamento.', button: 'Baixar o TestFlight' },
    ios2: { title: 'Abra seu convite', body: 'Abra pelo seu iPhone, toque em Aceitar e depois em Instalar.', button: 'Abrir o convite' },
    iosNote: 'O TestFlight mantém o Compresso atualizado para você. Precisa do iOS 16.4 ou mais recente.',
    thanks: 'Obrigado por chegar primeiro. Se algo parecer estranho, ou muito bom, é só responder este e-mail. Ele vai direto para quem fez o Compresso.',
    share: 'Conhece alguém que ia querer também? Repasse este link:',
    footer: 'Você pediu este convite em compresso.izaias.xyz. É o único e-mail que você vai receber.',
  },
  es: {
    subject: 'Ya tienes tu invitación a Compresso',
    preheader: 'Unos dos minutos, y la tienes en el teléfono antes que nadie.',
    label: 'Tu invitación',
    titleName: '{name}, ya estás dentro.',
    title: 'Ya estás dentro.',
    intro: 'Tienes Compresso antes que nadie. Son unos dos minutos, y cada paso de abajo tiene un solo botón.',
    imageAlt: 'Compresso comparando una foto antes y después.',
    android1: { title: 'Únete al grupo de testers', body: 'Google deja entrar a los testers a través de este grupo. Ábrelo con la cuenta de Google de tu teléfono y toca Unirse al grupo.', button: 'Unirme al grupo' },
    android2: { title: 'Hazte tester', body: 'Así Google Play sabe que la app puede aparecerte.', button: 'Hacerme tester' },
    android3: { title: 'Instálala desde Google Play', body: 'Se instala como cualquier otra app y se actualiza sola.', button: 'Abrir Google Play' },
    androidNote: 'Un favor: mantenla instalada 14 días. Google pide dos semanas de uso real antes de abrir una app nueva a todos, y tú la ayudas a llegar.',
    ios1: { title: 'Instala TestFlight', body: 'TestFlight es la app de Apple para probar apps antes de su lanzamiento.', button: 'Descargar TestFlight' },
    ios2: { title: 'Abre tu invitación', body: 'Ábrela en tu iPhone, toca Aceptar y luego Instalar.', button: 'Abrir la invitación' },
    iosNote: 'TestFlight mantiene Compresso al día por ti. Necesita iOS 16.4 o posterior.',
    thanks: 'Gracias por llegar primero. Si algo no te convence, o te encanta, responde a este correo. Le llega directo a quien hizo Compresso.',
    share: '¿Conoces a alguien que también la querría? Pásale este enlace:',
    footer: 'Pediste esta invitación en compresso.izaias.xyz. Es el único correo que recibirás.',
  },
  fr: {
    subject: 'Votre invitation Compresso est arrivée',
    preheader: 'Environ deux minutes, et elle est sur votre téléphone avant tout le monde.',
    label: 'Votre invitation',
    titleName: '{name}, vous en êtes.',
    title: 'Vous en êtes.',
    intro: 'Vous avez Compresso avant tout le monde. Comptez environ deux minutes, et chaque étape ci-dessous tient en un bouton.',
    imageAlt: 'Compresso comparant une photo avant et après.',
    android1: { title: 'Rejoignez le groupe de testeurs', body: 'Google fait entrer les testeurs par ce groupe. Ouvrez-le avec le compte Google de votre téléphone, puis touchez Rejoindre le groupe.', button: 'Rejoindre le groupe' },
    android2: { title: 'Devenez testeur', body: 'Google Play sait ainsi que l’app peut vous être proposée.', button: 'Devenir testeur' },
    android3: { title: 'Installez-la depuis Google Play', body: 'Elle s’installe comme n’importe quelle app et se met à jour toute seule.', button: 'Ouvrir Google Play' },
    androidNote: 'Une faveur : gardez-la installée 14 jours. Google demande deux semaines d’usage réel avant qu’une nouvelle app ouvre à tous. C’est grâce à vous qu’elle y arrive.',
    ios1: { title: 'Installez TestFlight', body: 'TestFlight est l’app d’Apple pour essayer des apps avant leur sortie.', button: 'Obtenir TestFlight' },
    ios2: { title: 'Ouvrez votre invitation', body: 'Ouvrez ce lien sur votre iPhone, touchez Accepter, puis Installer.', button: 'Ouvrir l’invitation' },
    iosNote: 'TestFlight tient Compresso à jour pour vous. Nécessite iOS 16.4 ou plus récent.',
    thanks: 'Merci d’être là en premier. Si quelque chose cloche, ou vous plaît, répondez à cet e-mail. Il arrive directement à la personne qui a créé Compresso.',
    share: 'Quelqu’un aimerait en être aussi ? Transmettez-lui ce lien :',
    footer: 'Vous avez demandé cette invitation sur compresso.izaias.xyz. C’est le seul e-mail que vous recevrez.',
  },
  de: {
    subject: 'Deine Einladung zu Compresso ist da',
    preheader: 'Etwa zwei Minuten, und die App ist auf deinem Handy, vor allen anderen.',
    label: 'Deine Einladung',
    titleName: '{name}, du bist dabei.',
    title: 'Du bist dabei.',
    intro: 'Du bekommst Compresso vor allen anderen. Es dauert etwa zwei Minuten, und jeder Schritt unten hat genau einen Button.',
    imageAlt: 'Compresso vergleicht ein Foto vorher und nachher.',
    android1: { title: 'Tritt der Testgruppe bei', body: 'Google lässt Tester über diese Gruppe herein. Öffne sie mit dem Google-Konto deines Handys und tippe auf Gruppe beitreten.', button: 'Gruppe beitreten' },
    android2: { title: 'Werde Tester', body: 'So weiß Google Play, dass die App für dich erscheinen darf.', button: 'Tester werden' },
    android3: { title: 'Aus Google Play installieren', body: 'Sie installiert sich wie jede andere App und aktualisiert sich selbst.', button: 'Google Play öffnen' },
    androidNote: 'Eine Bitte: Behalte sie 14 Tage installiert. Google verlangt zwei Wochen echte Nutzung, bevor eine neue App für alle öffnet, und du hilfst ihr dabei.',
    ios1: { title: 'TestFlight installieren', body: 'TestFlight ist Apples eigene App, um Apps vor dem Start auszuprobieren.', button: 'TestFlight laden' },
    ios2: { title: 'Einladung öffnen', body: 'Öffne den Link auf deinem iPhone, tippe auf Akzeptieren und dann auf Installieren.', button: 'Einladung öffnen' },
    iosNote: 'TestFlight hält Compresso für dich aktuell. Braucht iOS 16.4 oder neuer.',
    thanks: 'Danke, dass du so früh dabei bist. Wenn sich etwas falsch anfühlt, oder genau richtig, antworte einfach auf diese E-Mail. Sie geht direkt an die Person, die Compresso gebaut hat.',
    share: 'Kennst du jemanden, der auch dabei sein will? Schick diesen Link weiter:',
    footer: 'Du hast diese Einladung auf compresso.izaias.xyz angefordert. Es ist die einzige E-Mail, die du bekommst.',
  },
  it: {
    subject: 'Il tuo invito a Compresso è arrivato',
    preheader: 'Un paio di minuti, ed è sul tuo telefono prima di tutti.',
    label: 'Il tuo invito',
    titleName: '{name}, ci sei.',
    title: 'Ci sei.',
    intro: 'Hai Compresso prima di tutti. Servono un paio di minuti, e ogni passo qui sotto ha un solo pulsante.',
    imageAlt: 'Compresso che confronta una foto prima e dopo.',
    android1: { title: 'Entra nel gruppo dei tester', body: 'Google fa entrare i tester attraverso questo gruppo. Aprilo con l’account Google del telefono e tocca Iscriviti al gruppo.', button: 'Entra nel gruppo' },
    android2: { title: 'Diventa tester', body: 'Così Google Play sa che l’app può comparire per te.', button: 'Diventa tester' },
    android3: { title: 'Installala da Google Play', body: 'Si installa come qualsiasi altra app e si aggiorna da sola.', button: 'Apri Google Play' },
    androidNote: 'Un favore: tienila installata per 14 giorni. Google chiede due settimane di uso reale prima che una nuova app si apra a tutti, e tu la aiuti ad arrivarci.',
    ios1: { title: 'Installa TestFlight', body: 'TestFlight è l’app di Apple per provare le app prima del lancio.', button: 'Scarica TestFlight' },
    ios2: { title: 'Apri il tuo invito', body: 'Aprilo sul tuo iPhone, tocca Accetta e poi Installa.', button: 'Apri l’invito' },
    iosNote: 'TestFlight tiene Compresso aggiornata per te. Serve iOS 16.4 o successivo.',
    thanks: 'Grazie per essere qui prima di tutti. Se qualcosa non ti torna, o ti piace molto, rispondi a questa email. Arriva dritta a chi ha creato Compresso.',
    share: 'Conosci qualcuno a cui piacerebbe averla? Inoltra questo link:',
    footer: 'Hai chiesto questo invito su compresso.izaias.xyz. È l’unica email che riceverai.',
  },
  'zh-Hans': {
    subject: '你的 Compresso 邀请到了',
    preheader: '大约两分钟，它就会比所有人更早装到你的手机上。',
    label: '你的邀请',
    titleName: '{name}，欢迎加入。',
    title: '欢迎加入。',
    intro: '你会比所有人更早用上 Compresso。整个过程大约两分钟，下面每一步只有一个按钮。',
    imageAlt: 'Compresso 对比一张照片压缩前后的效果。',
    android1: { title: '加入测试者群组', body: 'Google 通过这个群组让测试者加入。请用手机上的 Google 账号打开，然后点按“加入群组”。', button: '加入群组' },
    android2: { title: '成为测试者', body: '这样 Google Play 就知道可以向你显示这款应用。', button: '成为测试者' },
    android3: { title: '从 Google Play 安装', body: '安装方式和其他应用一样，并会自动更新。', button: '打开 Google Play' },
    androidNote: '有个小请求：请保留安装 14 天。Google 要求新应用经过两周的真实使用后才能向所有人开放，是你帮它走到这一步。',
    ios1: { title: '安装 TestFlight', body: 'TestFlight 是 Apple 官方用于在发布前试用应用的工具。', button: '获取 TestFlight' },
    ios2: { title: '打开你的邀请', body: '在 iPhone 上打开此链接，点按“接受”，然后点按“安装”。', button: '打开邀请' },
    iosNote: 'TestFlight 会帮你自动更新 Compresso。需要 iOS 16.4 或更高版本。',
    thanks: '感谢你抢先加入。如果有什么不对劲，或者让你满意，回复这封邮件即可，它会送到 Compresso 的开发者手中。',
    share: '认识也想加入的人吗？把这个链接发给他们：',
    footer: '你在 compresso.izaias.xyz 申请了这份邀请。这是你会收到的唯一一封邮件。',
  },
};
