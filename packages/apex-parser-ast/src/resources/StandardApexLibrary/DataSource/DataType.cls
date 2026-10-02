/**
 * Specifies the data types that are supported by the Apex Connector Framework.
 * <p>Usage
 * The DataSource.DataType enum is referenced by the type property on the DataSource.Column class.
 * <p>Enum Values
 * The following are the values of the DataSource.DataType enum.
 */
global enum DataType {
    BOOLEAN_TYPE,
    CURRENCY_TYPE,
    DATETIME_TYPE,
    DATE_TYPE,
    EMAIL_TYPE,
    EXTERNAL_LOOKUP_TYPE,
    INDIRECT_LOOKUP_TYPE,
    LOOKUP_TYPE,
    NUMBER_TYPE,
    PERCENT_TYPE,
    PHONE_TYPE,
    PICKLIST_MULTISELECT_TYPE,
    PICKLIST_TYPE,
    STRING_LONG_TYPE,
    STRING_SHORT_TYPE,
    TIME_TYPE,
    URL_TYPE

}