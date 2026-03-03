/**
 * Represents the name of a matching rule field and how the values of the field compare for the duplicate and its matching record.
 */
global class FieldDiff {

  /**
   * Returns how the field values compare for the duplicate and its matching record.
   * @return String
   */
  public String getDifference() {}

  /**
   * Returns the name of a field on a matching rule that detected duplicates.
   * @return String
   */
  public String getName() {}

}