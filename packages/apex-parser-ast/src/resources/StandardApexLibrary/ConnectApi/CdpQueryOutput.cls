/**
 * Query result.
 */
global class CdpQueryOutput {

  /**
   * Result data set.
   */
  global List <Object> data;

  /**
   * Specifies whether the query is done ( true ) or not ( false ).
   */
  global Boolean done;

  /**
   * Query end time.
   */
  global String endTime;

  /**
   * Result metadata set.
   */
  global Map < String , Object> metadata;

  /**
   * Query ID.
   */
  global String queryId;

  /**
   * Number of rows in the result data set.
   */
  global Integer rowCount;

  /**
   * Query start time.
   */
  global String startTime;

}