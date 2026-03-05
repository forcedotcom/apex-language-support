/**
 * Represents a class to execute metadata operations, such as retrieving or deploying custom metadata.
 */
global class Operations {

  /**
   * Makes a duplicate copy of the Metadata.Operations .
   * @return Object
   */
  public Object clone() {}

  /**
   * Retrieves a list of custom metadata components.
   * @param type The metadata component type.
   * @param fullNames A list of component names to retrieve. For information on component name formats, see Metadata.fullName() .
   * @return List<Metadata.Metadata>
   */
  public static List<Metadata.Metadata> retrieve(Metadata.MetadataType type, List<String> fullNames) {}

}