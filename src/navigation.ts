export const headerData = {
  links: [
    { text: 'Explorer', href: '/explorer' },
    { text: 'M&A', href: '/mna' },
    { text: 'Data', href: '/#data' },
    { text: 'Insights', href: '/insights' },
    { text: 'About', href: '/#about' },
  ],
  actions: [
    { variant: 'secondary', text: 'Enquire', href: 'mailto:oliver@underlandex.com' },
    { variant: 'primary', text: 'Request Access', href: '#request-access', openRequestAccess: true },
  ],
};

export const footerData = {
  links: [
    {
      title: 'Products',
      links: [
        { text: 'UnderlandEX Explorer', href: '/explorer' },
        { text: 'UnderlandEX M&A', href: '/mna' },
      ],
    },
    {
      title: 'Company',
      links: [
        { text: 'About', href: '/#about' },
        { text: 'Insights', href: '/insights' },
        { text: 'Contact', href: 'mailto:oliver@underlandex.com' },
      ],
    },
    {
      title: 'Legal',
      links: [
        { text: 'Terms', href: '/terms' },
        { text: 'Privacy', href: '/privacy' },
      ],
    },
  ],
  secondaryLinks: [],
  socialLinks: [
    { ariaLabel: 'LinkedIn', icon: 'tabler:brand-linkedin', href: 'https://www.linkedin.com/company/underland' },
  ],
  footNote: `© ${new Date().getFullYear()} UnderlandEX. All rights reserved.`,
};
