/**
 * Case status picklist value attributes.
 */
global class CaseStatusPicklistValueAttributes extends ConnectApi.AbstractPicklistValueAttributes {

  global CaseStatusPicklistValueAttributes() {}

  /**
   * Specifies whether the case has a status of closed ( true ) or not ( false ).
   */
  global Boolean closed;

  global Object clone() {}

}