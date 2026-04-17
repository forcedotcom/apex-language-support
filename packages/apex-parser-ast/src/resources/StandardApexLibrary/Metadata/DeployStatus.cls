/**
 * The result status of a deployment.
 */
global enum DeployStatus {
  Canceled,
  Canceling,
  Failed,
  FinalizingDeploy,
  FinalizingDeployFailed,
  InProgress,
  Pending,
  Succeeded,
  SucceededPartial
}