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
      matches: (url) => ['boards.greenhouse.io', 'job-boards.greenhouse.io'].includes(url.hostname),
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
  };
})();