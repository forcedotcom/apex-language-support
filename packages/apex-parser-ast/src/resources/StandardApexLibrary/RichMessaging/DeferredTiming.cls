/**
 * Represents timing for a transaction that occurs in the future.
 */
global class DeferredTiming {

  public DeferredTiming(Datetime deferredDate) {}

  public Datetime deferredDate;

  public Datetime deferredDateValue;

  public String timingType;

  global Object clone() {}

}