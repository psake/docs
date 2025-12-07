import React from 'react';
import CodeBlock from '@theme/CodeBlock';
import styles from './styles.module.css';

const sampleCode = `# psakeFile.ps1
Task Default -Depends Test, Build

Task Build -Depends Clean {
    Write-Host "Building project..." -ForegroundColor Green
    dotnet build -c Release
}

Task Test {
    Write-Host "Running tests..." -ForegroundColor Cyan
    dotnet test --no-build
}

Task Clean {
    Write-Host "Cleaning output..." -ForegroundColor Yellow
    Remove-Item ./bin -Recurse -Force -ErrorAction Ignore
}

Task Deploy -Depends Build {
    Write-Host "Deploying to production..." -ForegroundColor Magenta
    # Your deployment logic here
}`;

export default function HeroCodePreview(): JSX.Element {
  return (
    <div className={styles.codePreview}>
      <div className={styles.terminalHeader}>
        <div className={styles.terminalButtons}>
          <span className={styles.terminalButton}></span>
          <span className={styles.terminalButton}></span>
          <span className={styles.terminalButton}></span>
        </div>
        <div className={styles.terminalTitle}>psakeFile.ps1</div>
      </div>
      <div className={styles.codeWrapper}>
        <CodeBlock language="powershell" showLineNumbers>
          {sampleCode}
        </CodeBlock>
      </div>
    </div>
  );
}
