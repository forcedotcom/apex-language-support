/**
 * Describes a table on an external system that the Salesforce Connect custom adapter connects to. This class extends the DataSourceUtil class and inherits its methods.
 * <p>Usage
 * A list of table metadata is provided by the DataSource.Connection class when the sync() method is invoked. Each table can become an external object in Salesforce.
 * The metadata is stored in Salesforce. Updating the Apex code to return new or updated values for the table metadata doesn’t automatically update the stored metadata in Salesforce.
 */
global class Table extends DataSource.DataSourceUtil {
    /**
     * List of table columns.
     * <p>List<DataSource.Column>
     */
    global List columns { get; set; }
    /**
     * Description of what the table represents.
     * <p>String
     */
    global String description { get; set; }
    /**
     * Plural form of the user-friendly name for the table. The labelPlural becomes the object’s plural label in the Salesforce user interface.
     * <p>String
     */
    global String labelPlural { get; set; }
    /**
     * Singular form of the user-friendly name for the table. The labelSingular becomes the object label in the Salesforce user interface. We recommend that you make object labels unique across all standard, custom, and external objects in the org.
     * <p>String
     */
    global String labelSingular { get; set; }
    /**
     * Name of the table on the external system.
     * <p>String
     */
    global String name { get; set; }
    /**
     * Name of the table column that becomes the name field of the external object when the administrator syncs the table.
     * <p>String
     */
    global String nameColumn { get; set; }

    global Object Table() { return null; }

    global Boolean equals(Object obj) { return false; }

    /**
     * Returns the table metadata with the specified parameter values, using the name for the labels and description.
     * @return The returned table metadata has these property values.
     * Property Value
     * name name
     * labelSingular name
     * labelPlural name
     * description name
     * nameColumn nameColumn
     * columns columns
     */
    global static DataSource.Table get(String name, String nameColumn, List columns) { return null; }

    /**
     * Returns the table metadata with the specified parameter values.
     */
    global static DataSource.Table get(String name, String labelSingular, String labelPlural, String description, String nameColumn, List columns) { return null; }

    global Integer hashCode() { return 0; }

    global void logWarning(String msg) { }

    global void throwException(String msg) { }

    global override virtual String toString() { return null; }
}