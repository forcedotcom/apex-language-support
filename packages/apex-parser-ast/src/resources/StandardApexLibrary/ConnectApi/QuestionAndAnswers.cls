/**
 * Access question and answers suggestions.
 */
public class QuestionAndAnswers {

  public static ConnectApi.QuestionAndAnswersSuggestions getSuggestions(String communityId, String q, String subjectId, Boolean includeArticles, Integer maxResults) {}

  public static Void setTestGetSuggestions(String communityId, String q, String subjectId, Boolean includeArticles, Integer maxResults, ConnectApi.QuestionAndAnswersSuggestions result) {}

  public static ConnectApi.QuestionAndAnswersCapability updateQuestionAndAnswers(String communityId, String feedElementId, ConnectApi.QuestionAndAnswersCapabilityInput questionAndAnswersCapability) {}

}