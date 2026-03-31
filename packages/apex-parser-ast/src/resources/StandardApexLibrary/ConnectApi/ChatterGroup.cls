/**
 * Chatter group.
 */
global class ChatterGroup extends ConnectApi.ActorWithId {

  /**
   * An extra label for the group, for example, “Archived,” “Private,” or “Private With Customers.” If there isn’t an extra label, the value is null .
   */
  global String additionalLabel;

  /**
   * The current announcement for this group. An announcement displays in a designated location in the Salesforce UI until 11:59 p.m. on its expiration date, unless it’s deleted or replaced by another announcement.
   */
  global ConnectApi.Announcement announcement;

  /**
   * The banner photo for the group.
   */
  global ConnectApi.BannerPhoto bannerPhoto;

  /**
   * true if this group allows Chatter guests.
   */
  global Boolean canHaveChatterGuests;

  /**
   * Information about the Experience Cloud site the group is in.
   */
  global ConnectApi.Reference community;

  /**
   * Group’s description.
   */
  global String description;

  /**
   * Group’s email address for posting to this group by email. Returns null if Chatter emails and posting to Chatter by email aren’t both enabled in your organization.
   */
  global String emailToChatterAddress;

  /**
   * Specifies whether the group is archived ( true ) or not ( false ).
   */
  global Boolean isArchived;

  /**
   * Specifies whether automatic archiving is disabled for the group ( true ) or not ( false ).
   */
  global Boolean isAutoArchiveDisabled;

  /**
   * Specifies whether the group is a broadcast group ( true ) or not ( false ). In a broadcast group, only group owners and managers can post to the group.
   */
  global Boolean isBroadcast;

  /**
   * ISO 8601 date string, for example, 2011-02-25T18:24:31.000Z, of the most recent feed element posted to the group.
   */
  global Datetime lastFeedElementPostDate;

  /**
   * ISO 8601 date string, for example, 2011-02-25T18:24:31.000Z, of the most recent feed item posted to the group. Use lastFeedElementPosted .
   */
  global Datetime lastFeedItemPostDate;

  /**
   * Total number of group members.
   */
  global Integer memberCount;

  /**
   * Type of membership the user has with the group. GroupOwner GroupManager NotAMember NotAMemberPrivateRequested StandardMember
   */
  global ConnectApi.GroupMembershipType myRole;

  /**
   * If the context user is a member of this group, contains information about that subscription; otherwise, returns null .
   */
  global ConnectApi.Reference mySubscription;

  /**
   * Name of the group.
   */
  global String name;

  /**
   * Information about the owner of the group.
   */
  global ConnectApi.UserSummary owner;

  /**
   * Information about the group photo.
   */
  global ConnectApi.Photo photo;

  /**
   * Group visibility type. Valid values are: PrivateAccess —Only members of the group can see posts to this group. PublicAccess —All users within the Experience Cloud site can see posts to this group. Unlisted —Reserved for future use.
   */
  global Connectapi.GroupVisibilityType visibility;

}