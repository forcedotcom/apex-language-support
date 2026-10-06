/**
 * Stores the result for an NLP Operation. NLP operation can be SurveyLongSummarization and SurveyShortSummarization.
 */
global with sharing class NlpResponse {
    /**
     * Represents the property to store errors that occurred as a result of the NLP Operation.
     * List<String>
     */
    @AuraEnabled
    global List errors { get; set; }
    /**
     * Represents the property that stores the NLP Summarization result performed for an NLP Operation. NLP operation can be SurveyLongSummarization and SurveyShortSummarization.
     * List<industriesNlpSvc.NlpSummarizationResult>
     */
    @AuraEnabled
    global industriesNlpSvc.NlpSummarizationResult summarizationResult { get; set; }

    global NlpResponse() { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}