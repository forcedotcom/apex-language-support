/**
 * Define each node of the query - such as projection, groups, order, filters. Execute the query.
 */
global class QueryNode {

  /**
   * Build the query string represented by this QueryNode and assign it to a stream name.
   * @param streamName The identifier for the stream - for example, “q”.
   * @return String
   */
  public String build(String streamName) {}

  /**
   * Applies a set of expressions to every row in a dataset. This action is often referred to as projection.
   * @param projections A list of ProjectionNodes to be added to this QueryNode.
   * @return wave.QueryNode
   */
  public wave.QueryNode foreach(List<wave.ProjectionNode> projections) {}

  /**
   * Groups matched records (group by specific dataset attributes).
   * @param groups A list of expressions.
   * @return wave.QueryNode
   */
  public wave.QueryNode group(List< String > groups) {}

  /**
   * Groups matched records (group by specific dataset attributes).
   * @return wave.QueryNode
   */
  public wave.QueryNode group() {}

  /**
   * Groups matched records (group by specific dataset attributes).
   * @param groups A list of expressions.
   * @return wave.QueryNode
   */
  public wave.QueryNode group(List< String > groups) {}

  /**
   * Limits the number of results that are returned.
   * @param cap The maximum number of rows to return.
   * @return Wave.QueryNode
   */
  global Wave.QueryNode cap(Integer cap) {}

  /**
   * Selects rows from a dataset based on a filter condition (a predicate).
   * @param filterCondition For example: filter('Name != \'My Name\'')
   * @return wave.QueryNode
   */
  public wave.QueryNode filter(String filterCondition) {}

  /**
   * Selects rows from a dataset based on a filter condition (a predicate).
   * @param filterCondition For example: filter('Name != \'My Name\'')
   * @return wave.QueryNode
   */
  public wave.QueryNode filter(List< String > filterCondition) {}

  /**
   * Execute the query and return rows as JSON.
   * @param streamName The query stream to execute. For example: ConnectApi.LiteralJson result = Wave.QueryBuilder.load('datasetId', 'datasetVersionId').group().foreach(projs).execute('q');
   * @return ConnectApi.LiteralJson
   */
  global ConnectApi.LiteralJson execute(String streamName) {}

}