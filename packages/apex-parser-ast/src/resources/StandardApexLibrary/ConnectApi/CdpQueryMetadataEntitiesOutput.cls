/**
 * Represents a list of metadata entities.
 */
global class CdpQueryMetadataEntitiesOutput {

  global CdpQueryMetadataEntitiesOutput() {}

  /**
   * Indicates whether all metadata entities have been retrieved ( true ) or not ( false ).
   */
  global Boolean done;

  /**
   * List of metadata entities.
   */
  global List < ConnectApi.QueryMetadataEntityOutput > metadata;

  /**
   * ID for the next batch of metadata entities. Present only when done is false . When done is true , this field is omitted from the response.
   */
  global String nextBatchId;

  global Object clone() {}

}