/**
 * Parent class for the DataSource.Provider , DataSource.Connection , DataSource.Table , and DataSource.Column classes.
 */
public class DataSourceUtil {

  /**
   * Logs the error message in the debug log.
   * @param message The error message.
   */
  public void logWarning(String message) {}

  /**
   * Throws a DataSourceException and displays the provided message to the user.
   * @param message Error message to display to the user.
   */
  public void throwException(String message) {}

}