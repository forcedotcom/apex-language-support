/**
 * Following counts.
 */
global class FollowingCounts {

  global FollowingCounts() {}

  /**
   * Number of people user is following.
   */
  global Integer people;

  /**
   * Number of records user is following. Topics are a type of record that can be followed as of version 29.0.
   */
  global Integer records;

  /**
   * Total number of items user is following.
   */
  global Integer total;

  global Object clone() {}

}