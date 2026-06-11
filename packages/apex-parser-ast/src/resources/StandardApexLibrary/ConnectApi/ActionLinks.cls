/**
 * Create, delete, and get information about an action link group definition; get information about an action link group; get action link diagnostic information.
 */
global class ActionLinks {

  global ActionLinks() {}

  global static ConnectApi.ActionLinkGroupDefinition createActionLinkGroupDefinition(String communityId, ConnectApi.ActionLinkGroupDefinitionInput actionLinkGroup) {}

  global static void deleteActionLinkGroupDefinition(String communityId, String actionLinkGroupId) {}

  global static ConnectApi.PlatformAction getActionLink(String communityId, String actionLinkId) {}

  global static ConnectApi.ActionLinkDiagnosticInfo getActionLinkDiagnosticInfo(String communityId, String actionLinkId) {}

  global static ConnectApi.PlatformActionGroup getActionLinkGroup(String communityId, String actionLinkGroupId) {}

  global static ConnectApi.ActionLinkGroupDefinition getActionLinkGroupDefinition(String communityId, String actionLinkGroupId) {}

  global Object clone() {}

}