/**
 * Contains the list of the category groups associated with KnowledgeArticleVersion and Question.
 */
global class DescribeDataCategoryGroupResult {

  /**
   * Returns the number of visible data categories in the data category group.
   * @return Integer
   */
  public Integer getCategoryCount() {}

  /**
   * Returns the description of the data category group.
   * @return String
   */
  public String getDescription() {}

  /**
   * Returns the label for the data category group used in the Salesforce user interface.
   * @return String
   */
  public String getLabel() {}

  /**
   * Returns the unique name used by the API to access to the data category group.
   * @return String
   */
  public String getName() {}

  /**
   * Returns the object name associated with the data category group.
   * @return String
   */
  public String getSobject() {}

}