/**
 * Lead status picklist value attributes.
 */
global class LeadStatusPicklistValueAttributes extends ConnectApi.AbstractPicklistValueAttributes {

  global LeadStatusPicklistValueAttributes() {}

  /**
   * Specifies whether the lead has a status of converted ( true ) or not ( false ).
   */
  global Boolean converted;

  global Object clone() {}

}