/**
 * Contains methods for the Time primitive data type.
 */
global class Time {

  global Time() {}

  /**
   * Adds the specified number of hours to a Time.
   * @param additionalHours 
   * @return Time
   */
  global Time addHours(Integer additionalHours) {}

  /**
   * Adds the specified number of milliseconds to a Time.
   * @param additionalMilliseconds 
   * @return Time
   */
  global Time addMilliseconds(Integer additionalMilliseconds) {}

  /**
   * Adds the specified number of minutes to a Time.
   * @param additionalMinutes 
   * @return Time
   */
  global Time addMinutes(Integer additionalMinutes) {}

  /**
   * Adds the specified number of seconds to a Time.
   * @param additionalSeconds 
   * @return Time
   */
  global Time addSeconds(Integer additionalSeconds) {}

  /**
   * Returns the hour component of a Time.
   * @return Integer
   */
  global Integer hour() {}

  /**
   * Returns the millisecond component of a Time.
   * @return Integer
   */
  global Integer millisecond() {}

  /**
   * Returns the minute component of a Time.
   * @return Integer
   */
  global Integer minute() {}

  /**
   * Constructs a Time from Integer representations of the specified hour, minutes, seconds, and milliseconds. (UTC is assumed.)
   * @param hour 
   * @param minutes 
   * @param seconds 
   * @param milliseconds 
   * @return Time
   */
  global static Time newInstance(Integer hour, Integer minutes, Integer seconds, Integer milliseconds) {}

  /**
   * Returns the second component of a Time.
   * @return Integer
   */
  global Integer second() {}

  global Object clone() {}

}