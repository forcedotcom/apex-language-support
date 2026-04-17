/**
 * If a feed element has this capability, it has platform actions associated with it.
 */
global class AssociatedActionsCapability {

  /**
   * The platform action groups associated with a feed element. Platform action groups are returned in the order specified in the ConnectApi.AssociatedActionsCapabilityInput class.
   */
  global List < ConnectApi.PlatformActionGroup > platformActionGroups;

}