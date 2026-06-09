/**
 * Contains methods for the Integer primitive data type.
 */
global class Integer {

  global Integer() {}

  /**
   * Returns the integer as a string using the locale of the context user.
   * @return String
   */
  global String format() {}

  /**
   * Returns an Integer that contains the value of the specified String. As in Java, the String is interpreted as representing a signed decimal integer.
   * @param stringToInteger 
   * @return Integer
   */
  global static Integer valueOf(String stringToInteger) {}

  /**
   * Returns an Integer that contains the value of the specified String. As in Java, the String is interpreted as representing a signed decimal integer.
   * @param fieldValue 
   * @return Integer
   */
  global static Integer valueOf(Object fieldValue) {}

  global Object clone() {}

}