/**
 * The result of the emptyRecycleBin DML operation returned by the Database.emptyRecycleBin method.
 */
global class EmptyRecycleBinResult {

  global EmptyRecycleBinResult() {}

  /**
   * If an error occurred during the delete for this record or sObject, returns a list of one or more Database.Error objects. If no errors occurred, the returned list is empty.
   * @return Database.Errors[]
   */
  global Database.Errors[] getErrors() {}

  /**
   * Returns the ID of the record or sObject you attempted to delete.
   * @return ID
   */
  global ID getId() {}

  /**
   * Returns true if the record or sObject was successfully removed from the Recycle Bin; otherwise false .
   * @return Boolean
   */
  global Boolean isSuccess() {}

  global Object clone() {}

}