/**
 * Actor.
 */
global class Actor {

  global Actor() {}

  /**
   * Name of the actor, such as the group name.
   */
  global String name;

  /**
   * One of the following: file group recommendedObject (version 34.0 and later) unauthenticateduser user record type name —the name of the record type, such as myCustomObject__c or Account
   */
  global String type;

  global Object clone() {}

}