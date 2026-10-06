/**
 * Represents the results of a metadata deployment.
 * Usage
 * After an asynchronous metadata deployment finishes, Salesforce provides an instance of Metadata.DeployResult in a call to your implementation of handleResult() in your Metadata.DeployCallback class.
 * Example
 * public void handleResult(Metadata.DeployResult result,
 *                          Metadata.DeployCallbackContext context) {
 *     if (result.status == Metadata.DeployStatus.Succeeded) {
 *         // Deployment was successful
 *     } else {
 *         // Deployment was not successful
 *     }
 * }
 */
global class DeployResult {
    /**
     * ID of the user who canceled the queued deployment.
     * String
     */
    global String canceledBy { get; set; }
    /**
     * Full name of the user who canceled the queued deployment.
     * String
     */
    global String canceledByName { get; set; }
    /**
     * Indicates whether the deployment checked only the validity of the deployed files without making changes in the org. A check-only deployment does not deploy components or change the org in any way.
     * Boolean
     */
    global Boolean checkOnly { get; set; }
    /**
     * Date and time for when the deployment process ended.
     * Datetime
     */
    global Datetime completedDate { get; set; }
    /**
     * ID of the user who created the deployment job.
     * String
     */
    global String createdBy { get; set; }
    /**
     * Full name of the user who created the deployment job.
     * String
     */
    global String createdByName { get; set; }
    /**
     * Date and time the deployment job was first queued.
     * Datetime
     */
    global Datetime createdDate { get; set; }
    /**
     * Provides the details for components in a completed deployment.
     * Metadata.DeployDetails
     */
    global Metadata.DeployDetails details { get; set; }
    /**
     * Indicates whether Salesforce finished processing the deployment.
     * Boolean
     */
    global Boolean done { get; set; }
    /**
     * Message corresponding to the values in the errorStatusCode property, if any.
     * String
     */
    global String errorMessage { get; set; }
    /**
     * If an error occurs during deployment, a status code is returned. The message corresponding to the status code is returned in the errorMessagefield property.
     * String
     * For a description of each status code value, see <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.api.meta/api/sforce_api_calls_concepts_core_data_objects.htm" target="_blank">Core Data Types Used in API Calls</a> in the SOAP API Developer Guide.
     */
    global Metadata.StatusCode errorStatusCode { get; set; }
    /**
     * ID of the deployment job.
     * Id
     */
    global Id id { get; set; }
    /**
     * Specifies whether a deployment continues, even if the deployment generates warnings.
     * Boolean
     */
    global Boolean ignoreWarnings { get; set; }
    /**
     * Date and time of the last update for the deployment process.
     * Datetime
     */
    global Datetime lastModifiedDate { get; set; }
    /**
     * A list of all the detail messages for a deployment.
     * List<Metadata.DeployMessage>
     */
    global List messages { get; set; }
    /**
     * The number of components that generated errors during the deployment.
     * Integer
     */
    global Integer numberComponentErrors { get; set; }
    /**
     * The number of components deployed in the deployment process. Use this value with the numberComponentsTotal property to get an estimate of the deployment’s progress.
     * Integer
     */
    global Integer numberComponentsDeployed { get; set; }
    /**
     * The total number of components in the deployment. Use this value with the numberComponentsDeployed property to get an estimate of the deployment’s progress.
     * Integer
     */
    global Integer numberComponentsTotal { get; set; }
    /**
     * Indicates whether any failure causes a complete rollback (true) or not (false) of the deployment.
     * Boolean
     */
    global Boolean rollbackOnError { get; set; }
    /**
     * Date and time the deployment process began.
     * Datetime
     */
    global Datetime startDate { get; set; }
    /**
     * Indicates which component is being deployed.
     * String
     */
    global String stateDetail { get; set; }
    /**
     * Indicates the current state of the deployment.
     * Metadata.DeployStatus
     */
    global Metadata.DeployStatus status { get; set; }
    /**
     * Indicates whether the deployment was successful (true) or not (false).
     * Boolean
     */
    global Boolean success { get; set; }

    global DeployResult() { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}