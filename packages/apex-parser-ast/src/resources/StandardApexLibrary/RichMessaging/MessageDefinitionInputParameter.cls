/**
 * Represents a messaging component parameter value. This class is used to provide parameter payloads that can be translated to structured content payloads in rich content messages.
 */
global with sharing class MessageDefinitionInputParameter {
    @InvocableVariable
    global Boolean booleanParameterValue;
    @InvocableVariable
    global Date dateParameterValue;
    @InvocableVariable
    global Double numberParameterValue;
    @InvocableVariable
    global String parameterName;
    @InvocableVariable
    global String recordIdParameterValue;
    @InvocableVariable
    global String textParameterValue;

    /**
     * A boolean input parameter.
     * Boolean
     */
    @AuraEnabled
    global Boolean booleanValue { get; set; }
    /**
     * A list of boolean parameters.
     * List<Boolean>
     */
    @AuraEnabled
    global List booleanValues { get; set; }
    /**
     * A datetime input parameter.
     * Datetime
     */
    @AuraEnabled
    global Datetime dateTimeValue { get; set; }
    /**
     * A list of datetime input parameters.
     * List<Datetime>
     */
    @AuraEnabled
    global List dateTimeValues { get; set; }
    /**
     * A date input parameter.
     * Date
     */
    @AuraEnabled
    global Date dateValue { get; set; }
    /**
     * A list of date input parameters.
     * List<Date>
     */
    @AuraEnabled
    global List dateValues { get; set; }
    /**
     * A name input parameter.
     * String
     */
    @AuraEnabled
    global String name { get; set; }
    /**
     * A number input parameter.
     * Double
     */
    @AuraEnabled
    global Double numberValue { get; set; }
    /**
     * A list of number input parameters.
     * List<Double>
     */
    @AuraEnabled
    global List numberValues { get; set; }
    /**
     * A record ID input parameter.
     * String
     */
    @AuraEnabled
    global String recordIdValue { get; set; }
    /**
     * A list of record ID input parameters.
     * List<String>
     */
    @AuraEnabled
    global List recordIdValues { get; set; }
    /**
     * A text input parameter.
     * String
     */
    @AuraEnabled
    global String textValue { get; set; }
    /**
     * A list of text input parameters.
     * List<String>
     */
    @AuraEnabled
    global List textValues { get; set; }

    global MessageDefinitionInputParameter() { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}