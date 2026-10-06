/**
 * Represents result information for the deployment of a metadata component.
 * Usage
 * Use DeployMessage to access detailed information about component deployments. Salesforce provides a list of DeployMessages for a completed deployment via the DeployDetails and DeployResults instances sent in the DeployCallback.handleResult() callback.
 */
global class DeployMessage {
    /**
     * Determines whether the component was changed after deployment. If true, the component was changed as a result of the deployment. If false, the deployed component was the same as the corresponding component already in the org.
     * Boolean
     */
    global Boolean changed { get; set; }
    /**
     * Each component is represented by a text file. If an error occurs during deployment, this property represents the column of the text file where the error occurred.
     * Integer
     */
    global Integer columnNumber { get; set; }
    /**
     * The metadata type of the component in the deployment.
     * String
     */
    global String componentType { get; set; }
    /**
     * If true, the component was created as a result of the deployment. If false, the component was modified as a result of the deployment.
     * Boolean
     */
    global Boolean created { get; set; }
    /**
     * The date and time when the component was created as a result of the deployment.
     * Datetime
     */
    global Datetime createdDate { get; set; }
    /**
     * If true, the component was deleted as a result of the deployment. If false, the component was either new or modified as result of the deployment.
     * Boolean
     */
    global Boolean deleted { get; set; }
    /**
     * The name of the file in the metadata archive used to deploy the component.
     * String
     */
    global String fileName { get; set; }
    /**
     * Full name for the custom metadata component.
     * String
     */
    global String fullName { get; set; }
    /**
     * ID of the component that was deployed.
     * Id
     */
    global Id id { get; set; }
    /**
     * Each component is represented by a text file. If an error occurs during deployment, this field represents the line number of the text file where the error occurred.
     * Integer
     */
    global Integer lineNumber { get; set; }
    /**
     * If an error or warning occurred, this field contains a description of the problem that caused the deployment to fail.
     * String
     */
    global String problem { get; set; }
    /**
     * Indicates the problem type, for example, an error or warning.
     * Metadata.DeployProblemType
     */
    global Metadata.DeployProblemType problemType { get; set; }
    /**
     * Indicates whether the component was successfully deployed (true) or not (false).
     * Boolean
     */
    global Boolean success { get; set; }

    global DeployMessage() { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}