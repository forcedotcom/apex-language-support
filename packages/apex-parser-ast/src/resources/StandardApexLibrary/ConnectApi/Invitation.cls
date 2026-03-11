/**
 * An invitation.
 */
global class Invitation {

  /**
   * Email address of the user.
   */
  global String email;

  /**
   * Specifies the status of an invitation to join a group. Values are: ActedUponUser —The user was added to the group. An email was sent asking the user to visit the group. Invited —An email was sent asking the user to sign up for the org. MaxedOutUsers —The group has the maximum allowed members. MultipleError —The user wasn’t invited due to multiple errors. NoActionNeededUser —The user is already a member of the group. NotVisibleToExternalInviter —The user is not accessible to the user sending the invitation. Unhandled —The user couldn’t be added to the group for an unknown reason.
   */
  global ConnectApi.GroupViralInvitationsStatus status;

  /**
   * ID of the user.
   */
  global String userId;

}