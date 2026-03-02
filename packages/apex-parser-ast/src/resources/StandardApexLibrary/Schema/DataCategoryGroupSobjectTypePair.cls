/**
 * Specifies a category group and an associated object.
 */
public class DataCategoryGroupSobjectTypePair {

  /**
   * Returns the unique name used by the API to access the data category group.
   * @return String
   */
  public String getDataCategoryGroupName() {}

  /**
   * Returns the object name associated with the data category group.
   * @return String
   */
  public String getSobject() {}

  /**
   * Specifies the unique name used by the API to access the data category group.
   * @param name 
   * @return String
   */
  public String setDataCategoryGroupName(String name) {}

  /**
   * Sets the sObject associated with the data category group.
   * @param sObjectName The sObjectName is the object name associated with the data category group. Valid values are: KnowledgeArticleVersion —for article types. Question —for questions from Answers.
   * @return Void
   */
  public Void setSobject(String sObjectName) {}

}