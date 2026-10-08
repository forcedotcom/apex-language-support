/**
 * Use the methods in the KbManagement.PublishingService class to manage the lifecycle of an article and its translations.
 * Usage
 * Use the methods in the KbManagement.PublishingService class to manage the following parts of the lifecycle of an article and its translations:
 * Publishing
 * Updating
 * Retrieving
 * Deleting
 * Submitting for translation
 * Setting a translation to complete or incomplete status
 * Archiving
 * Assigning review tasks for draft articles or translations
 * Note
 * Date values are based on GMT.
 * To use the methods in this class, you must enable Salesforce Knowledge.
 */
global class PublishingService {
    global PublishingService() { }

    /**
     * Archives an online version of an article. If the specified scheduledDate is null, the article is archived immediately. Otherwise, it archives the article on the scheduled date.
     * Example
     * String articleId = 'Insert article ID';
     * Datetime scheduledDate = Datetime.newInstanceGmt(2012, 12,1,13,30,0);
     * KbManagement.PublishingService.archiveOnlineArticle(articleId, scheduledDate);
     */
    global static void archiveOnlineArticle(String articleId, Datetime scheduledDate) { }

    /**
     * Assigns a review task related to a draft article.
     * Example
     * String articleId = 'Insert article ID';
     * String assigneeId = '';
     * String instructions = 'Please review this draft.';
     * Datetime dueDate = Datetime.newInstanceGmt(2012, 12, 1);
     * KbManagement.PublishingService.assignDraftArticleTask(articleId, assigneeId, instructions, dueDate, true);
     */
    global static void assignDraftArticleTask(String articleId, String assigneeId, String instructions, Datetime dueDate, Boolean sendEmailNotification) { }

    /**
     * Assigns a review task related to a draft translation.
     * Example
     * String articleId = 'Insert article ID';
     * String assigneeId = 'Insert assignee ID';
     * String instructions = 'Please review this draft.';
     * Datetime dueDate = Datetime.newInstanceGmt(2012, 12, 1);
     * KbManagement.PublishingService.assignDraftTranslationTask(articleId, assigneeId, instructions, dueDate, true);
     */
    global static void assignDraftTranslationTask(String translationVersionId, String assigneeId, String instructions, Datetime dueDate, Boolean sendEmailNotification) { }

    /**
     * Cancels the scheduled archiving of an online article.
     * Example
     * String articleId = 'Insert article ID';
     * KbManagement.PublishingService.cancelScheduledArchivingOfArticle (articleId);
     */
    global static void cancelScheduledArchivingOfArticle(String articleId) { }

    /**
     * Cancels the scheduled publication of a draft article.
     * Example
     * String articleId = 'Insert article ID';
     * KbManagement.PublishingService.cancelScheduledPublicationOfArticle (articleId);
     */
    global static void cancelScheduledPublicationOfArticle(String articleId) { }

    /**
     * Puts a translation in a completed state that is ready to publish.
     * Example
     * String articleVersionId = 'Insert article ID';
     * KbManagement.PublishingService.completeTranslation(articleVersionId);
     */
    global static void completeTranslation(String articleVersionId) { }

    /**
     * Deletes an archived article.
     * Example
     * String articleId = 'Insert article ID';
     * KbManagement.PublishingService.deleteArchivedArticle(articleId);
     */
    global static void deleteArchivedArticle(String articleId) { }

    /**
     * Deletes a specific archived version of a published article.
     * Example
     * String articleId = 'Insert article ID';
     * Integer versionNumber = 1;
     * KbManagement.PublishingService.deleteArchivedArticleVersion(articleId, versionNumber);
     */
    global static void deleteArchivedArticleVersion(String articleId, Integer versionNumber) { }

    /**
     * Deletes a draft article.
     * Example
     * String articleId = 'Insert article ID';
     * KbManagement.PublishingService.deleteDraftArticle(articleId);
     */
    global static void deleteDraftArticle(String articleId) { }

    /**
     * Deletes a draft translation.
     * Example
     * String articleVersionId = 'Insert article ID';
     * KbManagement.PublishingService.deleteDraftTranslation (articleVersionId);
     */
    global static void deleteDraftTranslation(String articleVersionId) { }

    /**
     * Creates a draft article from the archived primary version and returns the new draft primary version ID of the article.
     * Example
     * String articleId = 'Insert article ID';
     * String id = KbManagement.PublishingService.editArchivedArticle(articleId);
     */
    global static String editArchivedArticle(String articleId) { return null; }

    /**
     * Creates a draft article from the online version and returns the new draft primary version ID of the article. Also, unpublishes the online article, if unpublish is set to true.
     * Example
     * String articleId = 'Insert article ID';
     * String id = KbManagement.PublishingService.editOnlineArticle (articleId, true);
     */
    global static String editOnlineArticle(String articleId, Boolean unpublish) { return null; }

    /**
     * Creates a draft version of the online translation for a specific language and returns the new draft primary version ID of the article. Also, unpublishes the article, if set to true.
     * Example
     * String articleId = 'Insert article ID';
     * String language = 'fr';
     * String id = KbManagement.PublishingService.editPublishedTranslation(articleId, language, true);
     */
    global static String editPublishedTranslation(String articleId, String language, Boolean unpublish) { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    /**
     * Publishes an article. If flagAsNew is set to true, the article is published as a major version.
     * Example
     * String articleId = 'Insert article ID';
     * KbManagement.PublishingService.publishArticle(articleId, true);
     */
    global static void publishArticle(String articleId, Boolean flagAsNew) { }

    /**
     * Creates a draft article from an existing online article based on the specified archived version of the article and returns the article version ID.
     * Example
     * String articleId = 'Insert article ID';
     * String id = KbManagement.PublishingService.restoreOldVersion (articleId, 1);
     */
    global static String restoreOldVersion(String articleId, Integer versionNumber) { return null; }

    /**
     * Schedules the article for publication as a major version. If the specified date is null, the article is published immediately.
     * Example
     * String articleId = 'Insert article ID';
     * Datetime scheduledDate = Datetime.newInstanceGmt(2012, 12,1,13,30,0);
     * KbManagement.PublishingService.scheduleForPublication(articleId, scheduledDate);
     */
    global static void scheduleForPublication(String articleId, Datetime scheduledDate) { }

    /**
     * Sets a draft translation that is ready for publication back to “in progress” status.
     * Example
     * String articleVersionId = 'Insert article ID';
     * KbManagement.PublishingService.setTranslationToIncomplete(articleVersionId);
     */
    global static void setTranslationToIncomplete(String articleVersionId) { }

    global static void submitForAITranslation(String articleId, String language) { }

    /**
     * Submits an article for translation to the specified language. Also assigns the specified user and due date to the submittal and returns new ID of the draft translation.
     * Example
     * String articleId = 'Insert article ID';
     * String language = 'fr';
     * String assigneeId = 'Insert assignee ID';
     * Datetime dueDate = Datetime.newInstanceGmt(2012, 12,1);
     * String id = KbManagement.PublishingService.submitForTranslation(articleId, language, assigneeId, dueDate);
     */
    global static String submitForTranslation(String articleId, String language, String assigneeId, Datetime dueDate) { return null; }

    global override virtual String toString() { return null; }
}