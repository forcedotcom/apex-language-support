/**
 * Query output for the V2 API.
 */
global class CdpQueryOutputV2 {

  /**
   * Result data set.
   */
  global List < ConnectApi.CdpQueryV2Row > (in version 55.0 and later) List <Object> (version 54.0 only) data;

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
  global Map < String , ConnectApi.CdpQueryMetadataItem > (version 55.0 and later) Map < String , Object> (version 54.0 only) metadata;

  /**
   * Next batch ID. Use this property as the nextBatchId parameter in the nextBatchAnsiSqlV2(nextBatchId) method to get the next batch of data.
   */
  global String nextBatchId;

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