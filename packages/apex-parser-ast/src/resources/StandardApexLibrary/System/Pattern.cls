/**
 * Represents a compiled representation of a regular expression.
 */
public class Pattern {

  /**
   * Compiles the regular expression into a Pattern object.
   * @param regExp 
   * @return Pattern
   */
  public static Pattern compile(String regExp) {}

  /**
   * Creates a Matcher object that matches the input string stringtoMatch against this Pattern object.
   * @param stringtoMatch 
   * @return Matcher
   */
  public Matcher matcher(String stringtoMatch) {}

  /**
   * Compiles the regular expression regExp and tries to match it against the specified string. This method returns true if the specified string matches the regular expression, false otherwise.
   * @param regExp 
   * @param stringtoMatch 
   * @return Boolean
   */
  public static Boolean matches(String regExp, String stringtoMatch) {}

  /**
   * Returns the regular expression from which this Pattern object was compiled.
   * @return String
   */
  public String pattern() {}

  /**
   * Returns a string that can be used to create a pattern that matches the string yourString as if it were a literal pattern.
   * @param yourString 
   * @return String
   */
  public static String quote(String yourString) {}

  /**
   * Returns a list that contains each substring of the String that matches this pattern.
   * @param regExp 
   * @return String []
   */
  public String [] split(String regExp) {}

  /**
   * Returns a list that contains each substring of the String that matches this pattern.
   * @param regExp 
   * @param limit 
   * @return String []
   */
  public String [] split(String regExp, Integer limit) {}

}