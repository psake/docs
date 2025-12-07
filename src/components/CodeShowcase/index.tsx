import React, { useState } from 'react';
import CodeBlock from '@theme/CodeBlock';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

interface CodeExample {
  title: string;
  description: string;
  code: string;
  output?: string;
}

const examples: CodeExample[] = [
  {
    title: 'Simple Build',
    description: 'A basic build workflow with dependencies',
    code: `# Simple psakeFile.ps1
Task Default -Depends Build

Task Build -Depends Clean, Compile {
    Write-Host "Build completed!" -ForegroundColor Green
}

Task Clean {
    Remove-Item ./bin -Recurse -Force -ErrorAction Ignore
}

Task Compile {
    dotnet build -c Release
}`,
    output: `psake version 4.9.0
Copyright (c) 2010-2024 James Kovacs & Contributors

Executing Clean
Executing Compile
Executing Build
Build completed!

Build Succeeded!`
  },
  {
    title: 'CI/CD Pipeline',
    description: 'Automated testing and deployment pipeline',
    code: `# CI/CD psakeFile.ps1
Task Default -Depends Test

Task CI -Depends Clean, Build, Test, Deploy

Task Build {
    dotnet build -c Release
}

Task Test -Depends Build {
    dotnet test --no-build --logger "trx"
}

Task Deploy -Depends Test -RequiredVariables Environment {
    Write-Host "Deploying to $Environment" -ForegroundColor Cyan
    # Deployment logic
}

Task Clean {
    Remove-Item ./bin, ./TestResults -Recurse -Force -ErrorAction Ignore
}`,
    output: `Executing CI
Executing Clean
Executing Build
Executing Test
Test run for MyProject.Tests.dll (.NETCoreApp,Version=v8.0)
Passed!  - Tests: 42 (42 passed, 0 failed, 0 skipped)
Executing Deploy
Deploying to Production

Build Succeeded!`
  },
  {
    title: 'Multi-Environment',
    description: 'Deploy to different environments with configurations',
    code: `# Environment-aware psakeFile.ps1
Properties {
    $Environment = "Dev"
    $Version = "1.0.0"
}

Task Default -Depends Deploy

Task Deploy -Depends Build {
    switch ($Environment) {
        "Dev" {
            Write-Host "Deploying to Dev..." -ForegroundColor Yellow
            Invoke-Expression "./scripts/deploy-dev.ps1"
        }
        "Staging" {
            Write-Host "Deploying to Staging..." -ForegroundColor Cyan
            Invoke-Expression "./scripts/deploy-staging.ps1"
        }
        "Production" {
            Write-Host "Deploying to Production..." -ForegroundColor Magenta
            Invoke-Expression "./scripts/deploy-prod.ps1"
        }
    }
}

Task Build {
    dotnet publish -c Release -p:Version=$Version
}`,
    output: `Properties:
  Environment = Dev
  Version = 1.0.0

Executing Deploy
Executing Build
Deploying to Dev...

Build Succeeded!`
  }
];

export default function CodeShowcase(): JSX.Element {
  const [activeTab, setActiveTab] = useState(0);
  const activeExample = examples[activeTab];

  return (
    <section className={styles.showcaseSection}>
      <div className="container">
        <div className={styles.showcaseHeader}>
          <Heading as="h2">See psake in Action</Heading>
          <p className={styles.showcaseSubtitle}>
            Real-world examples showing how psake simplifies build automation
          </p>
        </div>

        <div className={styles.tabContainer}>
          <div className={styles.tabs}>
            {examples.map((example, index) => (
              <button
                key={index}
                className={`${styles.tab} ${activeTab === index ? styles.tabActive : ''}`}
                onClick={() => setActiveTab(index)}
              >
                {example.title}
              </button>
            ))}
          </div>

          <div className={styles.tabContent}>
            <p className={styles.exampleDescription}>{activeExample.description}</p>

            <div className={styles.codeOutputGrid}>
              <div className={styles.codeBlock}>
                <div className={styles.codeBlockHeader}>
                  <span>psakeFile.ps1</span>
                </div>
                <CodeBlock language="powershell" showLineNumbers>
                  {activeExample.code}
                </CodeBlock>
              </div>

              {activeExample.output && (
                <div className={styles.outputBlock}>
                  <div className={styles.codeBlockHeader}>
                    <span>Terminal Output</span>
                  </div>
                  <CodeBlock language="bash">
                    {activeExample.output}
                  </CodeBlock>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
