/**
 * Add aggregate functions to the query, or define an alias.
 */
global class ProjectionNode {

  global ProjectionNode() {}

  /**
   * Returns the sum of a numeric field.
   * @return wave.ProjectionNode
   */
  global wave.ProjectionNode sum() {}

  /**
   * Returns the average value of a numeric field.
   * @return wave.ProjectionNode
   */
  global wave.ProjectionNode avg() {}

  /**
   * Returns the minimum value of a field.
   * @return wave.ProjectionNode
   */
  global wave.ProjectionNode min() {}

  /**
   * Returns the maximum value of a field.
   * @return wave.ProjectionNode
   */
  global wave.ProjectionNode max() {}

  /**
   * Returns the number of rows that match the query criteria.
   * @return wave.ProjectionNode
   */
  global wave.ProjectionNode count() {}

  /**
   * Returns the count of unique values.
   * @return wave.ProjectionNode
   */
  global wave.ProjectionNode unique() {}

  /**
   * Define output column names.
   * @param name The name to use for this column. For example, this code defines the alias c : Wave.ProjectionNode[] projs = new Wave.ProjectionNode[]{Wave.QueryBuilder.count().alias('c')};
   * @return wave.ProjectionNode
   */
  global wave.ProjectionNode alias(String name) {}

  global String build() {}

  global Object clone() {}

}