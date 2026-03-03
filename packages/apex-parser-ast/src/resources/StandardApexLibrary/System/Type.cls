/**
 * Contains methods for getting the Apex type that corresponds to an Apex class and for instantiating new types.
 */
global class Type {

  /**
   * Returns true if the specified type is equal to the current type; otherwise, returns false .
   * @param typeToCompare The type to compare with the current type.
   * @return Boolean
   */
  public Boolean equals(Object typeToCompare) {}

  /**
   * Returns the type that corresponds to the specified fully qualified class name.
   * @param fullyQualifiedName The fully qualified name of the class to get the type of. The fully qualified class name contains the namespace name, for example, MyNamespace.ClassName .
   * @return System.Type
   */
  public static System.Type forName(String fullyQualifiedName) {}

  /**
   * Returns the type that corresponds to the specified fully qualified class name.
   * @param namespace 
   * @param name 
   * @return System.Type
   */
  public static System.Type forName(String namespace, String name) {}

  /**
   * Returns the name of the current type.
   * @return String
   */
  public String getName() {}

  /**
   * Returns a hash code value for the current type.
   * @return Integer
   */
  public Integer hashCode() {}

  /**
   * Returns true if an object reference of the specified type can be assigned from the child type; otherwise, returns false .
   * @param sourceType 
   * @return Boolean
   */
  public Boolean isAssignableFrom(Type sourceType) {}

  /**
   * Creates an instance of the current type and returns this new instance.
   * @return Object
   */
  public Object newInstance() {}

  /**
   * Returns a string representation of the current type, which is the type name.
   * @return String
   */
  public String toString() {}

}