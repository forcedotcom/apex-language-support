/**
 * Contains methods to securely implement Apex applications.
 */
global class Security {

  public static System.SObjectAccessDecision stripInaccessible(System.AccessType accessCheckType, List<SObject> sourceRecords, Boolean enforceRootObjectCRUD) {}

  public static System.SObjectAccessDecision stripInaccessible(System.AccessType accessCheckType, List<SObject> sourceRecords) {}

}