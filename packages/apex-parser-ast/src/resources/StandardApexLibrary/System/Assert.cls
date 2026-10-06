/**
 * Contains methods to assert various conditions with test methods, such as whether two values are the same, a condition is true, or a variable is null.
 */
global class Assert {
    global Assert() { }

    /**
     * Asserts that the two arguments are the same.
     * Usage
     * If the two arguments aren't the same, a fatal error is returned that causes code execution to halt.
     * You can’t catch an assertion failure using a try/catch block even though it’s logged as an exception.
     * Example
     * String sub = 'abcde'.substring(2);
     * Assert.areEqual('cde', sub); // Succeeds
     */
    global static void areEqual(Object expected, Object actual) { }

    /**
     * Asserts that the first two arguments are the same.
     * Usage
     * If the first two arguments aren't the same, a fatal error is returned that causes code execution to halt.
     * You can’t catch an assertion failure using a try/catch block even though it’s logged as an exception.
     * Example
     * String sub = 'abcde'.substring(2);
     * Assert.areEqual('cde', sub, 'Expected characters after first two'); // Succeeds
     */
    global static void areEqual(Object expected, Object actual, String msg) { }

    /**
     * Asserts that the two arguments aren’t the same.
     * Usage
     * If the two arguments are the same, a fatal error is returned that causes code execution to halt.
     * You can’t catch an assertion failure using a try/catch block even though it’s logged as an exception.
     * Example
     * String sub = 'abcde'.substring(2);
     * Assert.areNotEqual('xyz', sub); // Succeeds
     */
    global static void areNotEqual(Object notExpected, Object actual) { }

    /**
     * Asserts that the first two arguments aren’t the same.
     * Usage
     * If the first two arguments are the same, a fatal error is returned that causes code execution to halt.
     * You can’t catch an assertion failure using a try/catch block even though it’s logged as an exception.
     * Example
     * String sub = 'abcde'.substring(2);
     * Assert.areNotEqual('xyz', sub, 'Characters not expected after first two'); // Succeeds
     */
    global static void areNotEqual(Object notExpected, Object actual, String msg) { }

    global virtual Boolean equals(Object o) { return false; }

    /**
     * Immediately return a fatal error that causes code execution to halt.
     * Usage
     * Commonly used in a try/catch block test case where an exception is expected to be thrown. You can’t, however, catch the assertion failure in the try/catch block even though it’s logged as an exception.
     * Example
     * // test case where exception is expected
     * try {
     *     SomeClass.methodUnderTest();
     *     Assert.fail();
     * } catch (DmlException ex) {
     *     // Add assertions here about the expected exception
     * }
     */
    global static void fail() { }

    /**
     * Immediately return a fatal error that causes code execution to halt.
     * Usage
     * Commonly used in a try/catch block test case where an exception is expected to be thrown. You can’t, however, catch the assertion failure in the try/catch block even though it’s logged as an exception.
     * Example
     * // test case where exception is expected
     * try {
     *     SomeClass.methodUnderTest();
     *     Assert.fail('DmlException Expected');
     * } catch (DmlException ex) {
     *     // Add assertions here about the expected exception
     * }
     */
    global static void fail(String msg) { }

    global virtual Integer hashCode() { return 0; }

    /**
     * Asserts that the specified condition is false.
     * Usage
     * If the condition is true, a fatal error is returned that causes code execution to halt.
     * You can’t catch an assertion failure using a try/catch block even though it’s logged as an exception.
     * Example
     * Boolean containsCode = 'Salesforce'.contains('code');
     * Assert.isFalse(containsCode); // Assertion succeeds
     */
    global static void isFalse(Boolean condition) { }

    /**
     * Asserts that the specified condition is false.
     * Usage
     * If the condition is true, a fatal error is returned that causes code execution to halt.
     * You can’t catch an assertion failure using a try/catch block even though it’s logged as an exception.
     * Example
     * Boolean containsCode = 'Salesforce'.contains('code');
     * Assert.isFalse(containsCode, 'No code'); // Assertion succeeds
     */
    global static void isFalse(Boolean condition, String msg) { }

    /**
     * Asserts that the instance is of the specified type.
     * Usage
     * If the instance isn't of the specified type, a fatal error is returned that causes code execution to halt.
     * You can’t catch an assertion failure using a try/catch block even though it’s logged as an exception.
     * Example
     * Account o = new Account();
     * Assert.isInstanceOfType(o, Account.class); // Succeeds
     * Account o = new Account();
     * Assert.isInstanceOfType(o, Account.class, 'Expected type.'); // Succeeds
     */
    global static void isInstanceOfType(Object instance, System.Type expectedType) { }

    /**
     * Asserts that the instance is of the specified type.
     * Usage
     * If the instance isn't of the specified type, a fatal error is returned that causes code execution to halt.
     * You can’t catch an assertion failure using a try/catch block even though it’s logged as an exception.
     * Example
     * Account o = new Account();
     * Assert.isInstanceOfType(o, Account.class); // Succeeds
     */
    global static void isInstanceOfType(Object instance, System.Type expectedType, String msg) { }

    /**
     * Asserts that the instance isn’t of the specified type.
     * Usage
     * If the instance is of the specified type, a fatal error is returned that causes code execution to halt.
     * You can’t catch an assertion failure using a try/catch block even though it’s logged as an exception.
     * Example
     * Contact con = new Contact();
     * Assert.isNotInstanceOfType(con, Account.class); // Succeeds
     */
    global static void isNotInstanceOfType(Object instance, System.Type notExpectedType) { }

    /**
     * Asserts that the instance isn’t of the specified type.
     * Usage
     * If the instance is of the specified type, a fatal error is returned that causes code execution to halt.
     * You can’t catch an assertion failure using a try/catch block even though it’s logged as an exception.
     * Example
     * Contact con = new Contact();
     * Assert.isNotInstanceOfType(con, Account.class, 'Not expected type'); // Succeeds
     */
    global static void isNotInstanceOfType(Object instance, System.Type notExpectedType, String msg) { }

    /**
     * Asserts that the value isn’t null.
     * Usage
     * If the value is null, a fatal error is returned that causes code execution to halt.
     * You can’t catch an assertion failure using a try/catch block even though it’s logged as an exception.
     * Example
     * String myString = 'value';
     * Assert.isNotNull(myString); // Succeeds
     */
    global static void isNotNull(Object value) { }

    /**
     * Asserts that the value isn’t null.
     * Usage
     * If the value is null, a fatal error is returned that causes code execution to halt.
     * You can’t catch an assertion failure using a try/catch block even though it’s logged as an exception.
     * Example
     * String myString = 'value';
     * Assert.isNotNull(myString, 'myString should not be null'); // Succeeds
     */
    global static void isNotNull(Object value, String msg) { }

    /**
     * Asserts that the value is null.
     * Usage
     * If the value isn't null, a fatal error is returned that causes code execution to halt.
     * You can’t catch an assertion failure using a try/catch block even though it’s logged as an exception.
     * Example
     * String myString = null;
     * Assert.isNull(myString); // Succeeds
     */
    global static void isNull(Object value) { }

    /**
     * Asserts that the value is null.
     * Usage
     * If the value isn't null, a fatal error is returned that causes code execution to halt.
     * You can’t catch an assertion failure using a try/catch block even though it’s logged as an exception.
     * Example
     * String myString = null;
     * Assert.isNull(myString, 'String should be null'); // Succeeds
     */
    global static void isNull(Object value, String msg) { }

    /**
     * Asserts that the specified condition is true.
     * Usage
     * If the specified condition is false, a fatal error is returned that causes code execution to halt.
     * You can’t catch an assertion failure using a try/catch block even though it’s logged as an exception.
     * Example
     * Boolean containsForce = 'Salesforce'.contains('force');
     * Assert.isTrue(containsForce); // Assertion succeeds
     */
    global static void isTrue(Boolean condition) { }

    /**
     * Asserts that the specified condition is true.
     * Usage
     * If the specified condition is false, a fatal error is returned that causes code execution to halt.
     * You can’t catch an assertion failure using a try/catch block even though it’s logged as an exception.
     * Example
     * Boolean containsForce = 'Salesforce'.contains('force');
     * Assert.isTrue(containsForce, 'Contains force'); // Assertion succeeds
     */
    global static void isTrue(Boolean condition, String msg) { }

    global override virtual String toString() { return null; }
}