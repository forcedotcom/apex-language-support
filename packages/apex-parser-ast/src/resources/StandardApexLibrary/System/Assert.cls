/**
 * Contains methods to assert various conditions with test methods, such as whether two values are the same, a condition is true, or a variable is null.
 */
global class Assert {

  /**
   * Asserts that the first two arguments are the same.
   * @param expected Expected value.
   * @param actual Actual value.
   * @param msg (Optional) Custom message returned as part of the error message.
   */
  public static void areEqual(Object expected, Object actual, String msg) {}

  /**
   * Asserts that the first two arguments are the same.
   * @param expected Expected value.
   * @param actual Actual value.
   */
  public static void areEqual(Object expected, Object actual) {}

  /**
   * Asserts that the first two arguments aren’t the same.
   * @param notExpected Value that’s not expected.
   * @param actual Actual value.
   * @param msg (Optional) Custom message returned as part of the error message.
   */
  public static void areNotEqual(Object notExpected, Object actual, String msg) {}

  /**
   * Asserts that the first two arguments aren’t the same.
   * @param notExpected Value that’s not expected.
   * @param actual Actual value.
   */
  public static void areNotEqual(Object notExpected, Object actual) {}

  /**
   * Immediately return a fatal error that causes code execution to halt.
   * @param msg (Optional) Custom message returned as part of the error message.
   */
  public static void fail(String msg) {}

  /**
   * Immediately return a fatal error that causes code execution to halt.
   */
  public static void fail() {}

  /**
   * Asserts that the specified condition is false .
   * @param condition Condition you’re checking to determine if it’s false .
   * @param msg (Optional) Custom message returned as part of the error message.
   */
  public static void isFalse(Boolean condition, String msg) {}

  /**
   * Asserts that the specified condition is false .
   * @param condition Condition you’re checking to determine if it’s false .
   */
  public static void isFalse(Boolean condition) {}

  /**
   * Asserts that the instance is of the specified type.
   * @param instance Instance whose type you're checking.
   * @param expectedType Expected type.
   * @param msg (Optional) Custom message returned as part of the error message.
   */
  public static void isInstanceOfType(Object instance, System.Type expectedType, String msg) {}

  /**
   * Asserts that the instance is of the specified type.
   * @param instance Instance whose type you're checking.
   * @param expectedType Expected type.
   */
  public static void isInstanceOfType(Object instance, System.Type expectedType) {}

  /**
   * Asserts that the instance isn’t of the specified type.
   * @param instance Instance whose type you're checking.
   * @param notExpectedType Type that's not expected.
   * @param msg (Optional) Custom message returned as part of the error message.
   */
  public static void isNotInstanceOfType(Object instance, System.Type notExpectedType, String msg) {}

  /**
   * Asserts that the instance isn’t of the specified type.
   * @param instance Instance whose type you're checking.
   * @param notExpectedType Type that's not expected.
   */
  public static void isNotInstanceOfType(Object instance, System.Type notExpectedType) {}

  /**
   * Asserts that the value isn’t null.
   * @param value Value you’re checking to determine if it’s not null.
   * @param msg (Optional) Custom message returned as part of the error message.
   */
  public static void isNotNull(Object value, String msg) {}

  /**
   * Asserts that the value isn’t null.
   * @param value Value you’re checking to determine if it’s not null.
   */
  public static void isNotNull(Object value) {}

  /**
   * Asserts that the value is null.
   * @param value Value you’re checking to determine if it’s null.
   * @param msg (Optional) Custom message returned as part of the error message.
   */
  public static void isNull(Object value, String msg) {}

  /**
   * Asserts that the value is null.
   * @param value Value you’re checking to determine if it’s null.
   */
  public static void isNull(Object value) {}

  /**
   * Asserts that the specified condition is true .
   * @param condition Condition you’re checking to determine if it’s true .
   * @param msg (Optional) Custom message returned as part of the error message.
   */
  public static void isTrue(Boolean condition, String msg) {}

  /**
   * Asserts that the specified condition is true .
   * @param condition Condition you’re checking to determine if it’s true .
   */
  public static void isTrue(Boolean condition) {}

}