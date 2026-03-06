/**
 * Chatter group input.
 */
global class ChatterGroupInput {

  /**
   * The 18-character ID of an announcement. An announcement displays in a designated location in the Salesforce UI until 11:59 p.m. on its expiration date, unless it’s deleted or replaced by another announcement.
   */
  global String announcement;

  /**
   * true if this group allows Chatter customers, false otherwise. After this property is set to true , it cannot be set to false .
   */
  global Boolean canHaveChatterGuests;

  /**
   * The “Description” section of the group.
   */
  global String description;

  /**
   * The “Information” section of a group. If the group is private, this section is visible only to members.
   */
  global ConnectApi.GroupInformationInput information;

  /**
   * true if the group is archived, false otherwise. Defaults to false .
   */
  global Boolean isArchived;

  /**
   * true if automatic archiving is turned off for the group, false otherwise. Defaults to false .
   */
  global Boolean isAutoArchiveDisabled;

  /**
   * The name of the group.
   */
  global String name;

  /**
   * The ID of the group owner. This property is available for PATCH requests only.
   */
  global String owner;

  /**
   * Group visibility type. PrivateAccess —Only members of the group can see posts to this group. PublicAccess —All users within the Experience Cloud site can see posts to this group. Unlisted —Reserved for future use.
   */
  global ConnectApi.GroupVisibilityType visibility;

}