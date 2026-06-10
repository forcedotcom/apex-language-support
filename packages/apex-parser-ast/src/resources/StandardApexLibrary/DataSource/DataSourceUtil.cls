/**
 * Parent class for the DataSource.Provider , DataSource.Connection , DataSource.Table , and DataSource.Column classes.
 */
global class DataSourceUtil {

  global DataSourceUtil() {}

  /**
   * Logs the error message in the debug log.
   * @param message The error message.
   */
  global void logWarning(String message) {}

  /**
   * Throws a DataSourceException and displays the provided message to the user.
   * @param message Error message to display to the user.
   */
  global void throwException(String message) {}

  global Object clone() {}

}