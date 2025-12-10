/**
 * Contains methods for the Time primitive data type.
 * Namespace: System
 * @see https://developer.salesforce.com/docs/atlas.en-us.apexref.meta/apexref/apex_methods_system_time.htm
 */
public class Time {
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
	 * Returns the second (0-59).
	 * @return Second
	 */
	public Integer second() { }

	/**
	 * Returns the millisecond (0-999).
	 * @return Millisecond
	 */
	public Integer millisecond() { }

	/**
	 * Returns a Time constructed from the specified hour, minute, second, and millisecond.
	 * @param hour The hour (0-23)
	 * @param minute The minute (0-59)
	 * @param second The second (0-59)
	 * @param millisecond The millisecond (0-999)
	 * @return Time constructed from the arguments
	 */
	public static Time newInstance(Integer hour, Integer minute, Integer second, Integer millisecond) { }

	/**
	 * Returns a Time constructed from the specified hour, minute, and second.
	 * @param hour The hour (0-23)
	 * @param minute The minute (0-59)
	 * @param second The second (0-59)
	 * @return Time constructed from the arguments
	 */
	public static Time newInstance(Integer hour, Integer minute, Integer second) { }

	/**
	 * Returns a String representation of this Time.
	 * @return String representation
	 */
	public String format() { }

}

