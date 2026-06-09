/**
 * Get Data 360 metadata and query data.
 */
global class CdpQuery {

  global CdpQuery() {}

  global static ConnectApi.CdpQueryMetadataOutput getAllMetadata() {}

  global static ConnectApi.CdpQueryMetadataOutput getAllMetadata(String entityType, String entityCategory, String entityName) {}

  global static ConnectApi.CdpQueryMetadataOutput getAllMetadata(String entityType, String entityCategory, String entityName, String dataspace) {}

  global static ConnectApi.CdpQueryOutput getDataGraphData(String dataGraphEntityName, String id) {}

  global static ConnectApi.CdpQueryOutput getDataGraphData(String dataGraphEntityName, String id, String dataspace) {}

  global static ConnectApi.CdpQueryOutput getDataGraphData(String dataGraphEntityName, String id, Boolean live) {}

  global static ConnectApi.CdpQueryOutput getDataGraphData(String dataGraphEntityName, String id, String dataspace, Boolean live) {}

  global static ConnectApi.CdpQueryOutput getDataGraphDataWithLookupKeys(String dataGraphEntityName, String lookupKeys) {}

  global static ConnectApi.CdpQueryOutput getDataGraphDataWithLookupKeys(String dataGraphEntityName, String lookupKeys, String dataspace) {}

  global static ConnectApi.CdpQueryOutput getDataGraphDataWithLookupKeys(String dataGraphEntityName, String lookupKeys, String dataspace, Boolean noCache) {}

  global static ConnectApi.CdpDgMetadata getDataGraphMetadata() {}

  global static ConnectApi.CdpDgMetadata getDataGraphMetadata(String dataGraphEntityName) {}

  global static ConnectApi.CdpDgMetadata getDataGraphMetadata(String dataGraphEntityName, String dataspace) {}

  global static ConnectApi.CdpQueryMetadataOutput getInsightsMetadata() {}

  global static ConnectApi.CdpQueryMetadataOutput getInsightsMetadata(String ciName) {}

  global static ConnectApi.CdpQueryMetadataOutput getInsightsMetadata(String ciName, String dataspace) {}

  global static ConnectApi.CdpQueryMetadataEntitiesOutput getMetadataEntities() {}

  global static ConnectApi.CdpQueryMetadataEntitiesOutput getMetadataEntities(String entityCategory, String entityType) {}

  global static ConnectApi.CdpQueryMetadataEntitiesOutput getMetadataEntities(String entityCategory, String entityType, String dataspace) {}

  global static ConnectApi.CdpQueryMetadataOutput getProfileMetadata() {}

  global static ConnectApi.CdpQueryMetadataOutput getProfileMetadata(String dataModelName) {}

  global static ConnectApi.CdpQueryMetadataOutput getProfileMetadata(String dataModelName, String dataspace) {}

  global static ConnectApi.CdpQueryOutput queryANSISql(ConnectApi.CdpQueryInput input) {}

  global static ConnectApi.CdpQueryOutput queryANSISql(ConnectApi.CdpQueryInput input, Integer batchSize, Integer offset, String orderby) {}

  global static ConnectApi.CdpQueryOutput queryANSISql(ConnectApi.CdpQueryInput input, Integer batchSize, Integer offset, String orderby, String dataspace) {}

  global static ConnectApi.CdpQueryOutputV2 queryAnsiSqlV2(ConnectApi.CdpQueryInput input) {}

  global static ConnectApi.CdpQueryOutputV2 queryAnsiSqlV2(ConnectApi.CdpQueryInput input, String dataspace) {}

  global static ConnectApi.CdpQueryOutputV2 nextBatchAnsiSqlV2(String nextBatchId) {}

  global static ConnectApi.CdpQueryOutputV2 nextBatchAnsiSqlV2(String nextBatchId, String dataspace) {}

  global static ConnectApi.QuerySqlOutput querySql(ConnectApi.QuerySqlInput input) {}

  global static ConnectApi.QuerySqlOutput querySql(ConnectApi.QuerySqlInput input, String dataspace) {}

  global static ConnectApi.QuerySqlOutput querySql(ConnectApi.QuerySqlInput input, String workloadName, String dataspace) {}

  global static ConnectApi.QuerySqlPageOutput querySqlRows(String queryId, Long offset, Long rowLimit) {}

  global static ConnectApi.QuerySqlPageOutput querySqlRows(String queryId, Long offset, Long rowLimit, Boolean omitSchema) {}

  global static ConnectApi.QuerySqlPageOutput querySqlRows(String queryId, Long offset, Long rowLimit, String dataspace) {}

  global static ConnectApi.QuerySqlPageOutput querySqlRows(String queryId, Long offset, Long rowLimit, Boolean omitSchema, String dataspace) {}

  global static ConnectApi.QuerySqlPageOutput querySqlRows(String queryId, Long offset, Long rowLimit, String workloadName, String dataspace) {}

  global static ConnectApi.QuerySqlPageOutput querySqlRows(String queryId, Long offset, Long rowLimit, Boolean omitSchema, String workloadName, String dataspace) {}

  global static void cancelQuerySql(String queryId) {}

  global static void cancelQuerySql(String queryId, String dataspace) {}

  global static void cancelQuerySql(String queryId, String workloadName, String dataspace) {}

  global static ConnectApi.QuerySqlStatus querySqlStatus(String queryId) {}

  global static ConnectApi.QuerySqlStatus querySqlStatus(String queryId, Integer waitTimeMs) {}

  global static ConnectApi.QuerySqlStatus querySqlStatus(String queryId, String dataspace) {}

  global static ConnectApi.QuerySqlStatus querySqlStatus(String queryId, String dataspace, Integer waitTimeMs) {}

  global static ConnectApi.QuerySqlStatus querySqlStatus(String queryId, String workloadName, String dataspace) {}

  global static ConnectApi.QuerySqlStatus querySqlStatus(String queryId, String workloadName, String dataspace, Integer waitTimeMs) {}

  global static ConnectApi.CdpQueryOutput queryCalculatedInsights(String ciName, String dimensions, String measures, String orderby, String filters, Integer batchSize, Integer offset) {}

  global static ConnectApi.CdpQueryOutput queryCalculatedInsights(String ciName, String dimensions, String measures, String orderby, String filters, Integer batchSize, Integer offset, String timeGranularity) {}

  global static ConnectApi.CdpQueryOutput queryCalculatedInsights(String ciName, String dimensions, String measures, String orderby, String filters, Integer batchSize, Integer offset, String timeGranularity, String dataspace) {}

  global static ConnectApi.CdpQueryOutput queryProfileApi(String dataModelName, String filters, String fields, Integer batchSize, Integer offset, String orderby) {}

  global static ConnectApi.CdpQueryOutput queryProfileApi(String dataModelName, String id, String searchKey, String filters, String fields, Integer batchSize, Integer offset, String orderby) {}

  global static ConnectApi.CdpQueryOutput queryProfileApi(String dataModelName, String id, String childDataModelName, String searchKey, String filters, String fields, Integer batchSize, Integer offset, String orderby) {}

  global static ConnectApi.CdpQueryOutput queryProfileApi(String dataModelName, String id, String ciName, String searchKey, String dimensions, String measures, String filters, String fields, Integer batchSize, Integer offset, String orderby) {}

  global static ConnectApi.CdpQueryOutput queryProfileApi(String dataModelName, String id, String ciName, String searchKey, String dimensions, String measures, String filters, String fields, Integer batchSize, Integer offset, String orderby, String timeGranularity) {}

  global static ConnectApi.CdpQueryOutput queryProfileApi(String dataModelName, String id, String ciName, String searchKey, String dimensions, String measures, String filters, String fields, Integer batchSize, Integer offset, String orderby, String timeGranularity, String dataspace) {}

  global static ConnectApi.CdpQueryDataOutput universalIdLookupBySourceId(String entityName, String dataSourceId, String dataSourceObjectId, String sourceRecordId) {}

  global static ConnectApi.CdpQueryDataOutput universalIdLookupBySourceId(String entityName, String dataSourceId, String dataSourceObjectId, String sourceRecordId, String dataspace) {}

  global Object clone() {}

}