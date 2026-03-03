/**
 * The QueryBuilder class provides methods for constructing well-formed SAQL queries to pass to CRM Analytics.
 */
global class QueryBuilder {

  /**
   * Load a stream from a dataset.
   * @param datasetID The ID of the dataset.
   * @param datasetVersionID The ID identifying the version of the dataset.
   * @return wave.QueryNode
   */
  public static wave.QueryNode load(String datasetID, String datasetVersionID) {}

  /**
   * Calculate the number of rows that match the query criteria.
   * @return wave.ProjectionNode
   */
  public static wave.ProjectionNode count() {}

  /**
   * Query by selecting specific attributes.
   * @param proj The name of the column to query.
   * @return wave.ProjectionNode
   */
  public static wave.ProjectionNode get(String proj) {}

  /**
   * Combine multiple result sets into one result set.
   * @param unionNodes List of nodes to combine.
   * @return Wave.QueryNode
   */
  global static Wave.QueryNode union(List<Wave.QueryNode> unionNodes) {}

  /**
   * Cogrouping means that two input streams are grouped independently and arranged side by side. Only data that exists in both groups appears in the results.
   * @param cogroupNodes List of nodes to group.
   * @param groups The type of grouping.
   * @return Wave.QueryNode
   */
  global static Wave.QueryNode cogroup(List<Wave.QueryNode> cogroupNodes, List<List< String >> groups) {}

}