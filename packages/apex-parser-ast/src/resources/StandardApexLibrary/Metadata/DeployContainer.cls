/**
 * Represents a container for custom metadata components to be deployed.
 * Usage
 * Use Metadata.DeployContainer to manage custom metadata components for deployment. A container must have one or more components before being deployed.
 * Example
 * // Use DeployContainer for deployment
 * Metadata.DeployContainer mdContainer = new Metadata.DeployContainer();
 * mdContainer.addMetadata(customMetadata);
 *
 * ...
 *
 * // Enqueue deploy
 * Metadata.Operations.enqueueDeployment(mdContainer, callback);
 */
global class DeployContainer {
    global DeployContainer() { }

    /**
     * Add a custom metadata component to the container.
     */
    global void addMetadata(Metadata.Metadata md) { }

    global virtual Boolean equals(Object o) { return false; }

    /**
     * Retrieves a list of custom metadata components from the container.
     */
    global List getMetadata() { return null; }

    global virtual Integer hashCode() { return 0; }

    /**
     * Removes a metadata component from the container.
     * @return Returns true if the container changed as a result of the call.
     */
    global Boolean removeMetadata(Metadata.Metadata md) { return false; }

    /**
     * Removes a metadata component from the container using the component’s full name.
     * @return Returns true if the container changed as a result of the call.
     */
    global Boolean removeMetadataByFullName(String fullName) { return false; }

    global override virtual String toString() { return null; }
}