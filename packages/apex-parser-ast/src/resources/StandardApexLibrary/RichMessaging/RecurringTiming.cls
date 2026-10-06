/**
 * Represents a payment that occurs on a regular basis.
 */
global with sharing class RecurringTiming extends RichMessaging.AbstractTiming {
    /**
     * The end date. Enabled for Lightning components.
     * Date
     */
    @InvocableVariable
    global Date endDateValue;
    /**
     * The number of interval units that make up the total payment interval. Enabled for Lightning components.
     * Integer
     */
    @InvocableVariable
    global Integer intervalCountValue;
    /**
     * The amount of time—in calendar units, such as day, month, or year—that represents a fraction of the total payment interval. Enabled for Lightning components.
     * RichMessaging.TimingIntervalUnit
     */
    @InvocableVariable
    global RichMessaging.TimingIntervalUnit intervalUnitValue;
    /**
     * The start date. Enabled for Lightning components.
     * Date
     */
    @InvocableVariable
    global Date startDateValue;

    /**
     * The end date. Invocable variable.
     * Date
     */
    @AuraEnabled
    global Date endDate { get; set; }
    /**
     * The number of interval units that make up the total payment interval. Invocable variable.
     * Integer
     */
    @AuraEnabled
    global Integer intervalCount { get; set; }
    /**
     * The amount of time—in calendar units, such as day, month, or year—that represents a fraction of the total payment interval. Invocable variable.
     * String
     */
    @AuraEnabled
    global String intervalUnit { get; set; }
    /**
     * The start date. Invocable variable.
     * Date
     */
    @AuraEnabled
    global Date startDate { get; set; }
    /**
     * Always returns “RecurringTiming”.
     * String
     */
    @AuraEnabled
    global String timingType { get; }

    /**
     * Creates a new instance of the RichMessaging.RecurringTiming class.
     */
    global RecurringTiming() { }

    /**
     * Creates a new instance of the RichMessaging.RecurringTiming class.
     */
    global RecurringTiming(Date startDate, Date endDate, Integer intervalCount, RichMessaging.TimingIntervalUnit intervalUnit) { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}