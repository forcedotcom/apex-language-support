/**
 * Represents a collection of Audience Data Model Object (DMO) records.
 */
global class AudienceDMOCollection {

  /**
   * Batch size
   */
  global Integer batchSize;

  /**
   * List of Audience DMO records.
   */
  global List < ConnectApi.ActivationData > data;

  /**
   * Start offset of the next batch.
   */
  global Integer offset;

}