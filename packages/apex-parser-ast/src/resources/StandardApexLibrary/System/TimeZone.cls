/**
 * Represents a time zone. Contains methods for creating a new time zone and obtaining time zone properties, such as the time zone ID, offset, and display name.
 */
global class TimeZone {

  global TimeZone() {}

  /**
   * Returns this time zone’s display name.
   * @return String
   */
  global String getDisplayName() {}

  /**
   * Returns this time zone’s ID.
   * @return String
   */
  global String getID() {}

  /**
   * Returns the time zone offset, in milliseconds, of the specified date to the GMT time zone.
   * @param date The date argument is the date and time to evaluate.
   * @return Integer
   */
  global Integer getOffset(Datetime date) {}

  /**
   * Returns the time zone corresponding to the specified time zone ID.
   * @param timeZoneIdString The time zone values you can use for the Id argument are any valid time zone values that the Java TimeZone class supports.
   * @return TimeZone
   */
  global static TimeZone getTimeZone(String timeZoneIdString) {}

  /**
   * Returns the string representation of this time zone.
   * @return String
   */
  global String toString() {}

  global Object clone() {}

}