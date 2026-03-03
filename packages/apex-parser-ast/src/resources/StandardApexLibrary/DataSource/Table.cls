/**
 * Describes a table on an external system that the Salesforce Connect custom adapter connects to. This class extends the DataSourceUtil class and inherits its methods.
 */
global class Table {

  /**
   * Returns the table metadata with the specified parameter values.
   * @param name Name of the external table.
   * @param labelSingular Singular form of the user-friendly name for the table. The labelSingular becomes the object label in the Salesforce user interface.
   * @param labelPlural Plural form of the user-friendly name for the table. The labelPlural becomes the object’s plural label in the Salesforce user interface.
   * @param description Description of the external table.
   * @param nameColumn Name of the table column that becomes the name field of the external object when the administrator syncs the table.
   * @param columns List of table columns.
   * @return DataSource.Table
   */
  public static DataSource.Table get(String name, String labelSingular, String labelPlural, String description, String nameColumn, List<DataSource.Column> columns) {}

  /**
   * Returns the table metadata with the specified parameter values.
   * @param name Name of the external table.
   * @param nameColumn Name of the table column that becomes the name field of the external object when the administrator syncs the table.
   * @param columns List of table columns.
   * @return DataSource.Table
   */
  public static DataSource.Table get(String name, String nameColumn, List<DataSource.Column> columns) {}

}