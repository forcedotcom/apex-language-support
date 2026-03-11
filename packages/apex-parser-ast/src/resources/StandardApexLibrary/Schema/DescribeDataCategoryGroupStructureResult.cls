/**
 * Contains the category groups and categories associated with KnowledgeArticleVersion and Question.
 */
global class DescribeDataCategoryGroupStructureResult {

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
   * Returns the name of object associated with the data category group.
   * @return String
   */
  public String getSobject() {}

  /**
   * Returns a Schema.DataCategory object, that contains the top categories visible depending on the user's data category group visibility settings.
   * @return List<Schema.DataCategory>
   */
  public List<Schema.DataCategory> getTopCategories() {}

}