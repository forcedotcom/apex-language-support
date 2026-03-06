/**
 * Information about a record that could be used to @mention a user or group.
 */
global class MentionCompletion {

  /**
   * If one exists, an additional label for the record represented by this completion, for example, “(Customer)” or “(Acme Corporation)”.
   */
  global String additionalLabel;

  /**
   * A description of the record represented by this completion.
   */
  global String description;

  /**
   * The name of the record represented by this completion. The name is localized, if possible.
   */
  global String name;

  /**
   * If the record represented by this completion is a user, an additional out-of-office message, if one exists, for the user.
   */
  global ConnectApi.OutOfOffice outOfOffice;

  /**
   * A URL to the photo or icon of the record represented by this completion.
   */
  global String photoUrl;

  /**
   * The ID of the record represented by this completion.
   */
  global String recordId;

  /**
   * If the record represented by this completion is a user, this value is the user type associated with that user; otherwise the value is null . One of these values: ChatterGuest —User is an external user in a private group. ChatterOnly —User is a Chatter Free customer. Guest —User is unauthenticated. Internal —User is a standard org member. Portal —User is an external user in an Experience Cloud site. System —User is Chatter Expert or a system user. Undefined —User is a user type that is a custom object.
   */
  global ConnectApi.UserType Enum userType;

}