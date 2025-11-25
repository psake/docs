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
  // By default, Docusaurus generates a sidebar from the docs folder structure
  tutorialSidebar: [
    'intro',
    {
      type: 'category',
      label: 'Tutorial - Basics',
      items: [
        'tutorial-basics/installing',
        'tutorial-basics/getting-help',
        'tutorial-basics/run-psake',
        'tutorial-basics/tasks',
        'tutorial-basics/parameters-properties',
        'tutorial-basics/default-build-files',
        'tutorial-basics/how-to-fail-a-build',
        'tutorial-basics/nested-build',
      ],
    },
    {
      type: 'category',
      label: 'Tutorial - Advanced',
      items: [
        'tutorial-advanced/access-functions-in-another-file',
        'tutorial-advanced/build-script-resilience',
        'tutorial-advanced/debug-script',
        'tutorial-advanced/logging-errors',
        'tutorial-advanced/print-psake-task-name',
        'tutorial-advanced/retry-rules',
        'tutorial-advanced/structure-of-a-psake-build-script',
        'tutorial-advanced/variable-referencing',
      ],
    },
    {
      type: 'category',
      label: 'Build Types',
      items: [
        'build-types/dot-net-solution',
        'build-types/nodejs',
        'build-types/docker'
      ]
    },
    {
      type: 'category',
      label: 'CI Examples',
      items: [
        'ci-examples/github-actions',
        'ci-examples/azure-pipelines',
        'ci-examples/gitlab-ci',
        'ci-examples/hudson',
        'ci-examples/cruise-control',
        'ci-examples/team-city',
      ]
    },
    {
      type: 'category',
      label: 'Command Reference',
      items: commands
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

  // But you can create a sidebar manually
  /*
  tutorialSidebar: [
    'intro',
    'hello',
    {
      type: 'category',
      label: 'Tutorial',
      items: ['tutorial-basics/create-a-document'],
    },
  ],
   */
};

export default sidebars;
