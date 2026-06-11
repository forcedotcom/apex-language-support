/**
 * Complex segments of field changes.
 */
global class ComplexSegment extends ConnectApi.MessageSegment {

  global ComplexSegment() {}

  /**
   * List of message segments.
   */
  global List < ConnectApi.MessageSegment > segments;

  global Object clone() {}

}