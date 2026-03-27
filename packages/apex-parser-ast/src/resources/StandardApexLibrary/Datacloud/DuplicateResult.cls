/**
 * Represents the details of a duplicate rule that detected duplicate records and information about those duplicate records.
 */
global class DuplicateResult {

  /**
   * Returns the developer name of the executed duplicate rule that returned duplicate records.
   * @return String
   */
  public String getDuplicateRule() {}

  /**
   * Returns the error message configured by the administrator to warn users they may be creating duplicate records. This message is associated with a duplicate rule.
   * @return String
   */
  public String getErrorMessage() {}

  /**
   * Returns the duplicate records and match information.
   * @return List<Datacloud.MatchResult>
   */
  public List<Datacloud.MatchResult> getMatchResults() {}

  /**
   * Indicates whether the duplicate rule will allow a record that’s identified as a duplicate to be saved. Set to true if duplicate rule should allow save; otherwise, false .
   * @return Boolean
   */
  public Boolean isAllowSave() {}

}