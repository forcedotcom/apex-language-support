/**
 * Create, delete, and get information about an action link group definition; get information about an action link group; get action link diagnostic information.
 */
global class ActionLinks {

  public static ConnectApi.ActionLinkGroupDefinition createActionLinkGroupDefinition(String communityId, ConnectApi.ActionLinkGroupDefinitionInput actionLinkGroup) {}

  public static void deleteActionLinkGroupDefinition(String communityId, String actionLinkGroupId) {}

  public static ConnectApi.PlatformAction getActionLink(String communityId, String actionLinkId) {}

  public static ConnectApi.ActionLinkDiagnosticInfo getActionLinkDiagnosticInfo(String communityId, String actionLinkId) {}

  public static ConnectApi.PlatformActionGroup getActionLinkGroup(String communityId, String actionLinkGroupId) {}

  public static ConnectApi.ActionLinkGroupDefinition getActionLinkGroupDefinition(String communityId, String actionLinkGroupId) {}

}