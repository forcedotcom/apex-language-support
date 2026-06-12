/**
 * KnowledgeArticleVersionStandardController objects offer article-specific functionality in addition to what is provided by the StandardController .
 */
global class KnowledgeArticleVersionStandardController {

  global KnowledgeArticleVersionStandardController(SObject article) {}

  /**
   * Returns the ID for the source object record when creating a new article from another object.
   * @return String
   */
  global String getSourceId() {}

  /**
   * Specifies a default data category for the specified data category group when creating a new article.
   * @param categoryGroup 
   * @param category 
   */
  global void setDataCategory(String categoryGroup, String category) {}

  global void addFields(List<String> fieldNames) {}

  global System.PageReference cancel() {}

  global String getId() {}

  global SObject getRecord() {}

  global void selectDataCategory(String categoryGroup, String category) {}

  global System.PageReference view() {}

  global Object clone() {}

}