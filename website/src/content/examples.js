/**
 * Examples hub — framework integration pages for developer PLG SEO.
 */
export const EXAMPLES = [
  {
    id: 'react',
    repoPath: 'examples/react/App.jsx',
    npm: true,
  },
  {
    id: 'nextjs',
    repoPath: 'examples/nextjs/UploadForm.jsx',
    npm: true,
  },
  {
    id: 'vue',
    repoPath: 'examples/vue/App.vue',
    npm: true,
  },
  {
    id: 'svelte',
    repoPath: 'examples/svelte/App.svelte',
    npm: true,
  },
  {
    id: 'angular',
    repoPath: 'examples/angular/app.component.ts',
    npm: true,
  },
  {
    id: 'vanilla',
    repoPath: 'examples/vanilla/index.html',
    npm: false,
  },
];

export const EXAMPLES_PAGE_COPY = {
  en: {
    title: 'Framework Examples',
    metaTitle: 'compresso.js Examples — React, Vue, Next.js, Svelte, Angular',
    metaDescription:
      'Integration examples for compresso.js with React, Next.js, Vue, Svelte, Angular, and vanilla JavaScript. Compress images before upload.',
    intro:
      'compresso.js is framework-agnostic. These recipes show how to compress images on file select before upload — copy from the repository and adapt to your app.',
    viewOnGithub: 'View on GitHub',
    docsLink: 'Full documentation',
    install: 'Install',
  },
  es: {
    title: 'Ejemplos por framework',
    metaTitle: 'Ejemplos compresso.js — React, Vue, Next.js, Svelte, Angular',
    metaDescription:
      'Ejemplos de integración de compresso.js con React, Next.js, Vue, Svelte, Angular y JavaScript vanilla.',
    intro:
      'compresso.js es agnóstico al framework. Estas recetas muestran cómo comprimir al seleccionar un archivo antes de subirlo.',
    viewOnGithub: 'Ver en GitHub',
    docsLink: 'Documentación completa',
    install: 'Instalar',
  },
  fr: {
    title: 'Exemples par framework',
    metaTitle: 'Exemples compresso.js — React, Vue, Next.js, Svelte, Angular',
    metaDescription:
      'Exemples d’intégration de compresso.js avec React, Next.js, Vue, Svelte, Angular et JavaScript vanilla.',
    intro:
      'compresso.js est agnostique au framework. Ces recettes compressent à la sélection de fichier avant envoi.',
    viewOnGithub: 'Voir sur GitHub',
    docsLink: 'Documentation complète',
    install: 'Installer',
  },
  de: {
    title: 'Framework-Beispiele',
    metaTitle: 'compresso.js Beispiele — React, Vue, Next.js, Svelte, Angular',
    metaDescription:
      'Integrationsbeispiele für compresso.js mit React, Next.js, Vue, Svelte, Angular und Vanilla JS.',
    intro:
      'compresso.js ist framework-agnostisch. Diese Rezepte komprimieren bei Dateiauswahl vor dem Upload.',
    viewOnGithub: 'Auf GitHub ansehen',
    docsLink: 'Vollständige Dokumentation',
    install: 'Installieren',
  },
  it: {
    title: 'Esempi per framework',
    metaTitle: 'Esempi compresso.js — React, Vue, Next.js, Svelte, Angular',
    metaDescription:
      'Esempi di integrazione di compresso.js con React, Next.js, Vue, Svelte, Angular e JavaScript vanilla.',
    intro:
      'compresso.js è agnostico rispetto al framework. Queste ricette comprimono alla selezione del file prima dell’upload.',
    viewOnGithub: 'Vedi su GitHub',
    docsLink: 'Documentazione completa',
    install: 'Installa',
  },
  'pt-BR': {
    title: 'Exemplos por framework',
    metaTitle: 'Exemplos compresso.js — React, Vue, Next.js, Svelte, Angular',
    metaDescription:
      'Exemplos de integração do compresso.js com React, Next.js, Vue, Svelte, Angular e JavaScript vanilla.',
    intro:
      'O compresso.js é agnóstico a frameworks. Estas receitas comprimem ao selecionar o arquivo antes do envio.',
    viewOnGithub: 'Ver no GitHub',
    docsLink: 'Documentação completa',
    install: 'Instalar',
  },
  'zh-Hans': {
    title: '框架示例',
    metaTitle: 'compresso.js 示例 — React、Vue、Next.js、Svelte、Angular',
    metaDescription:
      'compresso.js 与 React、Next.js、Vue、Svelte、Angular 及 vanilla JS 的集成示例。',
    intro:
      'compresso.js 与框架无关。这些示例展示如何在文件选择后、上传前压缩图片。',
    viewOnGithub: '在 GitHub 查看',
    docsLink: '完整文档',
    install: '安装',
  },
};

export const EXAMPLE_LABELS = {
  en: { react: 'React', nextjs: 'Next.js', vue: 'Vue', svelte: 'Svelte', angular: 'Angular', vanilla: 'Vanilla JS (CDN)' },
  es: { react: 'React', nextjs: 'Next.js', vue: 'Vue', svelte: 'Svelte', angular: 'Angular', vanilla: 'JavaScript vanilla (CDN)' },
  fr: { react: 'React', nextjs: 'Next.js', vue: 'Vue', svelte: 'Svelte', angular: 'Angular', vanilla: 'JS vanilla (CDN)' },
  de: { react: 'React', nextjs: 'Next.js', vue: 'Vue', svelte: 'Svelte', angular: 'Angular', vanilla: 'Vanilla JS (CDN)' },
  it: { react: 'React', nextjs: 'Next.js', vue: 'Vue', svelte: 'Svelte', angular: 'Angular', vanilla: 'Vanilla JS (CDN)' },
  'pt-BR': { react: 'React', nextjs: 'Next.js', vue: 'Vue', svelte: 'Svelte', angular: 'Angular', vanilla: 'JavaScript vanilla (CDN)' },
  'zh-Hans': { react: 'React', nextjs: 'Next.js', vue: 'Vue', svelte: 'Svelte', angular: 'Angular', vanilla: 'Vanilla JS（CDN）' },
};

export function getExamplesForLocale(locale) {
  const copy = EXAMPLES_PAGE_COPY[locale] || EXAMPLES_PAGE_COPY.en;
  const labels = EXAMPLE_LABELS[locale] || EXAMPLE_LABELS.en;
  return { copy, labels, items: EXAMPLES };
}
