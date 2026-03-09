/**
 * Stores the result for an NLP Operation. NLP operation can be SurveyLongSummarization and SurveyShortSummarization.
 */
global class NlpResponse {

  public industriesNlpSvc.NlpSummarizationResult summarizationResult;

  public List<String> errors;

}