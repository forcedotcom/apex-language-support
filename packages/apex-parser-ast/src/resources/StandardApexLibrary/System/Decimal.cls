/**
 * Contains methods for the Decimal primitive data type.
 * Usage
 * Note
 * Two Decimal objects that are numerically equivalent but differ in scale (such as 1.1 and 1.10) generally do not have the same hashcode. Use caution when such Decimal objects are used in Sets or as Map keys.
 * For more information on Decimal, see <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.apexcode.meta/apexcode/langCon_apex_primitives.htm" target="_blank">Decimal Data Type</a>.
 */
global class Decimal {
    /**
     * Returns the absolute value of the Decimal.
     * Example
     * Decimal myDecimal = -6.02214129;
     * System.assertEquals(6.02214129, myDecimal.abs());
     */
    global Decimal abs() { return 0.0; }

    /**
     * Divides this Decimal by the specified divisor, and sets the scale, that is, the number of decimal places, of the result using the specified scale.
     * Example
     * Decimal decimalNumber = 19;
     * Decimal result = decimalNumber.divide(100, 3);
     * System.assertEquals(0.190, result);
     */
    global Decimal divide(Decimal divisor, Integer scale) { return 0.0; }

    /**
     * Divides this Decimal by the specified divisor, sets the scale, that is, the number of decimal places, of the result using the specified scale, and if necessary, rounds the value using the rounding mode.
     * Example
     * Decimal myDecimal = 12.4567;
     * Decimal divDec = myDecimal.divide(7, 2, System.RoundingMode.UP);
     * System.assertEquals(divDec, 1.78);
     */
    global Decimal divide(Decimal divisor, Integer scale, System.RoundingMode roundingMode) { return 0.0; }

    /**
     * Returns the Double value of this Decimal.
     * Example
     * Decimal myDecimal = 6.62606957;
     * Double value = myDecimal.doubleValue();
     * System.assertEquals(6.62606957, value);
     */
    global Double doubleValue() { return 0.0; }

    global Boolean equals(Object obj) { return false; }

    /**
     * Returns the String value of this Decimal using the locale of the context user.
     * Usage
     * Scientific notation will be used if an exponent is needed.
     * Example
     * // U.S. locale
     * Decimal myDecimal = 12345.6789;
     * system.assertEquals('12,345.679', myDecimal.format());
     */
    global String format() { return null; }

    global Integer hashCode() { return 0; }

    /**
     * Returns the Integer value of this Decimal.
     * Example
     * Decimal myDecimal = 1.602176565;
     * system.assertEquals(1, myDecimal.intValue());
     */
    global Integer intValue() { return 0; }

    /**
     * Returns the Long value of this Decimal.
     * Example
     * Decimal myDecimal = 376.730313461;
     * system.assertEquals(376, myDecimal.longValue());
     */
    global Long longValue() { return 0L; }

    /**
     * Returns the value of this decimal raised to the power of the specified exponent.
     * Usage
     * If you use MyDecimal.pow(0), 1 is returned.
     * The Math.pow method does accept negative values.
     * Example
     * Decimal myDecimal = 4.12;
     * Decimal powDec = myDecimal.pow(2);
     * System.assertEquals(powDec, 16.9744);
     */
    global Decimal pow(Integer exponent) { return 0.0; }

    /**
     * Returns the total number of digits for the Decimal.
     * Example
     * For example, if the Decimal value was 123.45, precision returns 5. If the Decimal value is 123.123, precision returns 6.
     * Decimal D1 = 123.45;
     * Integer precision1 = D1.precision();
     * system.assertEquals(precision1, 5);
     * Decimal D2 = 123.123;
     * Integer precision2 = D2.precision();
     * system.assertEquals(precision2, 6);
     */
    global Integer precision() { return 0; }

    /**
     * Returns the rounded approximation of this Decimal. The number is rounded to zero decimal places using half-even rounding mode, that is, it rounds towards the “nearest neighbor” unless both neighbors are equidistant, in which case, this mode rounds towards the even neighbor.
     * Usage
     * Note that this rounding mode statistically minimizes cumulative error when applied repeatedly over a sequence of calculations.
     * Example
     * Decimal D = 4.5;
     * Long L = D.round();
     * System.assertEquals(4, L);
     *
     * Decimal D1 = 5.5;
     * Long L1 = D1.round();
     * System.assertEquals(6, L1);
     *
     * Decimal D2 = 5.2;
     * Long L2 = D2.round();
     * System.assertEquals(5, L2);
     *
     * Decimal D3 = -5.7;
     * Long L3 = D3.round();
     * System.assertEquals(-6, L3);
     */
    global Long round() { return 0L; }

    /**
     * Returns the rounded approximation of this Decimal. The number is rounded to zero decimal places using the rounding mode specified by the rounding mode.
     */
    global Long round(System.RoundingMode roundingMode) { return 0L; }

    /**
     * Returns the scale of the Decimal, that is, the number of decimal places.
     * Example
     * Decimal myDecimal = 9.27400968;
     * system.assertEquals(8, myDecimal.scale());
     */
    global Integer scale() { return 0; }

    /**
     * Returns the Decimal scaled to the specified number of decimal places, using half-even rounding, if necessary. Half-even rounding mode rounds toward the “nearest neighbor.” If both neighbors are equidistant, the number is rounded toward the even neighbor.
     * Usage
     * If you do not explicitly set the scale for a Decimal, the item from which the Decimal is created determines the scale.
     * If the Decimal is created as part of a query, the scale is based on the scale of the field returned from the query.
     * If the Decimal is created from a String, the scale is the number of characters after the decimal point of the String.
     * If the Decimal is created from a non-decimal number, the number is first converted to a String. The scale is then set using the number of characters after the decimal point.
     * Example
     * Decimal myDecimal = 8.987551787;
     * Decimal setScaled = myDecimal.setscale(3);
     * System.assertEquals(8.988, setScaled);
     */
    global Decimal setScale(Integer scale) { return 0.0; }

    /**
     * Returns the Decimal scaled to the specified number of decimal places, using the specified rounding mode, if necessary.
     * Usage
     * If you do not explicitly set the scale for a Decimal, the item from which the Decimal is created determines the scale.
     * If the Decimal is created as part of a query, the scale is based on the scale of the field returned from the query.
     * If the Decimal is created from a String, the scale is the number of characters after the decimal point of the String.
     * If the Decimal is created from a non-decimal number, the number is first converted to a String. The scale is then set using the number of characters after the decimal point.
     */
    global Decimal setScale(Integer scale, System.RoundingMode roundingMode) { return 0.0; }

    /**
     * Returns the Decimal with any trailing zeros removed.
     * Example
     * Decimal myDecimal = 1.10000;
     * Decimal stripped = myDecimal.stripTrailingZeros();
     * System.assertEquals(stripped, 1.1);
     */
    global Decimal stripTrailingZeros() { return 0.0; }

    /**
     * Returns the String value of this Decimal, without using scientific notation.
     * Example
     * Decimal myDecimal = 12345.6789;
     * System.assertEquals('12345.6789', myDecimal.toPlainString());
     */
    global String toPlainString() { return null; }

    global String toString() { return null; }

    /**
     * Returns a Decimal that contains the value of the specified Double.
     * Example
     * Double myDouble = 2.718281828459045;
     * Decimal myDecimal = Decimal.valueOf(myDouble);
     * System.assertEquals(2.718281828459045, myDecimal);
     */
    global static Decimal valueOf(Double dbl) { return 0.0; }

    /**
     * Returns a Decimal that contains the value of the specified Long.
     * Example
     * Long myLong = 299792458;
     * Decimal myDecimal = Decimal.valueOf(myLong);
     * System.assertEquals(299792458, myDecimal);
     */
    global static Decimal valueOf(Long lng) { return 0.0; }

    /**
     * Returns a Decimal that contains the value of the specified String. As in Java, the string is interpreted as representing a signed Decimal.
     * Example
     * String temp = '12.4567';
     * Decimal myDecimal = Decimal.valueOf(temp);
     */
    global static Decimal valueOf(String str) { return 0.0; }
}