/**
 * Describes a column on a DataSource.Table. This class extends the DataSourceUtil class and inherits its methods.
 * <p>Usage
 * A list of column metadata is provided by the DataSource.Connection class when the sync() method is invoked. Each column can become a field on an external object.
 * The metadata is stored in Salesforce. Updating the Apex code to return new or updated values for the column metadata doesn’t automatically update the stored metadata in Salesforce.
 */
global virtual class Column extends DataSource.DataSourceUtil {
    /**
     * If the data type is numeric, the number of decimal places to the right of the decimal point.
     * <p>Integer
     */
    global Integer decimalPlaces { get; set; }
    /**
     * Description of what the column represents.
     * <p>String
     */
    global String description { get; set; }
    /**
     * Whether a result set can be filtered based on the values of the column.
     * <p>Boolean
     */
    global Boolean filterable { get; set; }
    /**
     * Returns true if the picklist is sorted alphabetically, false otherwise.
     * <p>Boolean
     */
    global Boolean isPicklistAlphabeticallySorted { get; set; }
    /**
     * Returns true if the picklist is restricted, false otherwise.
     * <p>Boolean
     */
    global Boolean isPicklistRestricted { get; set; }
    /**
     * User-friendly name for the column that appears in the Salesforce user interface.
     * <p>String
     */
    global String label { get; set; }
    /**
     * If the column is a string data type, the number of characters in the column. If the column is a numeric data type, the total number of digits on both sides of the decimal point, but excluding the decimal point.
     * <p>Integer
     */
    global Integer length { get; set; }
    /**
     * Name of the column in the external system.
     * <p>String
     */
    global String name { get; set; }
    /**
     * If the data type is a picklist, the picklist values.
     * <p>List<Map<String,String>>
     */
    global List picklistValues { get; set; }
    /**
     * API name of the custom field on the parent object whose values are compared against this column’s values. Matching values identify related records in an indirect lookup relationship. Applies only when the column’s data type is INDIRECT_LOOKUP_TYPE. For other data types, this value is ignored.
     * <p>String
     */
    global String referenceTargetField { get; set; }
    /**
     * API name of the parent object in the relationship that’s represented by this column. Applies only when the column’s data type is LOOKUP_TYPE, EXTERNAL_LOOKUP_TYPE, or INDIRECT_LOOKUP_TYPE. For other data types, this value is ignored.
     * <p>String
     */
    global String referenceTo { get; set; }
    /**
     * Whether a result set can be sorted based on the values of the column via an ORDER BY clause.
     * <p>Boolean
     */
    global Boolean sortable { get; set; }
    /**
     * Data type of the column.
     * <p>DataSource.DataType
     */
    global DataSource.DataType type { get; set; }

    global Object Column() { return null; }

    /**
     * Returns a new column of data type BOOLEAN_TYPE.
     */
    global static DataSource.Column boolean(String name) { return null; }

    /**
     * Returns a new column of data type CURRENCY_TYPE.
     */
    global static DataSource.Column currency(String name, Integer length, Integer decimalPlaces) { return null; }

    /**
     * Returns a new column of data type DATE_TYPE.
     */
    global static DataSource.Column date(String name) { return null; }

    /**
     * Returns a new column of data type DATETIME_TYPE.
     */
    global static DataSource.Column datetime(String name) { return null; }

    /**
     * Returns a new column of data type EMAIL_TYPE.
     */
    global static DataSource.Column email(String name) { return null; }

    global Boolean equals(Object obj) { return false; }

    /**
     * Returns a new column of data type EXTERNAL_LOOKUP_TYPE.
     * @return The returned column has these property values.
     * Property Value
     * name name
     * label name
     * description name
     * isSortable true
     * isFilterable true
     * type DataSource.DataType.EXTERNAL_LOOKUP_TYPE
     * length 255
     * decimalPlaces 0
     * referenceTo domain
     * referenceTargetField null
     */
    global static DataSource.Column externalLookup(String name, String domain) { return null; }

    /**
     * Returns a new column with the seven specified Column property values.
     */
    global static DataSource.Column get(String name, String label, String description, Boolean isSortable, Boolean isFilterable, DataSource.DataType type, Integer length) { return null; }

    /**
     * Returns a new column with the eight specified Column property values.
     */
    global static DataSource.Column get(String name, String label, String description, Boolean isSortable, Boolean isFilterable, DataSource.DataType type, Integer length, Integer decimalPlaces) { return null; }

    /**
     * Returns a new column with the ten specified Column property values.
     */
    global static DataSource.Column get(String name, String label, String description, Boolean isSortable, Boolean isFilterable, DataSource.DataType type, Integer length, Integer decimalPlaces, String referenceTo, String referenceTargetField) { return null; }

    /**
     * Returns a new column with the 13 specified Column property values.
     */
    global static DataSource.Column get(String name, String label, String description, Boolean isSortable, Boolean isFilterable, DataSource.DataType type, Integer length, Integer decimalPlaces, String referenceTo, String referenceTargetField, Object picklistValuesObj, Boolean isPicklistAlphabeticallySorted, Boolean isPicklistRestricted) { return null; }

    global Integer hashCode() { return 0; }

    /**
     * Returns a new column of data type INDIRECT_LOOKUP_TYPE.
     * @return The returned column has these property values.
     * Property Value
     * name name
     * label name
     * description name
     * isSortable true
     * isFilterable true
     * type DataSource.DataType.INDIRECT_LOOKUP_TYPE
     * length 255
     * decimalPlaces 0
     * referenceTo domain
     * referenceTargetField targetField
     */
    global static DataSource.Column indirectLookup(String name, String domain, String targetField) { return null; }

    /**
     * Returns a new numeric column with no decimal places using the specified name and length.
     */
    global static DataSource.Column integer(String name, Integer length) { return null; }

    global void logWarning(String msg) { }

    /**
     * Returns a new column of data type LOOKUP_TYPE.
     * @return The returned column has these property values.
     * Property Value
     * name name
     * label name
     * description name
     * isSortable true
     * isFilterable true
     * type DataSource.DataType.LOOKUP_TYPE
     * length 255
     * decimalPlaces 0
     * referenceTo domain
     * referenceTargetField null
     */
    global static DataSource.Column lookup(String name, String domain) { return null; }

    /**
     * Returns a new column of data type PICKLIST_MULTISELECT_TYPE with the specified name and picklist values.
     */
    global static DataSource.Column multipicklist(String name, List picklistValues) { return null; }

    /**
     * Returns a new column of data type PICKLIST_MULTISELECT_TYPE with the specified name and picklist values. You can also specify whether the picklist is sorted alphabetically or if the picklist is restricted.
     */
    global static DataSource.Column multipicklist(String name, List picklistValues, Boolean isPicklistAlphabeticallySorted, Boolean isPicklistRestricted) { return null; }

    /**
     * Returns a new column of data type NUMBER_TYPE.
     * @return The returned column has these property values.
     * Property Value
     * name name
     * label name
     * description name
     * isSortable true
     * isFilterable true
     * type DataSource.DataType.NUMBER_TYPE
     * length length
     * decimalPlaces decimalPlaces
     */
    global static DataSource.Column number(String name, Integer length, Integer decimalPlaces) { return null; }

    /**
     * Returns a new column of data type PERCENT_TYPE.
     */
    global static DataSource.Column percent(String name, Integer length, Integer decimalPlaces) { return null; }

    /**
     * Returns a new column of data type PHONE_TYPE.
     */
    global static DataSource.Column phone(String name) { return null; }

    /**
     * Returns a new column of data type PICKLIST_TYPE with the specified name and picklist values.
     */
    global static DataSource.Column picklist(String name, List picklistValues) { return null; }

    /**
     * Returns a new column of data type PICKLIST_TYPE with the specified name and picklist values. You can also specify whether the picklist is sorted alphabetically or if the picklist is restricted.
     */
    global static DataSource.Column picklist(String name, List picklistValues, Boolean isPicklistAlphabeticallySorted, Boolean isPicklistRestricted) { return null; }

    /**
     * Returns a new column of data type STRING_SHORT_TYPE with the specified name and the length of 255 characters.
     * @return The returned column has these property values.
     * Property Value
     * name name
     * label name
     * description name
     * isSortable true
     * isFilterable true
     * type DataSource.DataType.STRING_SHORT_TYPE
     * length 255
     * decimalPlaces 0
     */
    global static DataSource.Column text(String name) { return null; }

    /**
     * Returns a new column of data type STRING_SHORT_TYPE or STRING_LONG_TYPE, with the specified name and length.
     * @return The returned column has these property values.
     * Property Value
     * name name
     * label name
     * description name
     * isSortable true
     * isFilterable true
     * type DataSource.DataType.STRING_SHORT_TYPE if length is 255 or less
     * DataSource.DataType.STRING_LONG_TYPE if length is greater than 255
     * length length
     * decimalPlaces 0
     */
    global static DataSource.Column text(String name, Integer length) { return null; }

    /**
     * Returns a new column of data type STRING_SHORT_TYPE or STRING_LONG_TYPE, with the specified name, label, and length.
     * @return The returned column has these property values.
     * Property Value
     * name name
     * label label
     * description label
     * isSortable true
     * isFilterable true
     * type DataSource.DataType.STRING_SHORT_TYPE if length is 255 or less
     * DataSource.DataType.STRING_LONG_TYPE if length is greater than 255
     * length length
     * decimalPlaces 0
     */
    global static DataSource.Column text(String name, String label, Integer length) { return null; }

    /**
     * Returns a new column of data type STRING_LONG_TYPE with the specified name and the length of 32,000 characters.
     * @return The returned column has these property values.
     * Property Value
     * name name
     * label name
     * description name
     * isSortable true
     * isFilterable true
     * type DataSource.DataType.STRING_LONG_TYPE
     * length 32000
     * decimalPlaces 0
     */
    global static DataSource.Column textarea(String name) { return null; }

    global void throwException(String msg) { }

    /**
     * Returns a new column of data type Time with the specified name.
     */
    global static DataSource.Column time(String name) { return null; }

    global override virtual String toString() { return null; }

    /**
     * Returns a new column of data type URL_TYPE with the specified name and the length of 1,000 characters.
     * @return The returned column has these property values.
     * Property Value
     * name name
     * label name
     * description name
     * isSortable true
     * isFilterable true
     * type DataSource.DataType.URL_TYPE
     * length 1000
     * decimalPlaces 0
     */
    global static DataSource.Column url(String name) { return null; }

    /**
     * Returns a new column of data type URL_TYPE with the specified name and length.
     * @return The returned column has these property values.
     * Property Value
     * name name
     * label name
     * description name
     * isSortable true
     * isFilterable true
     * type DataSource.DataType.URL_TYPE
     * length length
     * decimalPlaces 0
     */
    global static DataSource.Column url(String name, Integer length) { return null; }
}