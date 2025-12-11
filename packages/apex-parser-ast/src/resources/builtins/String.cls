/**
 * Contains methods for the String primitive data type.
 * Namespace: System
 * @see https://developer.salesforce.com/docs/atlas.en-us.apexref.meta/apexref/apex_methods_system_string.htm
 */
public class String {
	/**
	 * Abbreviates a String using ellipses.
	 * @param maxWidth Maximum length of the resulting String
	 * @return Abbreviated String
	 */
	public String abbreviate(Integer maxWidth) { }

	/**
	 * Capitalizes a String changing the first letter to title case.
	 * @return Capitalized String
	 */
	public String capitalize() { }

	/**
	 * Returns true if the String contains the specified sequence of char values.
	 * @param substring The sequence to search for
	 * @return true if the String contains the substring, false otherwise
	 */
	public Boolean contains(String substring) { }

	/**
	 * Compares this String to another String.
	 * @param other The String to compare
	 * @return true if the Strings are equal, false otherwise
	 */
	public Boolean equals(Object other) { }

	/**
	 * Compares this String to another String, ignoring case considerations.
	 * @param other The String to compare
	 * @return true if the Strings are equal ignoring case, false otherwise
	 */
	public Boolean equalsIgnoreCase(String other) { }

	/**
	 * Escapes HTML 3.0 entities.
	 * @return Escaped String
	 */
	public String escapeHtml3() { }

	/**
	 * Escapes HTML 4.0 entities.
	 * @return Escaped String
	 */
	public String escapeHtml4() { }

	/**
	 * Returns a formatted String using the specified format String and arguments.
	 * @param formatString The format String
	 * @param args The arguments
	 * @return Formatted String
	 */
	public static String format(String formatString, List<Object> args) { }

	/**
	 * Returns a formatted String using the specified format String and arguments.
	 * @param formatString The format String
	 * @param arg1 The first argument
	 * @return Formatted String
	 */
	public static String format(String formatString, Object arg1) { }

	/**
	 * Returns a formatted String using the specified format String and arguments.
	 * @param formatString The format String
	 * @param arg1 The first argument
	 * @param arg2 The second argument
	 * @return Formatted String
	 */
	public static String format(String formatString, Object arg1, Object arg2) { }

	/**
	 * Returns a formatted String using the specified format String and arguments.
	 * @param formatString The format String
	 * @param arg1 The first argument
	 * @param arg2 The second argument
	 * @param arg3 The third argument
	 * @return Formatted String
	 */
	public static String format(String formatString, Object arg1, Object arg2, Object arg3) { }

	/**
	 * Returns a formatted String using the specified format String and arguments.
	 * @param formatString The format String
	 * @param arg1 The first argument
	 * @param arg2 The second argument
	 * @param arg3 The third argument
	 * @param arg4 The fourth argument
	 * @return Formatted String
	 */
	public static String format(String formatString, Object arg1, Object arg2, Object arg3, Object arg4) { }

	/**
	 * Returns a formatted String using the specified format String and arguments.
	 * @param formatString The format String
	 * @param arg1 The first argument
	 * @param arg2 The second argument
	 * @param arg3 The third argument
	 * @param arg4 The fourth argument
	 * @param arg5 The fifth argument
	 * @return Formatted String
	 */
	public static String format(String formatString, Object arg1, Object arg2, Object arg3, Object arg4, Object arg5) { }

	/**
	 * Returns the character at the specified index.
	 * @param index The index of the character
	 * @return The character at the specified index
	 */
	public String getChars(Integer index) { }

	/**
	 * Returns the index within this String of the first occurrence of the specified substring.
	 * @param substring The substring to search for
	 * @return The index of the first occurrence, or -1 if not found
	 */
	public Integer indexOf(String substring) { }

	/**
	 * Returns the index within this String of the first occurrence of the specified substring, starting at the specified index.
	 * @param substring The substring to search for
	 * @param startIndex The index to start the search from
	 * @return The index of the first occurrence, or -1 if not found
	 */
	public Integer indexOf(String substring, Integer startIndex) { }

	/**
	 * Returns true if the String is blank (null, empty, or contains only whitespace).
	 * @return true if the String is blank, false otherwise
	 */
	public Boolean isBlank() { }

	/**
	 * Returns true if the String is empty (length is 0).
	 * @return true if the String is empty, false otherwise
	 */
	public Boolean isEmpty() { }

	/**
	 * Joins the elements of the provided List into a single String.
	 * @param strings The List of Strings to join
	 * @param separator The separator String
	 * @return Joined String
	 */
	public static String join(List<String> strings, String separator) { }

	/**
	 * Joins the elements of the provided Iterable into a single String.
	 * @param strings The Iterable of Strings to join
	 * @param separator The separator String
	 * @return Joined String
	 */
	public static String join(Iterable<String> strings, String separator) { }

	/**
	 * Returns the leftmost len characters of this String.
	 * @param len The number of characters to return
	 * @return The leftmost characters
	 */
	public String left(Integer len) { }

	/**
	 * Returns the length of this String.
	 * @return The length of the String
	 */
	public Integer length() { }

	/**
	 * Normalizes whitespace by removing leading and trailing whitespace and replacing sequences of whitespace with a single space.
	 * @return Normalized String
	 */
	public String normalizeSpace() { }

	/**
	 * Removes all occurrences of the specified substring from this String.
	 * @param substring The substring to remove
	 * @return String with all occurrences removed
	 */
	public String remove(String substring) { }

	/**
	 * Removes the ending of this String if it matches the specified suffix.
	 * @param suffix The suffix to remove
	 * @return String with suffix removed if it was present
	 */
	public String removeEnd(String suffix) { }

	/**
	 * Removes the ending of this String if it matches the specified suffix, ignoring case.
	 * @param suffix The suffix to remove
	 * @return String with suffix removed if it was present
	 */
	public String removeEndIgnoreCase(String suffix) { }

	/**
	 * Removes the beginning of this String if it matches the specified prefix.
	 * @param prefix The prefix to remove
	 * @return String with prefix removed if it was present
	 */
	public String removeStart(String prefix) { }

	/**
	 * Removes the beginning of this String if it matches the specified prefix, ignoring case.
	 * @param prefix The prefix to remove
	 * @return String with prefix removed if it was present
	 */
	public String removeStartIgnoreCase(String prefix) { }

	/**
	 * Returns a new String that repeats this String the specified number of times.
	 * @param count The number of times to repeat
	 * @return Repeated String
	 */
	public String repeat(Integer count) { }

	/**
	 * Replaces all occurrences of a substring within this String with another String.
	 * @param oldString The substring to replace
	 * @param newString The replacement String
	 * @return String with replacements made
	 */
	public String replace(String oldString, String newString) { }

	/**
	 * Replaces each substring of this String that matches the given regular expression with the given replacement.
	 * @param regex The regular expression to match
	 * @param replacement The replacement String
	 * @return String with replacements made
	 */
	public String replaceAll(String regex, String replacement) { }

	/**
	 * Replaces the first substring of this String that matches the given regular expression with the given replacement.
	 * @param regex The regular expression to match
	 * @param replacement The replacement String
	 * @return String with replacement made
	 */
	public String replaceFirst(String regex, String replacement) { }

	/**
	 * Reverses the order of characters in this String.
	 * @return Reversed String
	 */
	public String reverse() { }

	/**
	 * Returns the rightmost len characters of this String.
	 * @param len The number of characters to return
	 * @return The rightmost characters
	 */
	public String right(Integer len) { }

	/**
	 * Splits this String around matches of the given regular expression.
	 * @param regex The regular expression to split on
	 * @return List of Strings resulting from the split
	 */
	public List<String> split(String regex) { }

	/**
	 * Splits this String around matches of the given regular expression.
	 * @param regex The regular expression to split on
	 * @param limit The maximum number of splits
	 * @return List of Strings resulting from the split
	 */
	public List<String> split(String regex, Integer limit) { }

	/**
	 * Tests if this String starts with the specified prefix.
	 * @param prefix The prefix
	 * @return true if this String starts with the prefix, false otherwise
	 */
	public Boolean startsWith(String prefix) { }

	/**
	 * Returns a substring of this String.
	 * @param startIndex The starting index (inclusive)
	 * @return The substring
	 */
	public String substring(Integer startIndex) { }

	/**
	 * Returns a substring of this String.
	 * @param startIndex The starting index (inclusive)
	 * @param endIndex The ending index (exclusive)
	 * @return The substring
	 */
	public String substring(Integer startIndex, Integer endIndex) { }

	/**
	 * Gets the substring after the first occurrence of a separator.
	 * @param separator The separator
	 * @return The substring after the separator, or empty String if separator not found
	 */
	public String substringAfter(String separator) { }

	/**
	 * Gets the substring after the last occurrence of a separator.
	 * @param separator The separator
	 * @return The substring after the separator, or empty String if separator not found
	 */
	public String substringAfterLast(String separator) { }

	/**
	 * Gets the substring before the first occurrence of a separator.
	 * @param separator The separator
	 * @return The substring before the separator, or the whole String if separator not found
	 */
	public String substringBefore(String separator) { }

	/**
	 * Gets the substring before the last occurrence of a separator.
	 * @param separator The separator
	 * @return The substring before the separator, or the whole String if separator not found
	 */
	public String substringBeforeLast(String separator) { }

	/**
	 * Converts all of the characters in this String to lower case.
	 * @return Lowercase String
	 */
	public String toLowerCase() { }

	/**
	 * Converts all of the characters in this String to upper case.
	 * @return Uppercase String
	 */
	public String toUpperCase() { }

	/**
	 * Returns a copy of this String with leading and trailing whitespace removed.
	 * @return Trimmed String
	 */
	public String trim() { }

	/**
	 * Returns the String representation of the Object argument.
	 * @param obj The Object to convert
	 * @return String representation
	 */
	public static String valueOf(Object obj) { }

	/**
	 * Returns the String representation of the Boolean argument.
	 * @param b The Boolean to convert
	 * @return String representation
	 */
	public static String valueOf(Boolean b) { }

	/**
	 * Returns the String representation of the Integer argument.
	 * @param i The Integer to convert
	 * @return String representation
	 */
	public static String valueOf(Integer i) { }

	/**
	 * Returns the String representation of the Long argument.
	 * @param l The Long to convert
	 * @return String representation
	 */
	public static String valueOf(Long l) { }

	/**
	 * Returns the String representation of the Decimal argument.
	 * @param d The Decimal to convert
	 * @return String representation
	 */
	public static String valueOf(Decimal d) { }

	/**
	 * Returns the String representation of the Double argument.
	 * @param d The Double to convert
	 * @return String representation
	 */
	public static String valueOf(Double d) { }

	/**
	 * Returns the String representation of the Date argument.
	 * @param d The Date to convert
	 * @return String representation
	 */
	public static String valueOf(Date d) { }

	/**
	 * Returns the String representation of the DateTime argument.
	 * @param dt The DateTime to convert
	 * @return String representation
	 */
	public static String valueOf(DateTime dt) { }

	/**
	 * Returns the String representation of the Id argument.
	 * @param id The Id to convert
	 * @return String representation
	 */
	public static String valueOf(Id id) { }

}

