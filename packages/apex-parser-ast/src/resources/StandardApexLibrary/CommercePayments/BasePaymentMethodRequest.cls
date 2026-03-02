/**
 * Abstract class for storing information about payment methods.
 */
public class BasePaymentMethodRequest {

  /**
   * Maintains the integrity of lists of type BasePaymentMethodRequest by determining the equality of external objects in a list. This method is dynamic and based on the equals method in Java.
   * @param obj External object whose key is to be validated.
   * @return Boolean
   */
  public Boolean equals(Object obj) {}

  /**
   * Maintains the integrity of lists of type BasePaymentMethodRequest by determining the uniqueness of the external object records in a list.
   * @return Integer
   */
  public Integer hashCode() {}

  /**
   * Converts a date to a string.
   * @return String
   */
  public String toString() {}

}