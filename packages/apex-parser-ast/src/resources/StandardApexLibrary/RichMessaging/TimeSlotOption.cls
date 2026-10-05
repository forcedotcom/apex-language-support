/**
 * Represents a complex time slot option type. This class is used to provide time option payloads that can be translated to structured content payloads in rich content messages.
 */
global with sharing class TimeSlotOption {
    /**
     * The duration in seconds.
     * <p>Integer
     */
    @InvocableVariable
    global Integer duration;
    /**
     * The start time.
     * <p>Datetime
     */
    @InvocableVariable
    global Datetime startTime;

    /**
     * The duration in seconds. Enabled for Lightning components.
     * <p>Integer
     */
    @AuraEnabled
    global Integer durationValue { get; set; }
    /**
     * The end time. Enabled for Lightning components.
     * <p>Datetime
     */
    @AuraEnabled
    global Datetime endTimeValue { get; }
    /**
     * The start time. Enabled for Lightning components.
     * <p>Datetime
     */
    @AuraEnabled
    global Datetime startTimeValue { get; set; }

    /**
     * Creates a TimeSlotOption object.
     */
    global TimeSlotOption() { }

    /**
     * Creates a TimeSlotOption object with a start time and a duration.
     */
    global TimeSlotOption(Datetime startTime, Integer duration) { }

    /**
     * Creates a TimeSlotOption object with a start and end time.
     */
    global TimeSlotOption(Datetime startTime, Datetime endTime) { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}