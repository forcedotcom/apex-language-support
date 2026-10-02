/**
 * Provides the summary obtained as result of NLP Operation.
 */
global with sharing class NlpSummarizationResult {
    /**
     * Represents the field that captures the summary obtained as result of NLP Operation.
     * <p>List<String>
     */
    @AuraEnabled
    global String summary { get; set; }

    global Object NlpSummarizationResult() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}