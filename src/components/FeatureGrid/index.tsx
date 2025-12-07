import React from 'react';
import CodeBlock from '@theme/CodeBlock';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

interface Feature {
  icon: string;
  title: string;
  description: string;
  code?: string;
}

const features: Feature[] = [
  {
    icon: '🔗',
    title: 'Task Dependencies',
    description: 'Define clear dependencies between tasks for organized, predictable builds',
    code: `Task Deploy -Depends Build, Test {
    # Deploy only after build and test succeed
}`
  },
  {
    icon: '🌍',
    title: 'Cross-Platform',
    description: 'Runs on Windows, macOS, and Linux with PowerShell 7+',
    code: `# Works everywhere PowerShell runs
Task Build {
    dotnet build -c Release
}`
  },
  {
    icon: '⚡',
    title: 'Simple Syntax',
    description: 'Clean, readable task definitions that are easy to understand and maintain',
    code: `Task Clean {
    Remove-Item ./bin -Recurse -Force
}`
  },
  {
    icon: '🔍',
    title: 'Built-in Assertions',
    description: 'Validate conditions and fail fast with helpful error messages',
    code: `Task Deploy {
    Assert (Test-Path ./build) "Build folder required"
}`
  },
  {
    icon: '🚀',
    title: 'CI/CD Ready',
    description: 'Integrates seamlessly with GitHub Actions, Azure DevOps, and Jenkins',
    code: `# GitHub Actions
- run: Invoke-psake -taskList CI
  shell: pwsh`
  },
  {
    icon: '📦',
    title: 'Flexible Properties',
    description: 'Configure builds with properties and override them at runtime',
    code: `Properties {
    $Configuration = "Release"
}
# Override: Invoke-psake -properties @{Configuration="Debug"}`
  },
  {
    icon: '🎯',
    title: 'Preconditions',
    description: 'Skip tasks conditionally based on your build environment',
    code: `Task Deploy -Precondition { $Env -eq "Prod" } {
    # Only runs in production
}`
  },
  {
    icon: '🛠️',
    title: 'PowerShell Ecosystem',
    description: 'Use any PowerShell module or script in your build tasks',
    code: `Task Test {
    Invoke-Pester -Path ./tests
    # Use Pester, PSScriptAnalyzer, etc.
}`
  }
];

export default function FeatureGrid(): JSX.Element {
  return (
    <section className={styles.featureSection}>
      <div className="container">
        <div className={styles.header}>
          <Heading as="h2">Why Choose psake?</Heading>
          <p className={styles.subtitle}>
            Powerful features designed for modern build automation
          </p>
        </div>

        <div className={styles.grid}>
          {features.map((feature, index) => (
            <div key={index} className={styles.featureCard}>
              <div className={styles.featureIcon}>{feature.icon}</div>
              <Heading as="h3" className={styles.featureTitle}>
                {feature.title}
              </Heading>
              <p className={styles.featureDescription}>{feature.description}</p>
              {feature.code && (
                <div className={styles.featureCode}>
                  <CodeBlock language="powershell" className={styles.miniCode}>
                    {feature.code}
                  </CodeBlock>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
