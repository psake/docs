import React, { useEffect, useState } from 'react';
import styles from './styles.module.css';

interface GitHubStatsProps {
  repo?: string;
}

interface RepoStats {
  stars: number;
  forks: number;
  watchers: number;
}

export default function GitHubStats({ repo = 'psake/psake' }: GitHubStatsProps): JSX.Element {
  const [stats, setStats] = useState<RepoStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`https://api.github.com/repos/${repo}`)
      .then(res => res.json())
      .then(data => {
        setStats({
          stars: data.stargazers_count || 0,
          forks: data.forks_count || 0,
          watchers: data.subscribers_count || 0,
        });
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [repo]);

  if (loading) {
    return (
      <div className={styles.statsContainer}>
        <div className={styles.statItem}>
          <span className={styles.statValue}>...</span>
          <span className={styles.statLabel}>Stars</span>
        </div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <div className={styles.statsContainer}>
      <div className={styles.statItem}>
        <span className={styles.statValue}>{stats.stars.toLocaleString()}</span>
        <span className={styles.statLabel}>⭐ Stars</span>
      </div>
      <div className={styles.statItem}>
        <span className={styles.statValue}>{stats.forks.toLocaleString()}</span>
        <span className={styles.statLabel}>🍴 Forks</span>
      </div>
      <div className={styles.statItem}>
        <span className={styles.statValue}>{stats.watchers.toLocaleString()}</span>
        <span className={styles.statLabel}>👁️ Watchers</span>
      </div>
    </div>
  );
}
