/**
 * Represents a compiled representation of a regular expression.
 */
global class Pattern {
    global static System.Pattern compile(String regex) { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global System.Matcher matcher(String input) { return null; }

    /**
     * Compiles the regular expression regExp and tries to match it against the specified string. This method returns true if the specified string matches the regular expression, false otherwise.
     * <p>Usage
     * If a pattern is to be used multiple times, compiling it once and reusing it is more efficient than invoking this method each time.
     * <p>Example
     * Note that the following code example:
     * Pattern.matches(regExp, input);
     * produces the same result as this code example:
     * Pattern.compile(regex).
     * matcher(input).matches();
     */
    global static Boolean matches(String regex, String input) { return false; }

    /**
     * Returns the regular expression from which this Pattern object was compiled.
     */
    global String pattern() { return null; }

    /**
     * Returns a string that can be used to create a pattern that matches the string yourString as if it were a literal pattern.
     * <p>Usage
     * Metacharacters (such as $ or ^) and escape sequences in the input string are treated as literal characters with no special meaning.
     */
    global static String quote(String s) { return null; }

    /**
     * Returns a list that contains each substring of the String that matches this pattern.
     * <p>Usage
     * The substrings are placed in the list in the order in which they occur in the String. If regExp does not match the pattern, the resulting list has just one element containing the original String.
     * @return Note
     * In API version 34.0 and earlier, a zero-width regExp value produces an empty list item at the beginning of the method’s output.
     */
    global List split(String input) { return null; }

    /**
     * Returns a list that contains each substring of the String that is terminated either by the regular expression regExp that matches this pattern, or by the end of the String.
     * @return Note
     * In API version 34.0 and earlier, a zero-width regExp value produces an empty list item at the beginning of the method’s output.
     */
    global List split(String input, Integer n) { return null; }

    global override virtual String toString() { return null; }
}