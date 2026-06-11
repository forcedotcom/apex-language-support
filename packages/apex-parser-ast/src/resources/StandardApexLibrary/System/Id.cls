/**
 * Contains methods for the ID primitive data type.
 */
global class Id {

  global Id() {}

  /**
   * Marks a trigger record with a custom error message and prevents any DML operation from occurring.
   * @param errorMsg The error message to mark the record with.
   */
  global void addError(String errorMsg) {}

  /**
   * Marks a trigger record with a custom error message and prevents any DML operation from occurring.
   * @param errorMsg The error message to mark the record with.
   * @param escape 
   */
  global void addError(String errorMsg, Boolean escape) {}

  /**
   * Marks a trigger record with a custom error message and prevents any DML operation from occurring.
   * @param exceptionError 
   */
  global void addError(Exception exceptionError) {}

  /**
   * Marks a trigger record with a custom error message and prevents any DML operation from occurring.
   * @param exceptionError 
   * @param escape 
   */
  global void addError(Exception exceptionError, Boolean escape) {}

  /**
   * Returns the token for the sObject corresponding to this ID. This method is primarily used with describe information.
   * @return Schema.SObjectType
   */
  global Schema.SObjectType getSObjectType() {}

  /**
   * Converts an 18-character Id value to a 15-character case-sensitive string.
   * @return string
   */
  global static string to15() {}

  /**
   * Converts the specified String into an ID and returns the ID.
   * @param toID 
   * @return ID
   */
  global static ID valueOf(String toID) {}

  /**
   * Converts the specified String into an ID and returns the ID.
   * @param str 
   * @param restoreCasing 
   * @return Id
   */
  global static Id valueOf(String str, Boolean restoreCasing) {}

  global Object clone() {}

}