/**
 * Contains summary data for a cell of the report.
 */
global class SummaryValue {

  global SummaryValue() {}

  /**
   * Returns the formatted summary data for a specified cell.
   * @return String
   */
  global String getLabel() {}

  /**
   * Returns the numeric value of the summary data for a specified cell.
   * @return Object
   */
  global Object getValue() {}

  global Object clone() {}

}