/**
 * Represents timing for a transaction that occurs in the future.
 */
global class DeferredTiming {

  global DeferredTiming(Datetime deferredDate) {}

  global Datetime deferredDate;

  global Datetime deferredDateValue;

  global String timingType;

  global Object clone() {}

}