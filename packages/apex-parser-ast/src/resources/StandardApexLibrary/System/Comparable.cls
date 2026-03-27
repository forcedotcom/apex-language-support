/**
 * Adds sorting support for Lists that contain non-primitive types, that is, Lists of user-defined types. Your implementation must explicitly handle null inputs in the compareTo() method to avoid a null pointer exception.
 */
global interface Comparable {

  /**
   * Returns an Integer value that is the result of the comparison.
   * @param objectToCompareTo 
   * @return Integer
   */
  Integer compareTo(Object objectToCompareTo);

}