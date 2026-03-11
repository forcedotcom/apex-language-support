/**
 * Represents a data space.
 */
global class DataSpaceInfoRepresentation {

  /**
   * Description of the data space.
   */
  global String description;

  /**
   * Prefix of the data space.
   */
  global String prefix;

  /**
   * Status of the data space. Active —The data space is active. Error —The data space has an error. Processing —The data space is being processed.
   */
  global DataSpaceStatusEnum status;

}