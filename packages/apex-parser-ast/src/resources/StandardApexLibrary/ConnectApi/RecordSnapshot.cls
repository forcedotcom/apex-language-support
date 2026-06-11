/**
 * A record snapshot in a recommendation reaction.
 */
global class RecordSnapshot {

  global RecordSnapshot() {}

  /**
   * ID of the record.
   */
  global String id;

  /**
   * Name of the record when the ID was recorded.
   */
  global String nameAtSnapshot;

  global Object clone() {}

}