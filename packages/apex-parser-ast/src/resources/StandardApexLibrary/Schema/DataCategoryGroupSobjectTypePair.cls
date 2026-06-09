/**
 * Specifies a category group and an associated object.
 */
global class DataCategoryGroupSobjectTypePair {

  global DataCategoryGroupSobjectTypePair() {}

  /**
   * Returns the unique name used by the API to access the data category group.
   * @return String
   */
  global String getDataCategoryGroupName() {}

  /**
   * Returns the object name associated with the data category group.
   * @return String
   */
  global String getSobject() {}

  /**
   * Specifies the unique name used by the API to access the data category group.
   * @param name 
   * @return String
   */
  global String setDataCategoryGroupName(String name) {}

  /**
   * Sets the sObject associated with the data category group.
   * @param sObjectName The sObjectName is the object name associated with the data category group. Valid values are: KnowledgeArticleVersion —for article types. Question —for questions from Answers.
   */
  global void setSobject(String sObjectName) {}

  global Object clone() {}

}