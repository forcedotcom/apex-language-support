/**
 * Contains methods for the Date primitive data type.
 */
public class Date {

  /**
   * Adds the specified number of additional days to a Date.
   * @param additionalDays 
   * @return Date
   */
  public Date addDays(Integer additionalDays) {}

  /**
   * Adds the specified number of additional months to a Date
   * @param additionalMonths 
   * @return Date
   */
  public Date addMonths(Integer additionalMonths) {}

  /**
   * Adds the specified number of additional years to a Date
   * @param additionalYears 
   * @return Date
   */
  public Date addYears(Integer additionalYears) {}

  /**
   * Returns the day-of-month component of a Date.
   * @return Integer
   */
  public Integer day() {}

  /**
   * Returns the day-of-year component of a Date.
   * @return Integer
   */
  public Integer dayOfYear() {}

  /**
   * Returns the number of days between the Date that called the method and the specified date.
   * @param secondDate 
   * @return Integer
   */
  public Integer daysBetween(Date secondDate) {}

  /**
   * Returns the number of days in the month for the specified year and month (1=Jan).
   * @param year 
   * @param month 
   * @return Integer
   */
  public static Integer daysInMonth(Integer year, Integer month) {}

  /**
   * Returns the Date as a string using the locale of the context user
   * @return String
   */
  public String format() {}

  /**
   * Returns true if the specified year is a leap year.
   * @param year 
   * @return Boolean
   */
  public static Boolean isLeapYear(Integer year) {}

  /**
   * Returns true if the Date that called the method is the same as the specified date.
   * @param dateToCompare 
   * @return Boolean
   */
  public Boolean isSameDay(Date dateToCompare) {}

  /**
   * Returns the month component of a Date (1=Jan).
   * @return Integer
   */
  public Integer month() {}

  /**
   * Returns the number of months between the Date that called the method and the specified date, ignoring the difference in days.
   * @param secondDate 
   * @return Integer
   */
  public Integer monthsBetween(Date secondDate) {}

  /**
   * Constructs a Date from Integer representations of the year , month (1=Jan), and day .
   * @param year 
   * @param month 
   * @param day 
   * @return Date
   */
  public static Date newInstance(Integer year, Integer month, Integer day) {}

  /**
   * Constructs a Date from a String. The format of the String depends on the local date format.
   * @param stringDate 
   * @return Date
   */
  public static Date parse(String stringDate) {}

  /**
   * Returns the current date in the current user's time zone.
   * @return Date
   */
  public static Date today() {}

  /**
   * Returns the first of the month for the Date that called the method.
   * @return Date
   */
  public Date toStartOfMonth() {}

  /**
   * Returns the start of the week for the Date that called the method, depending on the context user's locale.
   * @return Date
   */
  public Date toStartOfWeek() {}

  /**
   * Returns a Date that contains the value of the specified String.
   * @param stringDate 
   * @return Date
   */
  public static Date valueOf(String stringDate) {}

  /**
   * Returns a Date that contains the value of the specified String.
   * @param fieldValue 
   * @return Date
   */
  public static Date valueOf(Object fieldValue) {}

  /**
   * Returns the year component of a Date
   * @return Integer
   */
  public Integer year() {}

}