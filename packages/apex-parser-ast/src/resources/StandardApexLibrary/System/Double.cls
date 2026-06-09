/**
 * Contains methods for the Double primitive data type.
 */
global class Double {

  global Double() {}

  /**
   * Returns the String value for this Double using the locale of the context user
   * @return String
   */
  global String format() {}

  /**
   * Returns the Integer value of this Double by casting it to an Integer.
   * @return Integer
   */
  global Integer intValue() {}

  /**
   * Returns the Long value of this Double.
   * @return Long
   */
  global Long longValue() {}

  /**
   * Returns the closest Long to this Double value.
   * @return Long
   */
  global Long round() {}

  /**
   * Returns a Double that contains the value of the specified String. As in Java, the String is interpreted as representing a signed decimal.
   * @param stringToDouble 
   * @return Double
   */
  global static Double valueOf(String stringToDouble) {}

  /**
   * Returns a Double that contains the value of the specified String. As in Java, the String is interpreted as representing a signed decimal.
   * @param fieldValue 
   * @return Double
   */
  global static Double valueOf(Object fieldValue) {}

  global Object clone() {}

}