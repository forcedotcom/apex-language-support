/**
 * KnowledgeArticleVersionStandardController objects offer article-specific functionality in addition to what is provided by the StandardController .
 */
public class KnowledgeArticleVersionStandardController {

  /**
   * Returns the ID for the source object record when creating a new article from another object.
   * @return String
   */
  public String getSourceId() {}

  /**
   * Specifies a default data category for the specified data category group when creating a new article.
   * @param categoryGroup 
   * @param category 
   * @return Void
   */
  public Void setDataCategory(String categoryGroup, String category) {}

}