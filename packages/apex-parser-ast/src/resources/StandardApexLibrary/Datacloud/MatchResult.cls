/**
 * Represents the duplicate results for a matching rule.
 */
global class MatchResult {

  global MatchResult() {}

  /**
   * Returns the entity type of the matching rule.
   * @return String
   */
  global String getEntityType() {}

  /**
   * Returns errors that occurred during matching for the matching rule.
   * @return List<Database.Error>
   */
  global List<Database.Error> getErrors() {}

  /**
   * Returns the match engine for the matching rule.
   * @return String
   */
  global String getMatchEngine() {}

  /**
   * Returns information about the duplicates for the matching rule.
   * @return List<Datacloud.MatchRecord>
   */
  global List<Datacloud.MatchRecord> getMatchRecords() {}

  /**
   * Returns the developer name of the matching rule.
   * @return String
   */
  global String getRule() {}

  /**
   * Returns the number of duplicates detected by the matching rule.
   * @return Integer
   */
  global Integer getSize() {}

  /**
   * Returns false if there’s an error with the matching rule, and true if the matching rule successfully ran.
   * @return Boolean
   */
  global Boolean isSuccess() {}

  global Object clone() {}

}