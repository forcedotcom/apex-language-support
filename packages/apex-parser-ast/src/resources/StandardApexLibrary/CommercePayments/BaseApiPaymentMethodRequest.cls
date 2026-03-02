/**
 * Abstract class used to send information about a payment method to a gateway adapter during a service call.
 */
public class BaseApiPaymentMethodRequest {

  /**
   * Maintains the integrity of lists of type BaseApiPaymentMethodRequest by determining the equality of external objects in a list. This method is dynamic and is based on the equals method in Java.
   * @param obj External object whose key is to be validated.
   * @return Boolean
   */
  public Boolean equals(Object obj) {}

  /**
   * Maintains the integrity of lists of type BaseApiPaymentMethodRequest by determining the uniqueness of the external object records in a list.
   * @return Integer
   */
  public Integer hashCode() {}

  /**
   * Converts a date to a string.
   * @return String
   */
  public String toString() {}

}