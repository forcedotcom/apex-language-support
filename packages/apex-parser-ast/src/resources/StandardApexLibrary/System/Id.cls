/**
 * Contains methods for the ID primitive data type.
 */
global class Id {

  /**
   * Marks a trigger record with a custom error message and prevents any DML operation from occurring.
   * @param errorMsg The error message to mark the record with.
   */
  public void addError(String errorMsg) {}

  /**
   * Marks a trigger record with a custom error message and prevents any DML operation from occurring.
   * @param errorMsg The error message to mark the record with.
   * @param escape 
   */
  public void addError(String errorMsg, Boolean escape) {}

  /**
   * Marks a trigger record with a custom error message and prevents any DML operation from occurring.
   * @param exceptionError 
   */
  public void addError(Exception exceptionError) {}

  /**
   * Marks a trigger record with a custom error message and prevents any DML operation from occurring.
   * @param exceptionError 
   * @param escape 
   */
  public void addError(Exception exceptionError, Boolean escape) {}

  /**
   * Returns the token for the sObject corresponding to this ID. This method is primarily used with describe information.
   * @return Schema.SObjectType
   */
  public Schema.SObjectType getSObjectType() {}

  /**
   * Converts an 18-character Id value to a 15-character case-sensitive string.
   * @return string
   */
  public static string to15() {}

  /**
   * Converts the specified String into an ID and returns the ID.
   * @param toID 
   * @return ID
   */
  public static ID valueOf(String toID) {}

  /**
   * Converts the specified String into an ID and returns the ID.
   * @param str 
   * @param restoreCasing 
   * @return Id
   */
  public static Id valueOf(String str, Boolean restoreCasing) {}

}