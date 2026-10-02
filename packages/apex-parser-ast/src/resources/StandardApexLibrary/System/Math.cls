/**
 * Contains methods for mathematical operations.
 */
global class Math {
    /**
     * Returns the mathematical constant e, which is the base of natural logarithms.
     * <p>Double
     */
    global final static Double E;
    /**
     * Returns the mathematical constant pi, which is the ratio of the circumference of a circle to its diameter.
     * <p>Double
     */
    global final static Double PI;

    global Object Math() { return null; }

    /**
     * Returns the absolute value of the specified Decimal.
     */
    global static Decimal abs(Decimal x) { return 0.0; }

    /**
     * Returns the absolute value of the specified Double.
     */
    global static Double abs(Double x) { return 0.0; }

    /**
     * Returns the absolute value of the specified Integer.
     * <p>Example
     * Integer i = -42;
     * Integer i2 = math.abs(i);
     * system.assertEquals(i2, 42);
     */
    global static Integer abs(Integer x) { return 0; }

    /**
     * Returns the absolute value of the specified Long.
     */
    global static Long abs(Long x) { return 0L; }

    /**
     * Returns the arc cosine of an angle, in the range of 0.0 through pi.
     */
    global static Decimal acos(Decimal x) { return 0.0; }

    /**
     * Returns the arc cosine of an angle, in the range of 0.0 through pi.
     */
    global static Double acos(Double x) { return 0.0; }

    /**
     * Returns the arc sine of an angle, in the range of -pi/2 through pi/2.
     */
    global static Decimal asin(Decimal x) { return 0.0; }

    /**
     * Returns the arc sine of an angle, in the range of -pi/2 through pi/2.
     */
    global static Double asin(Double x) { return 0.0; }

    /**
     * Returns the arc tangent of an angle, in the range of -pi/2 through pi/2.
     */
    global static Decimal atan(Decimal x) { return 0.0; }

    /**
     * Returns the arc tangent of an angle, in the range of -pi/2 through pi/2.
     */
    global static Double atan(Double x) { return 0.0; }

    /**
     * Converts rectangular coordinates (xCoordinate and yCoordinate) to polar (r and theta). This method computes the phase theta by computing an arc tangent of xCoordinate/yCoordinate in the range of -pi to pi.
     */
    global static Decimal atan2(Decimal x, Decimal y) { return 0.0; }

    /**
     * Converts rectangular coordinates (xCoordinate and yCoordinate) to polar (r and theta). This method computes the phase theta by computing an arc tangent of xCoordinate/yCoordinate in the range of -pi to pi.
     */
    global static Double atan2(Double x, Double y) { return 0.0; }

    /**
     * Returns the cube root of the specified Decimal. The cube root of a negative value is the negative of the cube root of that value's magnitude.
     */
    global static Decimal cbrt(Decimal x) { return 0.0; }

    /**
     * Returns the cube root of the specified Double. The cube root of a negative value is the negative of the cube root of that value's magnitude.
     */
    global static Double cbrt(Double x) { return 0.0; }

    /**
     * Returns the smallest (closest to negative infinity) Decimal that is not less than the argument and is equal to a mathematical integer.
     */
    global static Decimal ceil(Decimal x) { return 0.0; }

    /**
     * Returns the smallest (closest to negative infinity) Double that is not less than the argument and is equal to a mathematical integer.
     */
    global static Double ceil(Double x) { return 0.0; }

    /**
     * Returns the trigonometric cosine of the angle specified by decimalAngle.
     */
    global static Decimal cos(Decimal x) { return 0.0; }

    /**
     * Returns the trigonometric cosine of the angle specified by doubleAngle.
     */
    global static Double cos(Double x) { return 0.0; }

    /**
     * Returns the hyperbolic cosine of decimalAngle. The hyperbolic cosine of d is defined to be (ex + e-x)/2 where e is Euler's number.
     */
    global static Decimal cosh(Decimal x) { return 0.0; }

    /**
     * Returns the hyperbolic cosine of doubleAngle. The hyperbolic cosine of d is defined to be (ex + e-x)/2 where e is Euler's number.
     */
    global static Double cosh(Double x) { return 0.0; }

    global virtual Boolean equals(Object o) { return false; }

    /**
     * Returns Euler's number e raised to the power of the specified Decimal.
     */
    global static Decimal exp(Decimal x) { return 0.0; }

    /**
     * Returns Euler's number e raised to the power of the specified Double.
     */
    global static Double exp(Double x) { return 0.0; }

    /**
     * Returns the largest (closest to positive infinity) Decimal that is not greater than the argument and is equal to a mathematical integer.
     */
    global static Decimal floor(Decimal x) { return 0.0; }

    /**
     * Returns the largest (closest to positive infinity) Double that is not greater than the argument and is equal to a mathematical integer.
     */
    global static Double floor(Double x) { return 0.0; }

    global virtual Integer hashCode() { return 0; }

    /**
     * Returns the natural logarithm (base e) of the specified Decimal.
     */
    global static Decimal log(Decimal x) { return 0.0; }

    /**
     * Returns the natural logarithm (base e) of the specified Double.
     */
    global static Double log(Double x) { return 0.0; }

    /**
     * Returns the logarithm (base 10) of the specified Decimal.
     */
    global static Decimal log10(Decimal x) { return 0.0; }

    /**
     * Returns the logarithm (base 10) of the specified Double.
     */
    global static Double log10(Double x) { return 0.0; }

    /**
     * Returns the larger of the two specified Decimals.
     * <p>Example
     * Decimal larger = math.max(12.3, 156.6);
     * system.assertEquals(larger, 156.6);
     */
    global static Decimal max(Decimal x, Decimal y) { return 0.0; }

    /**
     * Returns the larger of the two specified Doubles.
     */
    global static Double max(Double x, Double y) { return 0.0; }

    /**
     * Returns the larger of the two specified Integers.
     */
    global static Integer max(Integer x, Integer y) { return 0; }

    /**
     * Returns the larger of the two specified Longs.
     */
    global static Long max(Long x, Long y) { return 0L; }

    /**
     * Returns the smaller of the two specified Decimals.
     * <p>Example
     * Decimal smaller = math.min(12.3, 156.6);
     * system.assertEquals(smaller, 12.3);
     */
    global static Decimal min(Decimal x, Decimal y) { return 0.0; }

    /**
     * Returns the smaller of the two specified Doubles.
     */
    global static Double min(Double x, Double y) { return 0.0; }

    /**
     * Returns the smaller of the two specified Integers.
     */
    global static Integer min(Integer x, Integer y) { return 0; }

    /**
     * Returns the smaller of the two specified Longs.
     */
    global static Long min(Long x, Long y) { return 0L; }

    /**
     * Returns the remainder of integerValue1 divided by integerValue2.
     * <p>Example
     * Integer remainder = math.mod(12, 2);
     * system.assertEquals(remainder, 0);
     *
     * Integer remainder2 = math.mod(8, 3);
     * system.assertEquals(remainder2, 2);
     */
    global static Integer mod(Integer x, Integer y) { return 0; }

    /**
     * Returns the remainder of longValue1 divided by longValue2.
     */
    global static Long mod(Long x, Long y) { return 0L; }

    /**
     * Returns the value of the first Double raised to the power of exponent.
     */
    global static Double pow(Double base, Double exp) { return 0.0; }

    /**
     * Returns a positive Double that is greater than or equal to 0.0 and less than 1.0.
     */
    global static Double random() { return 0.0; }

    /**
     * Returns the value that is closest in value to decimalValue and is equal to a mathematical integer.
     */
    global static Decimal rint(Decimal x) { return 0.0; }

    /**
     * Returns the value that is closest in value to doubleValue and is equal to a mathematical integer.
     */
    global static Double rint(Double x) { return 0.0; }

    /**
     * Returns the rounded approximation of this Decimal. The number is rounded to zero decimal places using half-even rounding mode, that is, it rounds towards the “nearest neighbor” unless both neighbors are equidistant, in which case, this mode rounds towards the even neighbor. If the result is less than -2,147,483,648 or greater than 2,147,483,647, Apex generates an error.
     * <p>Usage
     * Note that this rounding mode statistically minimizes cumulative error when applied repeatedly over a sequence of calculations.
     * <p>Example
     * Decimal d1 = 4.5;
     * Integer i1 = Math.round(d1);
     * System.assertEquals(4, i1);
     *
     * Decimal d2 = 5.5;
     * Integer i2 = Math.round(d2);
     * System.assertEquals(6, i2);
     */
    global static Integer round(Decimal x) { return 0; }

    /**
     * Do not use. This method is deprecated as of the Winter '08 release. Instead, use Math.roundToLong. Returns the closest Integer to the specified Double. If the result is less than -2,147,483,648 or greater than 2,147,483,647, Apex generates an error.
     */
    global static Integer round(Double x) { return 0; }

    /**
     * Returns the rounded approximation of this Decimal. The number is rounded to zero decimal places using half-even rounding mode, that is, it rounds towards the “nearest neighbor” unless both neighbors are equidistant, in which case, this mode rounds towards the even neighbor.
     * <p>Usage
     * Note that this rounding mode statistically minimizes cumulative error when applied repeatedly over a sequence of calculations.
     * <p>Example
     * Decimal d1 = 4.5;
     * Long i1 = Math.roundToLong(d1);
     * System.assertEquals(4, i1);
     *
     * Decimal d2 = 5.5;
     * Long i2 = Math.roundToLong(d2);
     * System.assertEquals(6, i2);
     */
    global static Long roundToLong(Decimal x) { return 0L; }

    /**
     * Returns the closest Long to the specified Double.
     */
    global static Long roundToLong(Double x) { return 0L; }

    /**
     * Returns the signum function of the specified Decimal, which is 0 if decimalValue is 0, 1.0 if decimalValue is greater than 0, -1.0 if decimalValue is less than 0.
     */
    global static Decimal signum(Decimal x) { return 0.0; }

    /**
     * Returns the signum function of the specified Double, which is 0 if doubleValue is 0, 1.0 if doubleValue is greater than 0, -1.0 if doubleValue is less than 0.
     */
    global static Double signum(Double x) { return 0.0; }

    /**
     * Returns the trigonometric sine of the angle specified by decimalAngle.
     */
    global static Decimal sin(Decimal x) { return 0.0; }

    /**
     * Returns the trigonometric sine of the angle specified by doubleAngle.
     */
    global static Double sin(Double x) { return 0.0; }

    /**
     * Returns the hyperbolic sine of decimalAngle. The hyperbolic sine of decimalAngle is defined to be (ex - e-x)/2 where e is Euler's number.
     */
    global static Decimal sinh(Decimal x) { return 0.0; }

    /**
     * Returns the hyperbolic sine of doubleAngle. The hyperbolic sine of doubleAngle is defined to be (ex - e-x)/2 where e is Euler's number.
     */
    global static Double sinh(Double x) { return 0.0; }

    /**
     * Returns the correctly rounded positive square root of decimalValue.
     */
    global static Decimal sqrt(Decimal x) { return 0.0; }

    /**
     * Returns the correctly rounded positive square root of doubleValue.
     */
    global static Double sqrt(Double x) { return 0.0; }

    /**
     * Returns the trigonometric tangent of the angle specified by decimalAngle.
     */
    global static Decimal tan(Decimal x) { return 0.0; }

    /**
     * Returns the trigonometric tangent of the angle specified by doubleAngle.
     */
    global static Double tan(Double x) { return 0.0; }

    /**
     * Returns the hyperbolic tangent of decimalAngle. The hyperbolic tangent of decimalAngle is defined to be (ex - e-x)/(ex + e-x) where e is Euler's number. In other words, it is equivalent to sinh(x)/cosinh(x). The absolute value of the exact tanh is always less than 1.
     */
    global static Decimal tanh(Decimal x) { return 0.0; }

    /**
     * Returns the hyperbolic tangent of doubleAngle. The hyperbolic tangent of doubleAngle is defined to be (ex - e-x)/(ex + e-x) where e is Euler's number. In other words, it is equivalent to sinh(x)/cosinh(x). The absolute value of the exact tanh is always less than 1.
     */
    global static Double tanh(Double x) { return 0.0; }

    global override virtual String toString() { return null; }
}