/**
 * A list of action link groups to associate with a feed element. To associate an action link group with a feed element, the call must be made from the Apex namespace that created the action link definition. In addition, the user making the call must have created the definition or have View All Data permission.
 */
global class AssociatedActionsCapabilityInput {

  /**
   * The action link group IDs to associate with the feed element. Associate one Primary and up to 10 total action link groups to a feed item. Action link groups are returned in the order specified in this property. An action link group ID is returned from a call to ConnectApi.ActionLinks. createActionLinkGroupDefinition(communityId, actionLinkGroup) .
   */
  global List < String > actionLinkGroupIds;

}