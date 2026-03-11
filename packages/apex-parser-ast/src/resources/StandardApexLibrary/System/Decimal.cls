/**
 * Contains methods for the Decimal primitive data type.
 */
global class Decimal {

  /**
   * Returns the absolute value of the Decimal.
   * @return Decimal
   */
  public Decimal abs() {}

  /**
   * Divides this Decimal by the specified divisor, and sets the scale, that is, the number of decimal places, of the result using the specified scale.
   * @param divisor 
   * @param scale 
   * @return Decimal
   */
  public Decimal divide(Decimal divisor, Integer scale) {}

  /**
   * Divides this Decimal by the specified divisor, and sets the scale, that is, the number of decimal places, of the result using the specified scale.
   * @param divisor 
   * @param scale 
   * @param roundingMode 
   * @return Decimal
   */
  public Decimal divide(Decimal divisor, Integer scale, System.RoundingMode roundingMode) {}

  /**
   * Returns the Double value of this Decimal.
   * @return Double
   */
  public Double doubleValue() {}

  /**
   * Returns the String value of this Decimal using the locale of the context user.
   * @return String
   */
  public String format() {}

  /**
   * Returns the Integer value of this Decimal.
   * @return Integer
   */
  public Integer intValue() {}

  /**
   * Returns the Long value of this Decimal.
   * @return Long
   */
  public Long longValue() {}

  /**
   * Returns the value of this decimal raised to the power of the specified exponent.
   * @param exponent The value of exponent must be between 0 and 32,767.
   * @return Decimal
   */
  public Decimal pow(Integer exponent) {}

  /**
   * Returns the total number of digits for the Decimal.
   * @return Integer
   */
  public Integer precision() {}

  /**
   * Returns the rounded approximation of this Decimal. The number is rounded to zero decimal places using half-even rounding mode, that is, it rounds towards the “nearest neighbor” unless both neighbors are equidistant, in which case, this mode rounds towards the even neighbor.
   * @return Long
   */
  public Long round() {}

  /**
   * Returns the rounded approximation of this Decimal. The number is rounded to zero decimal places using half-even rounding mode, that is, it rounds towards the “nearest neighbor” unless both neighbors are equidistant, in which case, this mode rounds towards the even neighbor.
   * @param roundingMode 
   * @return Long
   */
  public Long round(System.RoundingMode roundingMode) {}

  /**
   * Returns the scale of the Decimal, that is, the number of decimal places.
   * @return Integer
   */
  public Integer scale() {}

  /**
   * Returns the Decimal scaled to the specified number of decimal places, using half-even rounding, if necessary. Half-even rounding mode rounds toward the “nearest neighbor.” If both neighbors are equidistant, the number is rounded toward the even neighbor.
   * @param scale The value of scale must be between –33 and 33. If the value of scale is negative, your unscaled value is multiplied by 10 to the power of the negation of scale . For example, after this operation, the value of d is 4*10^3 . Decimal d = 4000; d = d.setScale(-3);
   * @return Decimal
   */
  public Decimal setScale(Integer scale) {}

  /**
   * Returns the Decimal scaled to the specified number of decimal places, using half-even rounding, if necessary. Half-even rounding mode rounds toward the “nearest neighbor.” If both neighbors are equidistant, the number is rounded toward the even neighbor.
   * @param scale The value of scale must be between –33 and 33. If the value of scale is negative, your unscaled value is multiplied by 10 to the power of the negation of scale . For example, after this operation, the value of d is 4*10^3 . Decimal d = 4000; d = d.setScale(-3);
   * @param roundingMode 
   * @return Decimal
   */
  public Decimal setScale(Integer scale, System.RoundingMode roundingMode) {}

  /**
   * Returns the Decimal with any trailing zeros removed.
   * @return Decimal
   */
  public Decimal stripTrailingZeros() {}

  /**
   * Returns the String value of this Decimal, without using scientific notation.
   * @return String
   */
  public String toPlainString() {}

  /**
   * Returns a Decimal that contains the value of the specified Double.
   * @param doubleToDecimal 
   * @return Decimal
   */
  public static Decimal valueOf(Double doubleToDecimal) {}

  /**
   * Returns a Decimal that contains the value of the specified Double.
   * @param longToDecimal 
   * @return Decimal
   */
  public static Decimal valueOf(Long longToDecimal) {}

  /**
   * Returns a Decimal that contains the value of the specified Double.
   * @param stringToDecimal 
   * @return Decimal
   */
  public static Decimal valueOf(String stringToDecimal) {}

}