import React, { useState } from 'react';
import CodeBlock from '@theme/CodeBlock';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

interface Step {
  number: number;
  title: string;
  description: string;
  code: string;
  language?: string;
}

const steps: Step[] = [
  {
    number: 1,
    title: 'Install psake',
    description: 'Install psake from the PowerShell Gallery',
    code: 'Install-Module -Name psake -Scope CurrentUser',
    language: 'powershell'
  },
  {
    number: 2,
    title: 'Create psakeFile.ps1',
    description: 'Define your build tasks in a psakeFile.ps1',
    code: `Task Default -Depends Build

Task Build {
    Write-Host "Building project..." -ForegroundColor Green
    # Your build logic here
}`,
    language: 'powershell'
  },
  {
    number: 3,
    title: 'Run Your Build',
    description: 'Execute psake to run your tasks',
    code: 'Invoke-psake',
    language: 'powershell'
  }
];

export default function QuickStartSteps(): JSX.Element {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopy = (code: string, index: number) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <section className={styles.quickStartSection}>
      <div className="container">
        <div className={styles.header}>
          <Heading as="h2">Get Started in 3 Steps</Heading>
          <p className={styles.subtitle}>
            Start automating your builds in minutes
          </p>
        </div>

        <div className={styles.stepsContainer}>
          {steps.map((step, index) => (
            <div key={step.number} className={styles.step}>
              <div className={styles.stepNumber}>{step.number}</div>
              <div className={styles.stepContent}>
                <Heading as="h3" className={styles.stepTitle}>
                  {step.title}
                </Heading>
                <p className={styles.stepDescription}>{step.description}</p>
                <div className={styles.codeContainer}>
                  <button
                    className={styles.copyButton}
                    onClick={() => handleCopy(step.code, index)}
                    title="Copy code"
                  >
                    {copiedIndex === index ? '✓ Copied!' : '📋 Copy'}
                  </button>
                  <CodeBlock language={step.language || 'powershell'}>
                    {step.code}
                  </CodeBlock>
                </div>
              </div>
              {index < steps.length - 1 && (
                <div className={styles.stepConnector}>
                  <svg width="2" height="100" viewBox="0 0 2 100">
                    <line
                      x1="1"
                      y1="0"
                      x2="1"
                      y2="100"
                      stroke="var(--ifm-color-primary)"
                      strokeWidth="2"
                      strokeDasharray="5,5"
                    />
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className={styles.ctaContainer}>
          <a
            href="/docs/intro"
            className="button button--primary button--lg"
          >
            Read Full Tutorial
          </a>
          <a
            href="/docs/commands/Invoke-psake"
            className="button button--secondary button--lg"
          >
            Command Reference
          </a>
        </div>
      </div>
    </section>
  );
}
