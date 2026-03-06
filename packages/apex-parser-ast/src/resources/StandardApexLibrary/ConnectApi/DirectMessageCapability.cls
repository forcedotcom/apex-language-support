/**
 * If a feed element has this capability, it’s a direct message.
 */
global class DirectMessageCapability {

  /**
   * Member activities of the direct message, with the most recent activity first.
   */
  global ConnectApi.DirectMessageMemberActivityPage memberChanges;

  /**
   * Members included in the direct message.
   */
  global ConnectApi.DirectMessageMemberPage members;

  /**
   * Original members of the direct message.
   */
  global ConnectApi.DirectMessageMemberPage originalMembers;

  /**
   * Subject of the direct message.
   */
  global String subject;

}