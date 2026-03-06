/**
 * Represents the metadata associated with an SQL query output.
 */
global class QuerySqlMetadataItem {

  /**
   * Description of array fields.
   */
  global ConnectApi.QuerySqlMetadataItem innerElement;

  /**
   * Name of the field.
   */
  global String name;

  /**
   * Indicates if the field is nullable ( true ) or not ( false ).
   */
  global Boolean nullable;

  /**
   * Precision for numeric fields.
   */
  global Integer precision;

  /**
   * Scale for numeric fields.
   */
  global Integer scale;

  /**
   * Type of the SQL parameter. ArrayOfX BigInt Bool Char Date Double Foat Integer Numeric Oid SmallInt Time Timestamp TimestampTZ Unspecified Varchar
   */
  global TypeEnum type;

}