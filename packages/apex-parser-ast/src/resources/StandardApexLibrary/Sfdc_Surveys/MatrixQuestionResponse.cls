global with sharing class MatrixQuestionResponse {
    @AuraEnabled
    global Integer numberOfQuestionsConfigured { get; set; }
    @AuraEnabled
    global sfdc_surveys.ChildQuestionResponse question0 { get; set; }
    @AuraEnabled
    global sfdc_surveys.ChildQuestionResponse question1 { get; set; }
    @AuraEnabled
    global sfdc_surveys.ChildQuestionResponse question2 { get; set; }
    @AuraEnabled
    global sfdc_surveys.ChildQuestionResponse question3 { get; set; }
    @AuraEnabled
    global sfdc_surveys.ChildQuestionResponse question4 { get; set; }
    @AuraEnabled
    global sfdc_surveys.ChildQuestionResponse question5 { get; set; }
    @AuraEnabled
    global sfdc_surveys.ChildQuestionResponse question6 { get; set; }
    @AuraEnabled
    global sfdc_surveys.ChildQuestionResponse question7 { get; set; }
    @AuraEnabled
    global sfdc_surveys.ChildQuestionResponse question8 { get; set; }
    @AuraEnabled
    global sfdc_surveys.ChildQuestionResponse question9 { get; set; }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override String toString() { return null; }
}