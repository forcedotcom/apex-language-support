/**
 * Tracked change item.
 */
global class TrackedChangeItem {

  /**
   * The name of the field that was updated.
   */
  global String fieldName;

  /**
   * The new value of the field or null if the field length is long.
   */
  global String newValue;

  /**
   * The old value of the field or null if the field length is long.
   */
  global String oldValue;

}