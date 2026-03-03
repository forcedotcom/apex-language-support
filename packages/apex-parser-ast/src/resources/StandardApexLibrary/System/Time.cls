/**
 * Contains methods for the Time primitive data type.
 */
global class Time {

  /**
   * Adds the specified number of hours to a Time.
   * @param additionalHours 
   * @return Time
   */
  public Time addHours(Integer additionalHours) {}

  /**
   * Adds the specified number of milliseconds to a Time.
   * @param additionalMilliseconds 
   * @return Time
   */
  public Time addMilliseconds(Integer additionalMilliseconds) {}

  /**
   * Adds the specified number of minutes to a Time.
   * @param additionalMinutes 
   * @return Time
   */
  public Time addMinutes(Integer additionalMinutes) {}

  /**
   * Adds the specified number of seconds to a Time.
   * @param additionalSeconds 
   * @return Time
   */
  public Time addSeconds(Integer additionalSeconds) {}

  /**
   * Returns the hour component of a Time.
   * @return Integer
   */
  public Integer hour() {}

  /**
   * Returns the millisecond component of a Time.
   * @return Integer
   */
  public Integer millisecond() {}

  /**
   * Returns the minute component of a Time.
   * @return Integer
   */
  public Integer minute() {}

  /**
   * Constructs a Time from Integer representations of the specified hour, minutes, seconds, and milliseconds. (UTC is assumed.)
   * @param hour 
   * @param minutes 
   * @param seconds 
   * @param milliseconds 
   * @return Time
   */
  public static Time newInstance(Integer hour, Integer minutes, Integer seconds, Integer milliseconds) {}

  /**
   * Returns the second component of a Time.
   * @return Integer
   */
  public Integer second() {}

}