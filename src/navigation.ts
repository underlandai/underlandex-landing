export const headerData = {
  links: [
    { text: 'Explorer', href: '#products' },
    { text: 'M&A', href: '#products' },
    { text: 'Portal3D', href: '#products' },
    { text: 'Data', href: '#data' },
    { text: 'Insights', href: '/insights' },
    { text: 'About', href: '#about' },
  ],
  actions: [
    { variant: 'secondary', text: 'Talk to Sales', href: 'mailto:sales@underlandex.com' },
    { variant: 'primary', text: 'Request Access', href: '#request-access', openRequestAccess: true },
  ],
};

export const footerData = {
  links: [
    {
      title: 'Products',
      links: [
        { text: 'UnderlandEX Explorer', href: '#products' },
        { text: 'UnderlandEX M&A', href: '#products' },
        { text: 'Portal3D', href: '#products' },
      ],
    },
    {
      title: 'Company',
      links: [
        { text: 'About', href: '#about' },
        { text: 'Insights', href: '/insights' },
        { text: 'Contact', href: 'mailto:sales@underlandex.com' },
        { text: 'Lichen Commodities', href: 'https://lichen.com.au' },
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
    { ariaLabel: 'LinkedIn', icon: 'tabler:brand-linkedin', href: 'https://www.linkedin.com/company/underlandex' },
  ],
  footNote: `
    © ${new Date().getFullYear()} Lichen Commodities Pty Ltd. All rights reserved. UnderlandEX is a service of Lichen Commodities.
  `,
};
