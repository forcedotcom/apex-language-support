/**
 * Represents a container for custom metadata components to be deployed.
 */
global class DeployContainer {

  global DeployContainer() {}

  /**
   * Add a custom metadata component to the container.
   * @param md A custom metadata component class that derives from Metadata.Metadata . Avoid adding components to a Metadata.DeployContainer that have the same Metadata.Metadata.fullName because it causes deployment errors.
   */
  global void addMetadata(Metadata.Metadata md) {}

  /**
   * Makes a duplicate copy of the Metadata.DeployContainer .
   * @return Object
   */
  global Object clone() {}

  /**
   * Retrieves a list of custom metadata components from the container.
   * @return List<Metadata.Metadata>
   */
  global List<Metadata.Metadata> getMetadata() {}

  /**
   * Removes a metadata component from the container.
   * @param md Metadata component to remove.
   * @return Boolean
   */
  global Boolean removeMetadata(Metadata.Metadata md) {}

  /**
   * Removes a metadata component from the container using the component’s full name.
   * @param fullName Full name of the component to remove.
   * @return Boolean
   */
  global Boolean removeMetadataByFullName(String fullName) {}

}