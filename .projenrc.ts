import { javascript, typescript, github } from 'projen';
const project = new typescript.TypeScriptProject({
  authorName: 'yicr',
  authorEmail: 'yicr@users.noreply.github.com',
  typescriptVersion: '5.9.x',
  defaultReleaseBranch: 'main',
  name: 'athena-query-builder',
  packageManager: javascript.NodePackageManager.YARN_CLASSIC,
  projenrcTs: true,
  repository: 'https://github.com/gammarers-aws-sdk-extensions/athena-query-builder.git',
  releaseToNpm: true,
  npmTrustedPublishing: false,
  npmAccess: javascript.NpmAccess.PUBLIC,
  minNodeVersion: '20.0.0',
  workflowNodeVersion: '24.x',
  depsUpgradeOptions: {
    workflowOptions: {
      labels: ['auto-approve', 'auto-merge'],
      schedule: javascript.UpgradeDependenciesSchedule.WEEKLY,
    },
  },
  githubOptions: {
    projenCredentials: github.GithubCredentials.fromApp({
      permissions: {
        pullRequests: github.workflows.AppPermission.WRITE,
        contents: github.workflows.AppPermission.WRITE,
        workflows: github.workflows.AppPermission.WRITE,
      },
    }),
  },
  autoApproveOptions: {
    allowedUsernames: [
      'gammarers-projen-upgrade-bot[bot]',
      'yicr',
    ],
  },
});
project.addPackageIgnore('/.devcontainer');
project.synth();