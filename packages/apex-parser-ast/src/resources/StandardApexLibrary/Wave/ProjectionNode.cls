/**
 * Add aggregate functions to the query, or define an alias.
 */
global class ProjectionNode {

  /**
   * Returns the sum of a numeric field.
   * @return wave.ProjectionNode
   */
  public wave.ProjectionNode sum() {}

  /**
   * Returns the average value of a numeric field.
   * @return wave.ProjectionNode
   */
  public wave.ProjectionNode avg() {}

  /**
   * Returns the minimum value of a field.
   * @return wave.ProjectionNode
   */
  public wave.ProjectionNode min() {}

  /**
   * Returns the maximum value of a field.
   * @return wave.ProjectionNode
   */
  public wave.ProjectionNode max() {}

  /**
   * Returns the number of rows that match the query criteria.
   * @return wave.ProjectionNode
   */
  public wave.ProjectionNode count() {}

  /**
   * Returns the count of unique values.
   * @return wave.ProjectionNode
   */
  public wave.ProjectionNode unique() {}

  /**
   * Define output column names.
   * @param name The name to use for this column. For example, this code defines the alias c : Wave.ProjectionNode[] projs = new Wave.ProjectionNode[]{Wave.QueryBuilder.count().alias('c')};
   * @return wave.ProjectionNode
   */
  public wave.ProjectionNode alias(String name) {}

}