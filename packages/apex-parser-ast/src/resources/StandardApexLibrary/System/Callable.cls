/**
 * Enables developers to use a common interface to build loosely coupled integrations between Apex classes or triggers, even for code in separate packages. Agreeing upon a common interface enables developers from different companies or different departments to build upon one another’s solutions. Implement this interface to enable the broader community, which might have different solutions than the ones you had in mind, to extend your code’s functionality.
 * <p>Note
 * This interface is not an analog of the Java Callable interface, which is used for asynchronous invocation. Don’t confuse the two.
 * <p>Usage
 * To implement the Callable interface, you need to write only one method: call(String action, Map<String, Object> args).
 * In code that utilizes or tests an implementation of Callable, cast an instance of your type to Callable.
 * This interface is not intended to replace defining more specific interfaces. Rather, the Callable interface allows integrations in which code from different classes or packages can use common base types.
 */
global interface Callable {
    /**
     * Provides functionality that other classes or packages can utilize and build upon.
     * @return Object The result of the method invocation.
     */
    abstract Object call(String action, Map args);

    virtual Boolean equals(Object arg0);

    virtual Integer hashCode();

    virtual String toString();
}