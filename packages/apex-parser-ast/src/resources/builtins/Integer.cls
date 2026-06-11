/**
 * Contains methods for the Integer primitive data type.
 * Namespace: System
 * @see https://developer.salesforce.com/docs/atlas.en-us.apexref.meta/apexref/apex_methods_system_integer.htm
 */
public class Integer {
	/**
	 * Returns the value of this Integer as a Decimal.
	 * @return Decimal representation of this Integer
	 */
	public Decimal decimalValue() { }

	/**
	 * Returns the value of this Integer as a Double.
	 * @return Double representation of this Integer
	 */
	public Double doubleValue() { }

	/**
	 * Returns the value of this Integer as a Long.
	 * @return Long representation of this Integer
	 */
	public Long longValue() { }

	/**
	 * Returns a String representation of this Integer.
	 * @return String representation
	 */
	public String format() { }

	/**
	 * Returns an Integer that contains the value of the specified String.
	 * @param stringToInteger The String to convert
	 * @return Integer value of the String
	 */
	public static Integer valueOf(String stringToInteger) { }

	/**
	 * Returns an Integer that contains the value of the specified Object.
	 * @param fieldValue The Object to convert
	 * @return Integer value of the Object
	 */
	public static Integer valueOf(Object fieldValue) { }

}

