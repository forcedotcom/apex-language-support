/**
 * Use the methods in the KbManagement.PublishingService class to manage the lifecycle of an article and its translations.
 */
global class PublishingService {

  /**
   * Archives an online version of an article. If the specified scheduledDate is null, the article is archived immediately. Otherwise, it archives the article on the scheduled date.
   * @param articleId 
   * @param scheduledDate 
   */
  public static void archiveOnlineArticle(String articleId, Datetime scheduledDate) {}

  /**
   * Assigns a review task related to a draft article.
   * @param articleId 
   * @param assigneeId 
   * @param instructions 
   * @param dueDate 
   * @param sendEmailNotification 
   */
  public static void assignDraftArticleTask(String articleId, String assigneeId, String instructions, Datetime dueDate, Boolean sendEmailNotification) {}

  /**
   * Assigns a review task related to a draft translation.
   * @param articleVersionId 
   * @param assigneeId 
   * @param instructions 
   * @param dueDate 
   * @param sendEmailNotification 
   */
  public static void assignDraftTranslationTask(String articleVersionId, String assigneeId, String instructions, Datetime dueDate, Boolean sendEmailNotification) {}

  /**
   * Cancels the scheduled archiving of an online article.
   * @param articleId 
   */
  public static void cancelScheduledArchivingOfArticle(String articleId) {}

  /**
   * Cancels the scheduled publication of a draft article.
   * @param articleId 
   */
  public static void cancelScheduledPublicationOfArticle(String articleId) {}

  /**
   * Puts a translation in a completed state that is ready to publish.
   * @param articleVersionId 
   */
  public static void completeTranslation(String articleVersionId) {}

  /**
   * Deletes an archived article.
   * @param articleId 
   */
  public static void deleteArchivedArticle(String articleId) {}

  /**
   * Deletes a specific archived version of a published article.
   * @param articleId 
   * @param versionNumber 
   */
  public static void deleteArchivedArticleVersion(String articleId, Integer versionNumber) {}

  /**
   * Deletes a draft article.
   * @param articleId 
   */
  public static void deleteDraftArticle(String articleId) {}

  /**
   * Deletes a draft translation.
   * @param articleVersionId 
   */
  public static void deleteDraftTranslation(String articleVersionId) {}

  /**
   * Creates a draft article from the archived primary version and returns the new draft primary version ID of the article.
   * @param articleId 
   * @return String
   */
  public static String editArchivedArticle(String articleId) {}

  /**
   * Creates a draft article from the online version and returns the new draft primary version ID of the article. Also, unpublishes the online article, if unpublish is set to true .
   * @param articleId 
   * @param unpublish 
   * @return String
   */
  public static String editOnlineArticle(String articleId, Boolean unpublish) {}

  /**
   * Creates a draft version of the online translation for a specific language and returns the new draft primary version ID of the article. Also, unpublishes the article, if set to true .
   * @param articleId 
   * @param language 
   * @param unpublish 
   * @return String
   */
  public static String editPublishedTranslation(String articleId, String language, Boolean unpublish) {}

  /**
   * Publishes an article. If flagAsNew is set to true , the article is published as a major version.
   * @param articleId 
   * @param flagAsNew 
   */
  public static void publishArticle(String articleId, Boolean flagAsNew) {}

  /**
   * Creates a draft article from an existing online article based on the specified archived version of the article and returns the article version ID.
   * @param articleId 
   * @param versionNumber 
   * @return String
   */
  public static String restoreOldVersion(String articleId, Integer versionNumber) {}

  /**
   * Schedules the article for publication as a major version. If the specified date is null, the article is published immediately.
   * @param articleId 
   * @param scheduledDate 
   */
  public static void scheduleForPublication(String articleId, Datetime scheduledDate) {}

  /**
   * Sets a draft translation that is ready for publication back to “in progress” status.
   * @param articleVersionId 
   */
  public static void setTranslationToIncomplete(String articleVersionId) {}

  /**
   * Submits an article for translation to the specified language. Also assigns the specified user and due date to the submittal and returns new ID of the draft translation.
   * @param articleId 
   * @param language 
   * @param assigneeId 
   * @param dueDate 
   * @return String
   */
  public static String submitForTranslation(String articleId, String language, String assigneeId, Datetime dueDate) {}

}