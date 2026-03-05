/**
 * Contains methods for the DateTime primitive data type.
 * Namespace: System
 * @see https://developer.salesforce.com/docs/atlas.en-us.apexref.meta/apexref/apex_methods_system_datetime.htm
 */
public class DateTime {
	/**
	 * Returns the day of month (1-31).
	 * @return Day of month
	 */
	public Integer day() { }

	/**
	 * Returns the day of week (1=Sunday, 2=Monday, ..., 7=Saturday).
	 * @return Day of week
	 */
	public Integer dayOfWeek() { }

	/**
	 * Returns the day of year (1-366).
	 * @return Day of year
	 */
	public Integer dayOfYear() { }

	/**
	 * Returns the hour of day (0-23).
	 * @return Hour of day
	 */
	public Integer hour() { }

	/**
	 * Returns the minute (0-59).
	 * @return Minute
	 */
	public Integer minute() { }

	/**
	 * Returns the month (1-12).
	 * @return Month
	 */
	public Integer month() { }

	/**
	 * Returns the second (0-59).
	 * @return Second
	 */
	public Integer second() { }

	/**
	 * Returns the year.
	 * @return Year
	 */
	public Integer year() { }

	/**
	 * Returns the number of days between this DateTime and the specified DateTime.
	 * @param dateTime2 The DateTime to compare
	 * @return Number of days between the DateTimes
	 */
	public Integer daysBetween(DateTime dateTime2) { }

	/**
	 * Returns the number of hours between this DateTime and the specified DateTime.
	 * @param dateTime2 The DateTime to compare
	 * @return Number of hours between the DateTimes
	 */
	public Long hoursBetween(DateTime dateTime2) { }

	/**
	 * Returns the number of minutes between this DateTime and the specified DateTime.
	 * @param dateTime2 The DateTime to compare
	 * @return Number of minutes between the DateTimes
	 */
	public Long minutesBetween(DateTime dateTime2) { }

	/**
	 * Returns the number of seconds between this DateTime and the specified DateTime.
	 * @param dateTime2 The DateTime to compare
	 * @return Number of seconds between the DateTimes
	 */
	public Long secondsBetween(DateTime dateTime2) { }

	/**
	 * Adds the specified number of days to this DateTime.
	 * @param numberOfDays The number of days to add
	 * @return New DateTime with days added
	 */
	public DateTime addDays(Integer numberOfDays) { }

	/**
	 * Adds the specified number of hours to this DateTime.
	 * @param numberOfHours The number of hours to add
	 * @return New DateTime with hours added
	 */
	public DateTime addHours(Integer numberOfHours) { }

	/**
	 * Adds the specified number of minutes to this DateTime.
	 * @param numberOfMinutes The number of minutes to add
	 * @return New DateTime with minutes added
	 */
	public DateTime addMinutes(Integer numberOfMinutes) { }

	/**
	 * Adds the specified number of months to this DateTime.
	 * @param numberOfMonths The number of months to add
	 * @return New DateTime with months added
	 */
	public DateTime addMonths(Integer numberOfMonths) { }

	/**
	 * Adds the specified number of seconds to this DateTime.
	 * @param numberOfSeconds The number of seconds to add
	 * @return New DateTime with seconds added
	 */
	public DateTime addSeconds(Integer numberOfSeconds) { }

	/**
	 * Adds the specified number of years to this DateTime.
	 * @param numberOfYears The number of years to add
	 * @return New DateTime with years added
	 */
	public DateTime addYears(Integer numberOfYears) { }

	/**
	 * Returns the Date component of this DateTime.
	 * @return Date component
	 */
	public Date date() { }

	/**
	 * Returns the DateGMT component of this DateTime.
	 * @return DateGMT component
	 */
	public Date dateGMT() { }

	/**
	 * Returns the Time component of this DateTime.
	 * @return Time component
	 */
	public Time time() { }

	/**
	 * Returns the TimeGMT component of this DateTime.
	 * @return TimeGMT component
	 */
	public Time timeGMT() { }

	/**
	 * Returns a DateTime constructed from the specified year, month, day, hour, minute, and second.
	 * @param year The year
	 * @param month The month (1-12)
	 * @param day The day (1-31)
	 * @param hour The hour (0-23)
	 * @param minute The minute (0-59)
	 * @param second The second (0-59)
	 * @return DateTime constructed from the arguments
	 */
	public static DateTime newInstance(Integer year, Integer month, Integer day, Integer hour, Integer minute, Integer second) { }

	/**
	 * Returns a DateTime constructed from the specified year, month, and day.
	 * @param year The year
	 * @param month The month (1-12)
	 * @param day The day (1-31)
	 * @return DateTime constructed from the arguments
	 */
	public static DateTime newInstance(Integer year, Integer month, Integer day) { }

	/**
	 * Returns a DateTime constructed from the specified Date and Time.
	 * @param date The Date
	 * @param time The Time
	 * @return DateTime constructed from the arguments
	 */
	public static DateTime newInstance(Date date, Time time) { }

	/**
	 * Returns the DateTime value of now.
	 * @return Current DateTime
	 */
	public static DateTime now() { }

	/**
	 * Returns a String representation of this DateTime.
	 * @return String representation
	 */
	public String format() { }

	/**
	 * Returns a String representation of this DateTime using the specified format.
	 * @param formatString The format String
	 * @return Formatted String representation
	 */
	public String format(String formatString) { }

	/**
	 * Returns the String representation of the DateTime argument.
	 * @param dt The DateTime to convert
	 * @return String representation
	 */
	public static String valueOf(DateTime dt) { }

}

