import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';
import commands from "./docs/commands/docusaurus.sidebar.js";

/**
 * Creating a sidebar enables you to:
 - create an ordered group of docs
 - render a sidebar for each doc of that group
 - provide next/previous navigation

 The sidebars can be generated from the filesystem, or explicitly defined here.

 Create as many sidebars as you want.
 */
const sidebars: SidebarsConfig = {
  // Getting Started - For newcomers and quick onboarding
  gettingStartedSidebar: [
    'intro',
    'tutorial-basics/installing',
    'tutorial-basics/getting-help',
    'tutorial-basics/run-psake',
    'tutorial-basics/tasks',
    'tutorial-basics/parameters-properties',
    'tutorial-basics/psake-config',
  ],

  // Guides - How-to guides, examples, and best practices
  guidesSidebar: [
    {
      type: 'category',
      label: 'Core Concepts',
      items: [
        'tutorial-basics/default-build-files',
        'tutorial-basics/how-to-fail-a-build',
        'tutorial-basics/nested-build',
        'tutorial-advanced/structure-of-a-psake-build-script',
      ],
    },
    {
      type: 'category',
      label: 'Advanced Techniques',
      items: [
        'tutorial-advanced/access-functions-in-another-file',
        'tutorial-advanced/build-script-resilience',
        'tutorial-advanced/debug-script',
        'tutorial-advanced/custom-logging',
        'tutorial-advanced/logging-errors',
        'tutorial-advanced/outputs-and-artifacts',
        'tutorial-advanced/print-psake-task-name',
        'tutorial-advanced/retry-rules',
        'tutorial-advanced/variable-referencing',
      ],
    },
    {
      type: 'category',
      label: 'Build Type Examples',
      items: [
        'build-types/dot-net-solution',
        'build-types/nodejs',
        'build-types/docker'
      ]
    },
    {
      type: 'category',
      label: 'CI/CD Integration',
      items: [
        'ci-examples/github-actions',
        'ci-examples/azure-pipelines',
        'ci-examples/gitlab-ci',
        'ci-examples/hudson',
        'ci-examples/cruise-control',
        'ci-examples/team-city',
      ]
    },
  ],

  // Reference - Command reference, troubleshooting, and lookup materials
  referenceSidebar: [
    {
      type: 'category',
      label: 'Command Reference',
      items: commands
    },
    {
      type: 'category',
      label: 'Reference Materials',
      items: [
        'reference/configuration-reference',
        'reference/cheat-sheet',
        'reference/glossary',
        'reference/exit-codes',
      ]
    },
    {
      type: 'category',
      label: 'Troubleshooting',
      items: [
        'troubleshooting/common-errors',
        'troubleshooting/faq',
        'troubleshooting/debugging-guide',
      ]
    },
    {
      type: 'doc',
      label: 'Code of Conduct',
      id: 'code_of_conduct'
    },
  ],
};

export default sidebars;
