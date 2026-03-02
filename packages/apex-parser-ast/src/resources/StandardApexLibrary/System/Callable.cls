/**
 * Enables developers to use a common interface to build loosely coupled integrations between Apex classes or triggers, even for code in separate packages. Agreeing upon a common interface enables developers from different companies or different departments to build upon one another’s solutions. Implement this interface to enable the broader community, which might have different solutions than the ones you had in mind, to extend your code’s functionality.
 */
public interface Callable {

  /**
   * Provides functionality that other classes or packages can utilize and build upon.
   * @param action The behavior for the method to exhibit.
   * @param String 
   * @param args Arguments to be used by the specified action.
   * @return Object
   */
  Object call(String action, Map< String, Object > args);

}