/**
 * The definition of an action link group. All action links must belong to a group. Action links in a group are mutually exclusive and share some properties. Define standalone actions in their own action group.
 */
global class ActionLinkGroupDefinitionInput {

  /**
   * The action links that make up this group. Within an action link group, action links are displayed in the order listed in the actionLinks property of the ConnectApi.ActionLinkGroupDefinitionInput class. Within a feed item, action link groups are displayed in the order specified in the actionLinkGroupIds property of the ConnectApi.AssociatedActionsCapabilityInput class. You can create up to three action links in a Primary group and up to four in an Overflow group.
   */
  global List < ConnectApi.ActionLinkDefinitionInput > actionLinks;

  /**
   * Indicates the priority and relative locations of action links in an associated feed item. Values are: Primary —The action link group is displayed in the body of the feed element. Overflow —The action link group is displayed in the overflow menu of the feed element.
   */
  global ConnectApi.PlatformActionGroupCategory category;

  /**
   * Defines the number of times an action link can be executed. Values are: Once —An action link can be executed only one time across all users. OncePerUser —An action link can be executed only one time for each user. Unlimited —An action link can be executed an unlimited number of times by each user. If the action link’s actionType is Api or ApiAsync , you can’t use this value.
   */
  global ConnectApi.ActionLinkExecutionsAllowed executionsAllowed;

  /**
   * ISO 8601 date string, for example, 2011-02-25T18:24:31.000Z, that represents the date and time this action link group is removed from associated feed items and can no longer be executed. The expirationDate must be within one year of the creation date. If the action link group definition includes an OAuth token, it is a good idea to set the expiration date of the action link group to the same value as the expiration date of the OAuth token so that users can’t execute the action link and get an OAuth error. To set a date when instantiating from a template, see Set the Action Link Group Expiration Time in Design Action Link Templates .
   */
  global Datetime expirationDate;

  /**
   * A collection of key-value pairs to fill in binding variable values or a custom user alias from an action link template. To instantiate this action link group from an action link template that uses binding variables, you must provide values for all the variables. See Define Binding Variables in Design Action Link Templates .
   */
  global List < ConnectApi.ActionLinkTemplateBindingInput > templateBindings;

  /**
   * The ID of the action link group template from which to instantiate this action link group.
   */
  global String templateId;

}