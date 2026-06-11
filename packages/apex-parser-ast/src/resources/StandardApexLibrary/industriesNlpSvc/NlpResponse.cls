/**
 * Stores the result for an NLP Operation. NLP operation can be SurveyLongSummarization and SurveyShortSummarization.
 */
global class NlpResponse {

  global NlpResponse() {}

  global industriesNlpSvc.NlpSummarizationResult summarizationResult;

  global List<String> errors;

  global Object clone() {}

}