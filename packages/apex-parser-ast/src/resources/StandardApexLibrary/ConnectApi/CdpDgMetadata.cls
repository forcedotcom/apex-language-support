/**
 * Represents metadata from one or more data graphs.
 */
global class CdpDgMetadata {

  global CdpDgMetadata() {}

  /**
   * List of metadata from data graphs.
   */
  global List < ConnectApi.CdpQueryDataGraphMetadata > dataGraphMetadata;

  global Object clone() {}

}