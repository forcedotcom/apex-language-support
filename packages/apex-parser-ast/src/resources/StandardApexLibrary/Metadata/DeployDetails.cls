/**
 * Contains detailed information on deployed components.
 * <p>Usage
 * Use this class to obtain a list of the successfully and unsuccessfully deployed components after a completed deployment by Salesforce in your Metadata.DeployCallback results.
 */
global class DeployDetails {
    /**
     * Contains a list of information about components that failed to deploy.
     * <p>List<Metadata.DeployMessage>
     */
    global List componentFailures { get; set; }
    /**
     * Contains a list of information about components that deployed successfully.
     * <p>List<Metadata.DeployMessage>
     */
    global List componentSuccesses { get; set; }

    global DeployDetails() { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}