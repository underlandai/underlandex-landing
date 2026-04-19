export const headerData = {
  links: [
    { text: 'Explorer', href: 'https://app.underlandex.com', ariaLabel: 'UnderlandEX Explorer' },
    { text: 'M&A', href: 'https://mna.underlandex.com', ariaLabel: 'UnderlandEX M&A' },
    { text: 'Portal3D', href: 'https://portal3d.underlandex.com', ariaLabel: 'Portal3D' },
    { text: 'Data', href: '#data' },
    { text: 'Insights', href: '/insights' },
    { text: 'About', href: '#about' },
  ],
  actions: [
    { variant: 'secondary', text: 'Talk to Sales', href: '#request-access' },
    { variant: 'primary', text: 'Sign In', href: 'https://app.underlandex.com' },
  ],
};

export const footerData = {
  links: [
    {
      title: 'Products',
      links: [
        { text: 'UnderlandEX Explorer', href: 'https://app.underlandex.com' },
        { text: 'UnderlandEX M&A', href: 'https://mna.underlandex.com' },
        { text: 'Portal3D', href: 'https://portal3d.underlandex.com' },
      ],
    },
    {
      title: 'Company',
      links: [
        { text: 'About', href: '#about' },
        { text: 'Insights', href: '/insights' },
        { text: 'Contact', href: '#request-access' },
        { text: 'Lichen Commodities', href: 'https://lichen.com.au' },
      ],
    },
    {
      title: 'Legal',
      links: [
        { text: 'Terms', href: 'https://app.underlandex.com/terms' },
        { text: 'Privacy', href: 'https://app.underlandex.com/privacy' },
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
