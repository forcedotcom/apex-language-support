/**
 * Get indexes. Get index logs. Create an index of a product catalog.
 */
global class CommerceSearchSettings {

  global CommerceSearchSettings() {}

  global static ConnectApi.CommerceSearchIndex createCommerceSearchIndex(String webstoreId, String indexBuildType) {}

  global static ConnectApi.CommerceSearchIndex getSingleCommerceSearchIndex(String webstoreId, String indexId) {}

  global static ConnectApi.CommerceSearchIndexCollection getCommerceSearchIndexes(String webstoreId) {}

  global static ConnectApi.CommerceSearchIndexLogCollection getCommerceSearchIndexLogs(String webstoreId) {}

  global Object clone() {}

}