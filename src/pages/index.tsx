import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';

import GitHubStats from '@site/src/components/GitHubStats';
import HeroCodePreview from '@site/src/components/HeroCodePreview';
import FeatureGrid from '@site/src/components/FeatureGrid';
import CodeShowcase from '@site/src/components/CodeShowcase';
import QuickStartSteps from '@site/src/components/QuickStartSteps';

import styles from './index.module.css';

function HomepageHeader() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <header className={clsx('hero', styles.heroBanner)}>
      <div className="container">
        <div className={styles.heroContent}>
          <div className={styles.heroText}>
            <div className={styles.heroTitleContainer}>
              <img src="/img/logo.svg" alt="psake logo" className={styles.heroLogo} />
              <Heading as="h1" className={styles.heroTitle}>
                {siteConfig.title}
              </Heading>
            </div>
            <p className={styles.heroSubtitle}>{siteConfig.tagline}</p>

            <div className={styles.buttonGroup}>
              <Link
                className="button button--primary button--lg"
                to="/docs/intro">
                Get Started
              </Link>
              <Link
                className="button button--secondary button--lg"
                to="https://github.com/psake/psake">
                <span className={styles.githubIcon}>⭐</span> View on GitHub
              </Link>
            </div>

            <GitHubStats />

            <div className={styles.badges}>
              <a href="https://www.powershellgallery.com/packages/psake" target="_blank" rel="noopener noreferrer">
                <img src="https://img.shields.io/powershellgallery/dt/psake.svg?style=flat-square&label=PowerShell%20Gallery%20downloads" alt="PowerShell Gallery" />
              </a>
              <a href="https://github.com/psake/psake/blob/main/LICENSE" target="_blank" rel="noopener noreferrer">
                <img src="https://img.shields.io/github/license/psake/psake.svg?style=flat-square&label=License" alt="License" />
              </a>
            </div>
          </div>

          <div className={styles.heroCode}>
            <HeroCodePreview />
          </div>
        </div>
      </div>
    </header>
  );
}

export default function Home(): JSX.Element {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout
      title={`${siteConfig.title}`}
      description="A build automation tool written in PowerShell">
      <HomepageHeader />
      <main>
        <FeatureGrid />
        <CodeShowcase />
        <QuickStartSteps />
      </main>
    </Layout>
  );
}
