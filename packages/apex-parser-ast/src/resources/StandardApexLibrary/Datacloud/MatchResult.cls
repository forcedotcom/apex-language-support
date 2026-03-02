/**
 * Represents the duplicate results for a matching rule.
 */
public class MatchResult {

  /**
   * Returns the entity type of the matching rule.
   * @return String
   */
  public String getEntityType() {}

  /**
   * Returns errors that occurred during matching for the matching rule.
   * @return List<Database.Error>
   */
  public List<Database.Error> getErrors() {}

  /**
   * Returns the match engine for the matching rule.
   * @return String
   */
  public String getMatchEngine() {}

  /**
   * Returns information about the duplicates for the matching rule.
   * @return List<Datacloud.MatchRecord>
   */
  public List<Datacloud.MatchRecord> getMatchRecords() {}

  /**
   * Returns the developer name of the matching rule.
   * @return String
   */
  public String getRule() {}

  /**
   * Returns the number of duplicates detected by the matching rule.
   * @return Integer
   */
  public Integer getSize() {}

  /**
   * Returns false if there’s an error with the matching rule, and true if the matching rule successfully ran.
   * @return Boolean
   */
  public Boolean isSuccess() {}

}