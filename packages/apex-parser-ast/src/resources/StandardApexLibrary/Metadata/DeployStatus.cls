/**
 * The result status of a deployment.
 * Usage
 * Metadata.DeployResult.status uses this enum to describe the results of the deployment.
 * Enum Values
 * The following are the values of the Metadata.DeployStatus enum.
 */
global enum DeployStatus {
    Canceled,
    Canceling,
    Failed,
    InProgress,
    Pending,
    Succeeded,
    SucceededPartial

}