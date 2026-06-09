/**
 * Represents the name of a matching rule field and how the values of the field compare for the duplicate and its matching record.
 */
global class FieldDiff {

  global FieldDiff() {}

  /**
   * Returns how the field values compare for the duplicate and its matching record.
   * @return String
   */
  global String getDifference() {}

  /**
   * Returns the name of a field on a matching rule that detected duplicates.
   * @return String
   */
  global String getName() {}

  global Object clone() {}

}