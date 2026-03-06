/**
 * Represents the parameter fields for an SQL query input.
 */
global class QuerySqlParameterItem {

  /**
   * Name of the SQL parameter.
   */
  global String name;

  /**
   * Type of the SQL parameter. ArrayOfX BigInt Bool Char Date Double Foat Integer Numeric Oid SmallInt Time Timestamp TimestampTZ Unspecified Varchar
   */
  global TypeEnum type;

  /**
   * Value of the SQL parameter.
   */
  global String value;

}