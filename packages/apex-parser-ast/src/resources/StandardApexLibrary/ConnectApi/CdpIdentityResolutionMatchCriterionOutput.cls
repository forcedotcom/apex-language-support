/**
 * Identity resolution ruleset's match rule criterion.
 */
global class CdpIdentityResolutionMatchCriterionOutput {

  /**
   * Specifies whether the criterion match is case sensitive ( true ) or not ( false ). Available only when matching is based on the party identifier .
   */
  global Boolean caseSensitiveMatch;

  /**
   * API name of the Data Model Object the match rule applies to.
   */
  global String entityName;

  /**
   * Name of the field the criterion applies to.
   */
  global String fieldName;

  /**
   * Match method for a match rule criterion. Values are: Exact —Exact match. ExactNormalized —Exact normalized match. Fuzzy —Fuzzy match with medium precision. FuzzyHigh —Fuzzy match with high precision. FuzzyLow —Fuzzy match with low precision.
   */
  global ConnectApi.CdpIdentityResolutionMatchMethodType matchMethodType;

  /**
   * Party Identifier information.
   */
  global ConnectApi.CdpIdentityResolutionMatchCriterionPartyIdentificationInfoOutput partyIdentificationInfo;

  /**
   * Specifies whether blank fields can be used for matching ( true ) or not ( false ).
   */
  global Boolean shouldMatchOnBlank;

}