/**
 * Performs rule-based searches for duplicate records. The input is an array of sObjects. Each sObject represents a record you want to find duplicates of. The output identifies the detected duplicates for each input sObject based on active duplicate rules for the given object.
 */
public class FindDuplicates {

  /**
   * Identifies duplicates for sObjects provided and returns a list of FindDuplicatesResult objects.
   * @param sObjects An array of sObjects for which you want to find duplicates.
   * @return List<Datacloud.FindDuplicatesResult>
   */
  public static List<Datacloud.FindDuplicatesResult> findDuplicates(List<SObject> sObjects) {}

}