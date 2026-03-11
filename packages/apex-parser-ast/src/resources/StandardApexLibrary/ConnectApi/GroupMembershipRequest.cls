/**
 * Request to become a group member.
 */
global class GroupMembershipRequest {

  /**
   * ISO 8601 date string, for example, 2011-02-25T18:24:31.000Z.
   */
  global Datetime createdDate;

  /**
   * ID for the group membership request object.
   */
  global String id;

  /**
   * ISO 8601 date string, for example, 2011-02-25T18:24:31.000Z.
   */
  global Datetime lastUpdateDate;

  /**
   * Information about the group the context user is requesting to join.
   */
  global ConnectApi.Reference requestedGroup;

  /**
   * A message for the user if their membership request is declined. The value of this property is used only when the value of the status property is Declined . The maximum length is 756 characters.
   */
  global String responseMessage;

  /**
   * Status of a request to join a private group. Values are: Accepted Declined Pending
   */
  global ConnectApi.GroupMembershipRequestStatus Enum status;

  /**
   * URL of the group membership request object.
   */
  global String url;

  /**
   * Information about the user requesting membership in a group.
   */
  global ConnectApi.UserSummary user;

}