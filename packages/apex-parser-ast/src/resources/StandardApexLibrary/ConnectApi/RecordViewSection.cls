/**
 * Section of record fields and values on a record detail.
 */
global class RecordViewSection {

  /**
   * Number of columns to use to lay out the fields in a record section.
   */
  global Integer columnCount;

  /**
   * Order of the fields to use in the fields property to lay out the fields in a record section. LeftRight —Fields are rendered from left to right. TopDown —Fields are rendered from the top down.
   */
  global ConnectApi.RecordColumnOrder Enum columnOrder;

  /**
   * Fields and values for the record contained in this section.
   */
  global ConnectApi.AbstractRecordField fields;

  /**
   * Localized label to display when rendering this section of fields.
   */
  global String heading;

  /**
   * Indicates whether the section can be collapsed to hide all the fields ( true ) or not ( false ).
   */
  global Boolean isCollapsible;

}