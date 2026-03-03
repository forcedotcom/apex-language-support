/**
 * Represents a duplicate record detected by a matching rule.
 */
global class MatchRecord {

  /**
   * Returns other information about a matched record. For example, a matchGrade represents the quality of the data for the D&B fields in the matched record.
   * @return List<Datacloud.AdditionalInformationMap>
   */
  public List<Datacloud.AdditionalInformationMap> getAdditionalInformation() {}

  /**
   * Returns all matching rule fields and how each field value compares for the duplicate and its matching record.
   * @return List<Datacloud.FieldDiff>
   */
  public List<Datacloud.FieldDiff> getFieldDiffs() {}

  /**
   * Returns the ranking of how similar a matched record’s data is to the data in your request. Must be equal to or greater than the value of the minMatchConfidence specified in your request. Returns -1 if unused.
   * @return Double
   */
  public Double getMatchConfidence() {}

  /**
   * Returns the fields and field values for the duplicate.
   * @return SObject
   */
  public SObject getRecord() {}

}