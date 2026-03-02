/**
 * Describes a column on a DataSource.Table . This class extends the DataSourceUtil class and inherits its methods.
 */
public class Column {

  /**
   * Returns a new column of data type BOOLEAN_TYPE .
   * @param name Name of the column.
   * @return DataSource.Column
   */
  public static DataSource.Column boolean(String name) {}

  /**
   * Returns a new column of data type EXTERNAL_LOOKUP_TYPE .
   * @param name Name of the column.
   * @param domain API name of the parent object in the external lookup relationship.
   * @return DataSource.Column
   */
  public static DataSource.Column externalLookup(String name, String domain) {}

  /**
   * Returns a new column with the ten specified Column property values.
   * @param name 
   * @param label 
   * @param description 
   * @param isSortable 
   * @param isFilterable 
   * @param type 
   * @param length 
   * @param decimalPlaces 
   * @param referenceTo 
   * @param referenceTargetField 
   * @return DataSource.Column
   */
  public static DataSource.Column get(String name, String label, String description, Boolean isSortable, Boolean isFilterable, DataSource.DataType type, Integer length, Integer decimalPlaces, String referenceTo, String referenceTargetField) {}

  /**
   * Returns a new column with the ten specified Column property values.
   * @param name 
   * @param label 
   * @param description 
   * @param isSortable 
   * @param isFilterable 
   * @param type 
   * @param length 
   * @param decimalPlaces 
   * @return DataSource.Column
   */
  public static DataSource.Column get(String name, String label, String description, Boolean isSortable, Boolean isFilterable, DataSource.DataType type, Integer length, Integer decimalPlaces) {}

  /**
   * Returns a new column with the ten specified Column property values.
   * @param name 
   * @param label 
   * @param description 
   * @param isSortable 
   * @param isFilterable 
   * @param type 
   * @param length 
   * @return DataSource.Column
   */
  public static DataSource.Column get(String name, String label, String description, Boolean isSortable, Boolean isFilterable, DataSource.DataType type, Integer length) {}

  /**
   * Returns a new column of data type INDIRECT_LOOKUP_TYPE .
   * @param name Name of the column.
   * @param domain API name of the parent object in the indirect lookup relationship.
   * @param targetField API name of the custom field on the parent object whose values are compared against this column’s values. Matching values identify related records in an indirect lookup relationship.
   * @return DataSource.Column
   */
  public static DataSource.Column indirectLookup(String name, String domain, String targetField) {}

  /**
   * Returns a new numeric column with no decimal places using the specified name and length.
   * @param name The column name.
   * @param length The column length.
   * @return DataSource.Column
   */
  public static DataSource.Column integer(String name, Integer length) {}

  /**
   * Returns a new column of data type LOOKUP_TYPE .
   * @param name Name of the column.
   * @param domain API name of the parent object in the lookup relationship.
   * @return DataSource.Column
   */
  public static DataSource.Column lookup(String name, String domain) {}

  /**
   * Returns a new column of data type NUMBER_TYPE .
   * @param name 
   * @param length 
   * @param decimalPlaces 
   * @return DataSource.Column
   */
  public static DataSource.Column number(String name, Integer length, Integer decimalPlaces) {}

  /**
   * Returns a new column of data type STRING_SHORT_TYPE or STRING_LONG_TYPE , with the specified name, label, and length.
   * @param name Name of the column.
   * @param label User-friendly name for the column that appears in the Salesforce user interface.
   * @param length Number of characters allowed in the column.
   * @return DataSource.Column
   */
  public static DataSource.Column text(String name, String label, Integer length) {}

  /**
   * Returns a new column of data type STRING_SHORT_TYPE or STRING_LONG_TYPE , with the specified name, label, and length.
   * @param name Name of the column.
   * @param length Number of characters allowed in the column.
   * @return DataSource.Column
   */
  public static DataSource.Column text(String name, Integer length) {}

  /**
   * Returns a new column of data type STRING_SHORT_TYPE or STRING_LONG_TYPE , with the specified name, label, and length.
   * @param name Name of the column.
   * @return DataSource.Column
   */
  public static DataSource.Column text(String name) {}

  /**
   * Returns a new column of data type STRING_LONG_TYPE with the specified name and the length of 32,000 characters.
   * @param name Name of the column.
   * @return DataSource.Column
   */
  public static DataSource.Column textarea(String name) {}

  /**
   * Returns a new column of data type URL_TYPE with the specified name and length.
   * @param name Name of the column.
   * @param length Number of characters allowed in the column.
   * @return DataSource.Column
   */
  public static DataSource.Column url(String name, Integer length) {}

  /**
   * Returns a new column of data type URL_TYPE with the specified name and length.
   * @param name Name of the column.
   * @return DataSource.Column
   */
  public static DataSource.Column url(String name) {}

}