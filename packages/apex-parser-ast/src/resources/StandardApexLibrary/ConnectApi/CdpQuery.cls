/**
 * Get Data 360 metadata and query data.
 */
public class CdpQuery {

  public static ConnectApi.CdpQueryMetadataOutput getAllMetadata() {}

  public static ConnectApi.CdpQueryMetadataOutput getAllMetadata(String entityType, String entityCategory, String entityName) {}

  public static ConnectApi.CdpQueryMetadataOutput getAllMetadata(String entityType, String entityCategory, String entityName, String dataspace) {}

  public static ConnectApi.CdpQueryOutput getDataGraphData(String dataGraphEntityName, String id) {}

  public static ConnectApi.CdpQueryOutput getDataGraphData(String dataGraphEntityName, String id, String dataspace) {}

  public static ConnectApi.CdpQueryOutput getDataGraphData(String dataGraphEntityName, String id, Boolean live) {}

  public static ConnectApi.CdpQueryOutput getDataGraphData(String dataGraphEntityName, String id, String dataspace, Boolean live) {}

  public static ConnectApi.CdpQueryOutput getDataGraphDataWithLookupKeys(String dataGraphEntityName, String lookupKeys) {}

  public static ConnectApi.CdpQueryOutput getDataGraphDataWithLookupKeys(String dataGraphEntityName, String lookupKeys, String dataspace) {}

  public static ConnectApi.CdpQueryOutput getDataGraphDataWithLookupKeys(String dataGraphEntityName, String lookupKeys, String dataspace, Boolean noCache) {}

  public static ConnectApi.CdpDgMetadata getDataGraphMetadata() {}

  public static ConnectApi.CdpDgMetadata getDataGraphMetadata(String dataGraphEntityName) {}

  public static ConnectApi.CdpDgMetadata getDataGraphMetadata(String dataGraphEntityName, String dataspace) {}

  public static ConnectApi.CdpQueryMetadataOutput getInsightsMetadata() {}

  public static ConnectApi.CdpQueryMetadataOutput getInsightsMetadata(String ciName) {}

  public static ConnectApi.CdpQueryMetadataOutput getInsightsMetadata(String ciName, String dataspace) {}

  public static ConnectApi.CdpQueryMetadataOutput getProfileMetadata() {}

  public static ConnectApi.CdpQueryMetadataOutput getProfileMetadata(String dataModelName) {}

  public static ConnectApi.CdpQueryMetadataOutput getProfileMetadata(String dataModelName, String dataspace) {}

  public static ConnectApi.CdpQueryOutput queryANSISql(ConnectApi.CdpQueryInput input) {}

  public static ConnectApi.CdpQueryOutput queryANSISql(ConnectApi.CdpQueryInput input, Integer batchSize, Integer offset, String orderby) {}

  public static ConnectApi.CdpQueryOutput queryANSISql(ConnectApi.CdpQueryInput input, Integer batchSize, Integer offset, String orderby, String dataspace) {}

  public static ConnectApi.CdpQueryOutputV2 queryAnsiSqlV2(ConnectApi.CdpQueryInput input) {}

  public static ConnectApi.CdpQueryOutputV2 queryAnsiSqlV2(ConnectApi.CdpQueryInput input, String dataspace) {}

  public static ConnectApi.CdpQueryOutputV2 nextBatchAnsiSqlV2(String nextBatchId) {}

  public static ConnectApi.CdpQueryOutputV2 nextBatchAnsiSqlV2(String nextBatchId, String dataspace) {}

  public static ConnectApi.QuerySqlOutput querySql(ConnectApi.QuerySqlInput input) {}

  public static ConnectApi.QuerySqlOutput querySql(ConnectApi.QuerySqlInput input, String dataspace) {}

  public static ConnectApi.QuerySqlOutput querySql(ConnectApi.QuerySqlInput input, String workloadName, String dataspace) {}

  public static ConnectApi.QuerySqlPageOutput querySqlRows(String queryId, Long offset, Long rowLimit) {}

  public static ConnectApi.QuerySqlPageOutput querySqlRows(String queryId, Long offset, Long rowLimit, Boolean omitSchema) {}

  public static ConnectApi.QuerySqlPageOutput querySqlRows(String queryId, Long offset, Long rowLimit, String dataspace) {}

  public static ConnectApi.QuerySqlPageOutput querySqlRows(String queryId, Long offset, Long rowLimit, Boolean omitSchema, String dataspace) {}

  public static ConnectApi.QuerySqlPageOutput querySqlRows(String queryId, Long offset, Long rowLimit, String workloadName, String dataspace) {}

  public static ConnectApi.QuerySqlPageOutput querySqlRows(String queryId, Long offset, Long rowLimit, Boolean omitSchema, String workloadName, String dataspace) {}

  public static Void cancelQuerySql(String queryId) {}

  public static Void cancelQuerySql(String queryId, String dataspace) {}

  public static Void cancelQuerySql(String queryId, String workloadName, String dataspace) {}

  public static ConnectApi.QuerySqlStatus querySqlStatus(String queryId) {}

  public static ConnectApi.QuerySqlStatus querySqlStatus(String queryId, Integer waitTimeMs) {}

  public static ConnectApi.QuerySqlStatus querySqlStatus(String queryId, String dataspace) {}

  public static ConnectApi.QuerySqlStatus querySqlStatus(String queryId, String dataspace, Integer waitTimeMs) {}

  public static ConnectApi.QuerySqlStatus querySqlStatus(String queryId, String workloadName, String dataspace) {}

  public static ConnectApi.QuerySqlStatus querySqlStatus(String queryId, String workloadName, String dataspace, Integer waitTimeMs) {}

  public static ConnectApi.CdpQueryOutput queryCalculatedInsights(String ciName, String dimensions, String measures, String orderby, String filters, Integer batchSize, Integer offset) {}

  public static ConnectApi.CdpQueryOutput queryCalculatedInsights(String ciName, String dimensions, String measures, String orderby, String filters, Integer batchSize, Integer offset, String timeGranularity) {}

  public static ConnectApi.CdpQueryOutput queryCalculatedInsights(String ciName, String dimensions, String measures, String orderby, String filters, Integer batchSize, Integer offset, String timeGranularity, String dataspace) {}

  public static ConnectApi.CdpQueryOutput queryProfileApi(String dataModelName, String filters, String fields, Integer batchSize, Integer offset, String orderby) {}

  public static ConnectApi.CdpQueryOutput queryProfileApi(String dataModelName, String id, String searchKey, String filters, String fields, Integer batchSize, Integer offset, String orderby) {}

  public static ConnectApi.CdpQueryOutput queryProfileApi(String dataModelName, String id, String childDataModelName, String searchKey, String filters, String fields, Integer batchSize, Integer offset, String orderby) {}

  public static ConnectApi.CdpQueryOutput queryProfileApi(String dataModelName, String id, String ciName, String searchKey, String dimensions, String measures, String filters, String fields, Integer batchSize, Integer offset, String orderby) {}

  public static ConnectApi.CdpQueryOutput queryProfileApi(String dataModelName, String id, String ciName, String searchKey, String dimensions, String measures, String filters, String fields, Integer batchSize, Integer offset, String orderby, String timeGranularity) {}

  public static ConnectApi.CdpQueryOutput queryProfileApi(String dataModelName, String id, String ciName, String searchKey, String dimensions, String measures, String filters, String fields, Integer batchSize, Integer offset, String orderby, String timeGranularity, String dataspace) {}

  public static ConnectApi.CdpQueryDataOutput universalIdLookupBySourceId(String entityName, String dataSourceId, String dataSourceObjectId, String sourceRecordId) {}

  public static ConnectApi.CdpQueryDataOutput universalIdLookupBySourceId(String entityName, String dataSourceId, String dataSourceObjectId, String sourceRecordId, String dataspace) {}

}