/**
 * Represents timing for a transaction that occurs in the future.
 */
global with sharing class DeferredTiming extends RichMessaging.AbstractTiming {
    /**
     * The deferred date. Enabled for Lightning components.
     * <p>Datetime
     */
    @InvocableVariable
    global Datetime deferredDateValue;

    /**
     * The deferred date. Invocable variable.
     * <p>Datetime
     */
    @AuraEnabled
    global Datetime deferredDate { get; set; }
    /**
     * Always returns “DeferredTiming”.
     * <p>String
     */
    @AuraEnabled
    global String timingType { get; }

    /**
     * Creates a new instance of the RichMessaging.DeferredTiming class.
     */
    global DeferredTiming() { }

    /**
     * Creates a new instance of the RichMessaging.DeferredTiming class.
     */
    global DeferredTiming(Datetime deferredDate) { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}