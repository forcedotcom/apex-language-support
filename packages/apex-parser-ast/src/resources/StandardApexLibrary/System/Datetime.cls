/**
 * Contains methods for the Datetime primitive data type.
 */
public class Datetime {

  /**
   * Adds the specified number of days to a Datetime.
   * @param additionalDays 
   * @return Datetime
   */
  public Datetime addDays(Integer additionalDays) {}

  /**
   * Adds the specified number of hours to a Datetime.
   * @param additionalHours 
   * @return Datetime
   */
  public Datetime addHours(Integer additionalHours) {}

  /**
   * Adds the specified number of minutes to a Datetime.
   * @param additionalMinutes 
   * @return Datetime
   */
  public Datetime addMinutes(Integer additionalMinutes) {}

  /**
   * Adds the specified number of months to a Datetime.
   * @param additionalMonths 
   * @return Datetime
   */
  public Datetime addMonths(Integer additionalMonths) {}

  /**
   * Adds the specified number of seconds to a Datetime.
   * @param additionalSeconds 
   * @return Datetime
   */
  public Datetime addSeconds(Integer additionalSeconds) {}

  /**
   * Adds the specified number of years to a Datetime.
   * @param additionalYears 
   * @return Datetime
   */
  public Datetime addYears(Integer additionalYears) {}

  /**
   * Returns the Date component of a Datetime in the local time zone of the context user.
   * @return Date
   */
  public Date date() {}

  /**
   * Return the Date component of a Datetime in the GMT time zone.
   * @return Date
   */
  public Date dateGMT() {}

  /**
   * Returns the day-of-month component of a Datetime in the local time zone of the context user.
   * @return Integer
   */
  public Integer day() {}

  /**
   * Returns the day-of-month component of a Datetime in the GMT time zone.
   * @return Integer
   */
  public Integer dayGmt() {}

  /**
   * Returns the day-of-year component of a Datetime in the local time zone of the context user.
   * @return Integer
   */
  public Integer dayOfYear() {}

  /**
   * Returns the day-of-year component of a Datetime in the GMT time zone.
   * @return Integer
   */
  public Integer dayOfYearGmt() {}

  /**
   * Converts the date to the local time zone and returns the converted date as a formatted string using the locale of the context user. If the time zone cannot be determined, GMT is used.
   * @return String
   */
  public String format() {}

  /**
   * Converts the date to the local time zone and returns the converted date as a formatted string using the locale of the context user. If the time zone cannot be determined, GMT is used.
   * @param dateFormatString 
   * @return String
   */
  public String format(String dateFormatString) {}

  /**
   * Converts the date to the local time zone and returns the converted date as a formatted string using the locale of the context user. If the time zone cannot be determined, GMT is used.
   * @param dateFormatString 
   * @param timezone 
   * @return String
   */
  public String format(String dateFormatString, String timezone) {}

  /**
   * Returns a Datetime as a string using the supplied Java simple date format and the GMT time zone.
   * @param dateFormatString 
   * @return String
   */
  public String formatGmt(String dateFormatString) {}

  /**
   * Converts the date to the local time zone and returns the converted date in long date format.
   * @return String
   */
  public String formatLong() {}

  /**
   * Returns the number of milliseconds since January 1, 1970, 00:00:00 GMT represented by this DateTime object.
   * @return Long
   */
  public Long getTime() {}

  /**
   * Returns the hour component of a Datetime in the local time zone of the context user.
   * @return Integer
   */
  public Integer hour() {}

  /**
   * Returns the hour component of a Datetime in the GMT time zone.
   * @return Integer
   */
  public Integer hourGmt() {}

  /**
   * Returns true if the Datetime that called the method is the same as the specified Datetime in the local time zone of the context user.
   * @param dateToCompare 
   * @return Boolean
   */
  public Boolean isSameDay(Datetime dateToCompare) {}

  /**
   * Return the millisecond component of a Datetime in the local time zone of the context user.
   * @return Integer
   */
  public Integer millisecond() {}

  /**
   * Return the millisecond component of a Datetime in the GMT time zone.
   * @return Integer
   */
  public Integer millisecondGmt() {}

  /**
   * Returns the minute component of a Datetime in the local time zone of the context user.
   * @return Integer
   */
  public Integer minute() {}

  /**
   * Returns the minute component of a Datetime in the GMT time zone.
   * @return Integer
   */
  public Integer minuteGmt() {}

  /**
   * Returns the month component of a Datetime in the local time zone of the context user (1=Jan).
   * @return Integer
   */
  public Integer month() {}

  /**
   * Returns the month component of a Datetime in the GMT time zone (1=Jan).
   * @return Integer
   */
  public Integer monthGmt() {}

  /**
   * Constructs a Datetime and initializes it to represent the specified number of milliseconds since January 1, 1970, 00:00:00 GMT.
   * @param milliseconds 
   * @return Datetime
   */
  public static Datetime newInstance(Long milliseconds) {}

  /**
   * Constructs a Datetime and initializes it to represent the specified number of milliseconds since January 1, 1970, 00:00:00 GMT.
   * @param date 
   * @param time 
   * @return Datetime
   */
  public static Datetime newInstance(Date date, Time time) {}

  /**
   * Constructs a Datetime and initializes it to represent the specified number of milliseconds since January 1, 1970, 00:00:00 GMT.
   * @param year 
   * @param month 
   * @param day 
   * @return Datetime
   */
  public static Datetime newInstance(Integer year, Integer month, Integer day) {}

  /**
   * Constructs a Datetime and initializes it to represent the specified number of milliseconds since January 1, 1970, 00:00:00 GMT.
   * @param year 
   * @param month 
   * @param day 
   * @param hour 
   * @param minute 
   * @param second 
   * @return Datetime
   */
  public static Datetime newInstance(Integer year, Integer month, Integer day, Integer hour, Integer minute, Integer second) {}

  /**
   * Constructs a DateTime from the specified date and time in the GMT time zone.
   * @param date 
   * @param time 
   * @return Datetime
   */
  public static Datetime newInstanceGmt(Date date, Time time) {}

  /**
   * Constructs a DateTime from the specified date and time in the GMT time zone.
   * @param year 
   * @param month 
   * @param date 
   * @return Datetime
   */
  public static Datetime newInstanceGmt(Integer year, Integer month, Integer date) {}

  /**
   * Constructs a DateTime from the specified date and time in the GMT time zone.
   * @param year 
   * @param month 
   * @param date 
   * @param hour 
   * @param minute 
   * @param second 
   * @return Datetime
   */
  public static Datetime newInstanceGmt(Integer year, Integer month, Integer date, Integer hour, Integer minute, Integer second) {}

  /**
   * Returns the current Datetime based on a GMT calendar.
   * @return Datetime
   */
  public static Datetime now() {}

  /**
   * Constructs a Datetime from the given String in the local time zone and in the format of the user locale.
   * @param datetimeString 
   * @return Datetime
   */
  public static Datetime parse(String datetimeString) {}

  /**
   * Returns the second component of a Datetime in the local time zone of the context user.
   * @return Integer
   */
  public Integer second() {}

  /**
   * Returns the second component of a Datetime in the GMT time zone.
   * @return Integer
   */
  public Integer secondGmt() {}

  /**
   * Returns the time component of a Datetime in the local time zone of the context user.
   * @return Time
   */
  public Time time() {}

  /**
   * Returns the time component of a Datetime in the GMT time zone.
   * @return Time
   */
  public Time timeGmt() {}

  /**
   * Returns a Datetime that contains the value of the specified string.
   * @param dateTimeString 
   * @return Datetime
   */
  public static Datetime valueOf(String dateTimeString) {}

  /**
   * Returns a Datetime that contains the value of the specified string.
   * @param fieldValue 
   * @return Datetime
   */
  public static Datetime valueOf(Object fieldValue) {}

  /**
   * Returns a Datetime that contains the value of the specified String.
   * @param dateTimeString 
   * @return Datetime
   */
  public static Datetime valueOfGmt(String dateTimeString) {}

  /**
   * Returns the year component of a Datetime in the local time zone of the context user.
   * @return Integer
   */
  public Integer year() {}

  /**
   * Returns the year component of a Datetime in the GMT time zone.
   * @return Integer
   */
  public Integer yearGmt() {}

}