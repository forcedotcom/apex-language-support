/**
 * A platform action group instance with state appropriate for the context user.
 */
global class PlatformActionGroup {

  /**
   * Indicates the priority and relative locations of platform actions. Values are: Primary —The action link group is displayed in the body of the feed element. Overflow —The action link group is displayed in the overflow menu of the feed element.
   */
  global ConnectApi.PlatformActionGroupCategory category;

  /**
   * The 18-character ID or an opaque string ID of the platform action group. If the ConnectApi.PlatformAction type is QuickAction and the subtype is Create , this value is null .
   */
  global String id;

  /**
   * ISO 8601 date string, for example, 2014-02-25T18:24:31.000Z.
   */
  global Datetime modifiedDate;

  /**
   * The platform action instances for this group. Within an action link group, action links are displayed in the order listed in the actionLinks property of the ConnectApi.ActionLinkGroupDefinitionInput class. Within a feed item, action link groups are displayed in the order specified in the actionLinkGroupIds property of the ConnectApi.AssociatedActionsCapabilityInput class.
   */
  global List < ConnectApi.PlatformAction > platformActions;

  /**
   * The URL for this platform action group. If the ConnectApi.PlatformAction type is QuickAction and the subtype is Create , this value is null .
   */
  global String url;

}