/**
 * Output for rule-based searches for duplicate records. FindDuplicatesResult contains results of detecting duplicates using instances of FindDuplicates or FindDuplicatesByIds classes.
 */
global class FindDuplicatesResult {

  global FindDuplicatesResult() {}

  global List<Database.Error> errors;

  global Boolean success;

  /**
   * Returns a list of DuplicateResult objects representing the results of calling FindDuplicates.findDuplicates(sObjects) or FindDuplicatesByIds.findDuplicatesByIds(ids) . Elements in the list correspond to sObjects or IDs in the input list.
   * @return List<Datacloud.DuplicateResult>
   */
  global List<Datacloud.DuplicateResult> getDuplicateResults() {}

  /**
   * Returns a list of DatabaseError objects containing errors resulting from calling FindDuplicates.findDuplicates(sObjects) or FindDuplicatesByIds.findDuplicatesByIds(ids) , if errors were encountered.
   * @return List<Database.Error>
   */
  global List<Database.Error> getErrors() {}

  /**
   * Returns a Boolean signifying whether the call to FindDuplicates.findDuplicates(sObjects) or FindDuplicatesByIds.findDuplicatesByIds(ids) was successful.
   * @return Boolean
   */
  global Boolean isSuccess() {}

  global Object clone() {}

}