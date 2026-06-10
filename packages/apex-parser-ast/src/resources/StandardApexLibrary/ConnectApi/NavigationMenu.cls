/**
 * Get navigation menu items for an Experience Cloud site.
 */
global class NavigationMenu {

  global NavigationMenu() {}

  global static ConnectApi.NavigationMenuItemCollection getCommunityNavigationMenu(String communityId, String navigationLinkSetId, String navigationLinkSetDeveloperName, ConnectApi.PublishStatus publishStatus, Boolean includeImageUrl, Boolean addHomeMenuItem, List<ConnectApi.NavigationMenuItemType> menuItemTypesToSkip) {}

  global static ConnectApi.NavigationMenuItemCollection getCommunityNavigationMenu(String communityId, String navigationLinkSetId, String navigationLinkSetDeveloperName, ConnectApi.PublishStatus publishStatus, Boolean includeImageUrl, Boolean addHomeMenuItem, List<ConnectApi.NavigationMenuItemType> menuItemTypesToSkip, String effectiveAccountId) {}

  global Object clone() {}

}