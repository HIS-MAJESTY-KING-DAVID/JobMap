(() => {
  const adapters = [
    {
      id: 'greenhouse-standard',
      matches: (url) => ['boards.greenhouse.io', 'job-boards.greenhouse.io'].includes(url.hostname),
      fieldKey: (element) => ({
        first_name: 'firstName',
        last_name: 'lastName',
        email: 'email',
        phone: 'phone',
        linkedin_url: 'linkedin',
        portfolio_url: 'portfolio',
      }[element.name || element.id] || null),
    },
    {
      id: 'stripe-greenhouse',
      matches: (url) => url.hostname === 'stripe.com' && url.pathname.startsWith('/jobs/'),
      fieldKey: (element) => ({
        firstName: 'firstName',
        lastName: 'lastName',
        email: 'email',
        phone: 'phone',
        linkedIn: 'linkedin',
        portfolio: 'portfolio',
      }[element.name || element.id] || null),
    },
  ];

  window.JobMapAdapters = {
    current() {
      const url = new URL(window.location.href);
      return adapters.find((adapter) => adapter.matches(url)) || null;
    },
    fieldKey(element) {
      return this.current()?.fieldKey(element) || null;
    },
  };
})();
