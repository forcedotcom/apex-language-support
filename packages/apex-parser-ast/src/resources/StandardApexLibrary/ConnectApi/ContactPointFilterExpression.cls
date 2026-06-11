/**
 * Represents an activation contact point filter expression output.
 */
global class ContactPointFilterExpression {

  global ContactPointFilterExpression() {}

  /**
   * List of contact point DMO filter expressions.
   */
  global List < ConnectApi.DmoFilter > contactPointDmoFilters;

  global Object clone() {}

}