(() => {
  /**
   * JobMap ApplyFlow Bridge — adapters.js v0.3.0
   *
   * Per-domain registry of approved employer forms. Each adapter maps the
   * employer's real control names/ids to JobMap's safe-field keys and
   * describes what the live form contains (file inputs, selects, required
   * fields) so the content script can pause correctly instead of guessing.
   *
   * The host must be listed here (or matched by an adapter) before any fill
   * happens — the fill allowlist is separate from the JobMap origin that
   * authenticates the bundle.
   */

  const adapters = [
    {
      id: 'greenhouse-standard',
      matches: (url) => ['boards.greenhouse.io', 'job-boards.greenhouse.io', 'job-boards.eu.greenhouse.io'].includes(url.hostname),
      fieldKey: (element) => {
        const name = element.name || element.id || '';
        const mapped = {
          first_name: 'firstName',
          last_name: 'lastName',
          email: 'email',
          phone: 'phone',
          mobile_phone: 'phone',
          linkedin_url: 'linkedin',
          portfolio_url: 'portfolio',
          website: 'portfolio',
          cover_letter: 'coverNote',
          cover_letter_body: 'coverNote',
        }[name];
        if (mapped) return mapped;
        // Greenhouse custom questions use question_<id> names; let the generic
        // label matcher in content.js decide those (usually 'unknown').
        return null;
      },
    },
    {
      id: 'stripe-greenhouse',
      matches: (url) => url.hostname === 'stripe.com' && url.pathname.startsWith('/jobs/'),
      fieldKey: (element) => {
        const name = element.name || element.id || '';
        const mapped = {
          firstName: 'firstName',
          lastName: 'lastName',
          email: 'email',
          phone: 'phone',
          linkedIn: 'linkedin',
          portfolio: 'portfolio',
          cover_letter: 'coverNote',
        }[name];
        return mapped || null;
      },
    },
    {
      // Lever-hosted application form: name/email/phone are flat inputs, extra
      // links arrive as urls[LinkedIn], urls[GitHub], urls[Portfolio], and the
      // free-text message is `comments`. `org` (current company) and GitHub
      // stay user-filled — not on the safe list.
      id: 'lever-hosted',
      matches: (url) => ['jobs.lever.co', 'jobs.eu.lever.co'].includes(url.hostname),
      fieldKey: (element) => {
        const name = element.name || element.id || '';
        const mapped = {
          name: 'fullName',
          fullname: 'fullName',
          email: 'email',
          phone: 'phone',
          comments: 'coverNote',
          cover_letter: 'coverNote',
        }[name];
        if (mapped) return mapped;
        const urls = name.match(/^urls\[(.+)\]$/);
        if (urls) {
          const kind = urls[1].toLowerCase();
          if (/linkedin/.test(kind)) return 'linkedin';
          if (/portfolio|website|personal.?site|web_site/.test(kind)) return 'portfolio';
        }
        return null;
      },
    },
    {
      // Ashby-hosted application form (jobs.ashbyhq.com/{org}/{id}/application).
      // Ashby renders standard DOM inputs; labels are human-readable, so the
      // generic label matcher in content.js covers most fields. This mapping
      // catches the common control name/id spellings first.
      id: 'ashby-hosted',
      matches: (url) => url.hostname === 'jobs.ashbyhq.com',
      fieldKey: (element) => {
        const name = `${element.name || ''} ${element.id || ''}`.toLowerCase();
        const candidates = [
          ['firstname', 'firstName'],
          ['first_name', 'firstName'],
          ['lastname', 'lastName'],
          ['last_name', 'lastName'],
          ['fullname', 'fullName'],
          ['full_name', 'fullName'],
          ['email', 'email'],
          ['phone', 'phone'],
          ['linkedin', 'linkedin'],
          ['portfolio', 'portfolio'],
          ['website', 'portfolio'],
          ['coverletter', 'coverNote'],
          ['cover_letter', 'coverNote'],
          ['cover note', 'coverNote'],
        ];
        for (const [needle, key] of candidates) if (name.includes(needle)) return key;
        return null;
      },
    },
  ];

  /**
   * Describe the live form for the fill engine: controls grouped by kind, so
   * blocked / required / file / select handling stays data-driven.
   */
  function describeForm() {
    const controls = Array.from(document.querySelectorAll('input, textarea, select'));
    const form = {
      hasForm: controls.length > 0,
      fileInputs: [],
      requiredInputs: [],
      controls,
    };
    controls.forEach((element) => {
      const type = (element.type || element.tagName || '').toLowerCase();
      if (type === 'file') form.fileInputs.push(element);
      const label = (element.labels?.[0]?.textContent || element.getAttribute('aria-label') || element.getAttribute('placeholder') || '')
        .toLowerCase();
      if (element.required || element.getAttribute('aria-required') === 'true' || /\*|required/i.test(label)) {
        form.requiredInputs.push(element);
      }
    });
    return form;
  }

  window.JobMapAdapters = {
    current() {
      const url = new URL(window.location.href);
      return adapters.find((adapter) => adapter.matches(url)) || null;
    },
    fieldKey(element) {
      return this.current()?.fieldKey(element) || null;
    },
    describeForm,
    /**
     * Landing-page resolver: on an aggregator/listing page, find the anchor
     * that points at the real employer application form. Returns the resolved
     * URL string or null. Never returns a URL on the current host — landing
     * pages that keep the user on-site (WWR login walls, mailto-only postings)
     * deliberately resolve to null.
     */
    resolveApplyUrl() {
      const currentUrl = new URL(window.location.href);
      const sameHost = (href) => {
        try { return new URL(href, currentUrl).hostname === currentUrl.hostname; } catch { return true; }
      };

      const candidates = [];
      const push = (href, score) => { if (href) candidates.push({ href, score }); };

      // 1. The employer-facing "apply" anchors, strongest first.
      document.querySelectorAll('a[href]').forEach((anchor) => {
        const href = anchor.getAttribute('href') || '';
        const text = (anchor.textContent || '').trim().toLowerCase();
        const combined = `${text} ${href} ${(anchor.className || '')}`.toLowerCase();
        if (sameHost(href)) return;
        if (/^(mailto:|javascript:)/i.test(href)) return;
        if (/utm_medium=ads|ref=sponsor|\/sponsor|\/advertise|\/hire|partner|promo|bundl|register|login|signin|download|apkd?\b|chrome.?store|addons\.mozilla/i.test(combined)) return;
        let score = 0;
        if (/apply|postulat|candidate|application/.test(text)) score += 4;
        if (/\/apply(\/|$)|job\/.+\/application/.test(href)) score += 4;
        if (/(greenhouse|lever|ashby|workday|myworkdayjobs|smartrecruiters|taleo|brassring|icims|dover|teamtailor|recruitee|bamboohr|breezy|workable|jazz|applytojob|jobvite|successfactors|gem|dropbox\.com|docs\.google\.com\/forms)/i.test(href)) score += 3;
        if (anchor.rel?.includes?.('noopener')) score += 1;
        if (score >= 4) push(href, score);
      });

      // 2. JobPosting structured data as a fallback hint.
      document.querySelectorAll('script[type="application/ld+json"]').forEach((script) => {
        try {
          const json = JSON.parse(script.textContent?.trim() || 'null');
          const blocks = Array.isArray(json) ? json : [json];
          for (const block of blocks) {
            if (block?.['@type'] !== 'JobPosting') continue;
            const contact = block.applicationContact || {};
            if (typeof contact.url === 'string' && !sameHost(contact.url)) push(contact.url, 3);
            if (typeof block.url === 'string' && /\/apply(\/|$)/.test(block.url) && !sameHost(block.url)) push(block.url, 3);
          }
        } catch { /* malformed ld+json — ignore */ }
      });

      if (!candidates.length) return null;
      candidates.sort((a, b) => b.score - a.score);
      const best = candidates[0];
      try { return new URL(best.href, currentUrl).toString(); } catch { return null; }
    },
  };
})();