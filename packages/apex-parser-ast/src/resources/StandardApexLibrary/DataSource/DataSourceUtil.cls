/**
 * Parent class for the DataSource.Provider, DataSource.Connection, DataSource.Table, and DataSource.Column classes.
 */
global abstract class DataSourceUtil {
    global DataSourceUtil() { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    /**
     * Logs the error message in the debug log.
     */
    global void logWarning(String msg) { }

    /**
     * Throws a DataSourceException and displays the provided message to the user.
     */
    global void throwException(String msg) { }

    global override virtual String toString() { return null; }
}