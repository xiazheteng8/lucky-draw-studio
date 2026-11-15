(() => {
  // Brand marks: YouTube Press, Telegram media resources, GitHub Brand Toolkit.
  const icons = {"youtube": "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\" focusable=\"false\"><path fill=\"#FF0000\" d=\"M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.121 2.136c1.872.505 9.377.505 9.377.505s7.505 0 9.376-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814Z\"/><path fill=\"#fff\" d=\"m9.545 15.568 6.273-3.568-6.273-3.568z\"/></svg>", "telegram": "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\" focusable=\"false\"><circle cx=\"12\" cy=\"12\" r=\"12\" fill=\"#26A5E4\"/><path fill=\"#fff\" d=\"M5.491 11.74c3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635.099-.002.321.023.465.14.12.098.153.23.169.324.016.093.036.306.02.472-.18 1.897-.962 6.502-1.36 8.627-.168.899-.499 1.2-.82 1.23-.697.064-1.226-.46-1.9-.902-1.056-.692-1.653-1.123-2.678-1.798-1.185-.78-.417-1.21.258-1.91.176-.183 3.247-2.976 3.306-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.794 1.14-5.063 3.347-.479.329-.913.489-1.302.48-.428-.009-1.252-.242-1.865-.441-.752-.244-1.35-.374-1.298-.789.027-.216.327-.437.9-.664Z\"/></svg>", "github": "<svg viewBox=\"0 0 16 16\" aria-hidden=\"true\" focusable=\"false\"><path fill=\"#fff\" d=\"M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8Z\"/></svg>"};
  const labels = {
    youtube: 'YouTube',
    telegram: 'Telegram',
    github: 'GitHub'
  };

  async function mount() {
    const target = document.querySelector('#socialLinks');
    if (!target) return;
    const css=document.createElement('link');css.rel='stylesheet';css.href='/social-links.css';document.head.append(css);
    try {
      const response = await fetch('/public/social-links');
      if (!response.ok) return;
      const links = await response.json();
      for (const [name, href] of Object.entries(links)) {
        const link = document.createElement('a');
        link.href = href;
        link.target = '_blank';
        link.rel = 'noreferrer';
        link.className = `social-icon social-${name}`;
        link.title = labels[name];
        link.setAttribute('aria-label', labels[name]);
        if (!icons[name]) continue;
        // Markup comes only from the fixed local SVG constants.
        link.innerHTML = icons[name];
        target.append(link);
      }
    } catch { /* decorative external links must not break the page */ }
  }

  mount();
})();
