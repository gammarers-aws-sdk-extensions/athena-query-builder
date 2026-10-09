import { ProjenTypeScriptProject } from '@gammarers/projen-projects';
const project = new ProjenTypeScriptProject({
  name: 'athena-query-builder',
  repositoryUrl: 'https://github.com/gammarers-aws-sdk-extensions/athena-query-builder.git',
  description: 'Fluent, immutable SQL builder for AWS Athena (Presto/Trino-style SQL). Build single-table SELECT, INSERT, UPDATE, and DELETE statements with escaped string literals—no query execution, catalog access, or ORM.',
  keywords: ['aws', 'athena', 'sql', 'builder', 'presto', 'trino'],
  devDeps: [
    '@gammarers/projen-projects@^0.5.7',
  ],
  releaseToNpm: true,
  npmTrustedPublishing: true,
});
project.synth();