import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

type FeatureItem = {
  title: string;
  Svg: React.ComponentType<React.ComponentProps<'svg'>>;
  description: JSX.Element;
};

const FeatureList: FeatureItem[] = [
  {
    title: 'Easy to Use',
    Svg: require('@site/static/img/bricks.svg').default,
    description: (
      <>
        psake was made to easily put together tasks and create simple to
        understand dependencies.
      </>
    ),
  },
  {
    title: 'Focus on What Matters',

    Svg: require('@site/static/img/cargo-ship.svg').default,
    description: (
      <>
        Make it easy to ship code by reducing your steps into tasks. Ship only
        what you need when you want to.
      </>
    ),
  },
  {
    title: 'Powered by PowerShell',
    Svg: require('@site/static/img/powershell.svg').default,
    description: (
      <>
        Use the same PowerShell code you know and love, making this cross platform!
      </>
    ),
  },
];

function Feature({ title, Svg, description }: FeatureItem) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center">
        <Svg className={styles.featureSvg} role="img" />
      </div>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): JSX.Element {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
