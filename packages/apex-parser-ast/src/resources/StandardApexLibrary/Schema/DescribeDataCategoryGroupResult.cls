/**
 * Contains the list of the category groups associated with KnowledgeArticleVersion and Question.
 */
global class DescribeDataCategoryGroupResult {

  global DescribeDataCategoryGroupResult() {}

  /**
   * Returns the number of visible data categories in the data category group.
   * @return Integer
   */
  global Integer getCategoryCount() {}

  /**
   * Returns the description of the data category group.
   * @return String
   */
  global String getDescription() {}

  /**
   * Returns the label for the data category group used in the Salesforce user interface.
   * @return String
   */
  global String getLabel() {}

  /**
   * Returns the unique name used by the API to access to the data category group.
   * @return String
   */
  global String getName() {}

  /**
   * Returns the object name associated with the data category group.
   * @return String
   */
  global String getSobject() {}

  global Object clone() {}

}