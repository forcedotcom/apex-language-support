/**
 * Contains methods for the Date primitive data type.
 * Namespace: System
 * @see https://developer.salesforce.com/docs/atlas.en-us.apexref.meta/apexref/apex_methods_system_date.htm
 */
public class Date {
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
	 * Returns the number of days between this Date and the specified Date.
	 * @param date2 The Date to compare
	 * @return Number of days between the dates
	 */
	public Integer daysBetween(Date date2) { }

	/**
	 * Returns the month (1-12).
	 * @return Month
	 */
	public Integer month() { }

	/**
	 * Returns the year.
	 * @return Year
	 */
	public Integer year() { }

	/**
	 * Adds the specified number of days to this Date.
	 * @param numberOfDays The number of days to add
	 * @return New Date with days added
	 */
	public Date addDays(Integer numberOfDays) { }

	/**
	 * Adds the specified number of months to this Date.
	 * @param numberOfMonths The number of months to add
	 * @return New Date with months added
	 */
	public Date addMonths(Integer numberOfMonths) { }

	/**
	 * Adds the specified number of years to this Date.
	 * @param numberOfYears The number of years to add
	 * @return New Date with years added
	 */
	public Date addYears(Integer numberOfYears) { }

	/**
	 * Returns a Date constructed from the specified year, month, and day.
	 * @param year The year
	 * @param month The month (1-12)
	 * @param day The day (1-31)
	 * @return Date constructed from the arguments
	 */
	public static Date newInstance(Integer year, Integer month, Integer day) { }

	/**
	 * Returns the Date value of today.
	 * @return Today's date
	 */
	public static Date today() { }

	/**
	 * Returns a String representation of this Date.
	 * @return String representation
	 */
	public String format() { }

	/**
	 * Returns the String representation of the Date argument.
	 * @param d The Date to convert
	 * @return String representation
	 */
	public static String valueOf(Date d) { }

}

