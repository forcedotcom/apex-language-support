/**
 * Represents a collection of all data spaces that a user is assigned to.
 */
global class DataSpaceCollectionRepresentation {

  global DataSpaceCollectionRepresentation() {}

  /**
   * List of all data spaces.
   */
  global List < ConnectApi.DataSpaceInfoRepresentation > dataSpaces;

  global Object clone() {}

}