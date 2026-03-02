/**
 * Get indexes. Get index logs. Create an index of a product catalog.
 */
public class CommerceSearchSettings {

  public static ConnectApi.CommerceSearchIndex createCommerceSearchIndex(String webstoreId, String indexBuildType) {}

  public static ConnectApi.CommerceSearchIndex getSingleCommerceSearchIndex(String webstoreId, String indexId) {}

  public static ConnectApi.CommerceSearchIndexCollection getCommerceSearchIndexes(String webstoreId) {}

  public static ConnectApi.CommerceSearchIndexLogCollection getCommerceSearchIndexLogs(String webstoreId) {}

}