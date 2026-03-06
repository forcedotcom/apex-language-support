/**
 * Domain associated with a managed content channel.
 */
global class ManagedContentChannelDomainRepresentation {

  /**
   * Specifies whether the domain is locked and can’t be changed ( true ) or not ( false ).
   */
  global Boolean isLocked;

  /**
   * Name of the domain assigned to the channel.
   */
  global String name;

  /**
   * Value of the domain (name or ID) associated with the channel.
   */
  global String value;

}