/**
 * Contains methods for the Double primitive data type.
 */
global class Double {

  /**
   * Returns the String value for this Double using the locale of the context user
   * @return String
   */
  public String format() {}

  /**
   * Returns the Integer value of this Double by casting it to an Integer.
   * @return Integer
   */
  public Integer intValue() {}

  /**
   * Returns the Long value of this Double.
   * @return Long
   */
  public Long longValue() {}

  /**
   * Returns the closest Long to this Double value.
   * @return Long
   */
  public Long round() {}

  /**
   * Returns a Double that contains the value of the specified String. As in Java, the String is interpreted as representing a signed decimal.
   * @param stringToDouble 
   * @return Double
   */
  public static Double valueOf(String stringToDouble) {}

  /**
   * Returns a Double that contains the value of the specified String. As in Java, the String is interpreted as representing a signed decimal.
   * @param fieldValue 
   * @return Double
   */
  public static Double valueOf(Object fieldValue) {}

}