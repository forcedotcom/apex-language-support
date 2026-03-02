/**
 * Contains the results of a call to the Security.stripInaccessible method and methods to retrieve those results.
 */
public class SObjectAccessDecision {

  public Set< Integer > getModifiedIndexes() {}

  public List<SObject> getRecords() {}

  /**
   * Returns a map of sObject types to their corresponding inaccessible fields. The map key is a string representation of the sObject type. The map value is a set of strings, which denote the fields names that are inaccessible.
   * @return Map< String ,Set< String >>
   */
  public Map< String ,Set< String >> getRemovedFields() {}

}