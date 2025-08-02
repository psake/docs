// cSpell:ignore Untruncated
import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'psake',
  tagline: 'A build automation tool written in PowerShell',
  favicon: 'img/favicon.ico',

  // Set the production url of your site here
  url: 'https://psake.netlify.app',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'psake', // Usually your GitHub org/user name.
  projectName: 'docs', // Usually your repo name.

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl:
            'https://github.com/psake/docs/blob/main',
        },
        blog: {
          showReadingTime: true,
          feedOptions: {
            type: ['rss', 'atom'],
            xslt: true,
          },
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl:
            'https://github.com/psake/docs/blob/main',
          // Useful options to enforce blogging best practices
          onInlineTags: 'warn',
          onInlineAuthors: 'warn',
          onUntruncatedBlogPosts: 'warn',
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    // Replace with your project's social card
    image: 'img/social-card.png',
    navbar: {
      title: 'psake',
      logo: {
        alt: 'psake Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'tutorialSidebar',
          position: 'left',
          label: 'Tutorial',
        },
        { to: '/blog', label: 'Blog', position: 'left' },
        {
          href: 'https://github.com/psake/psake',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            {
              label: 'Quick Start',
              to: '/docs/intro',
            },
            {
              label: 'Tutorial - Basics',
              to: '/docs/tutorial-basics/installing',
            },
            {
              label: 'Command Reference',
              to: '/docs/commands/Assert',
            },
            {
              label: 'Code of Conduct',
              to: 'docs/code_of_conduct',
            },
          ],
        },
        {
          title: 'Community',
          items: [
            {
              label: 'PowerShell Discord: #psake',
              href: 'https://aka.ms/psdiscord',
            },
            {
              label: 'PowerShell Slack: #psake',
              href: 'https://aka.ms/psslack',
            },
            {
              label: 'GitHub Discussions',
              href: 'https://github.com/orgs/psake/discussions',
            },
            {
              label: 'Stack Overflow',
              href: 'https://stackoverflow.com/questions/tagged/psake',
            },
          ],
        },
        {
          title: 'More',
          items: [
            {
              label: 'Blog',
              to: '/blog',
            },
            {
              label: 'GitHub',
              href: 'https://github.com/psake',
            },
            {
              label: 'OpenCollective - Donate!',
              href: 'https://opencollective.com/psake',
            },
            {
              html: `
              <a href="https://www.netlify.com">
              <img src="https://www.netlify.com/v3/img/components/netlify-color-accent.svg" alt="Deploys by Netlify" />
              </a>
              `
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} psake Org. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['powershell'],
    },
  } satisfies Preset.ThemeConfig,

  plugins: [
    [
      'docusaurus-plugin-llms',
      {
        // Options here
        generateLLMsTxt: true,
        generateLLMsFullTxt: true,
        docsDir: 'docs',
        ignoreFiles: ['advanced/*', 'private/*'],
        title: 'psake Documentation',
        description: 'Complete reference documentation for psake',
        includeBlog: true,
        // Content cleaning options
        excludeImports: true,
        removeDuplicateHeadings: true,
        // Control documentation order
        //includeOrder: [
        //  'getting-started/*',
        //  'guides/*',
        //  'api/*',
        //],
        includeUnmatchedLast: true,
        // Path transformation options
        pathTransformation: {
          // Paths to ignore when constructing URLs (will be removed if found)
          ignorePaths: ['docs'],
          // Paths to add when constructing URLs (will be prepended if not already present)
          addPaths: ['api'],
        },
        // Custom LLM files for specific documentation sections
        // customLLMFiles: [
        //   {
        //     filename: 'llms-python.txt',
        //     includePatterns: ['api/python/**/*.md', 'guides/python/*.md'],
        //     fullContent: true,
        //     title: 'Python API Documentation',
        //     description: 'Complete reference for Python API'
        //   },
        //   {
        //     filename: 'llms-tutorials.txt',
        //     includePatterns: ['tutorials/**/*.md'],
        //     fullContent: false,
        //     title: 'Tutorial Documentation',
        //     description: 'All tutorials in a single file'
        //   }
        // ],
      },
    ],
  ],
};

export default config;
