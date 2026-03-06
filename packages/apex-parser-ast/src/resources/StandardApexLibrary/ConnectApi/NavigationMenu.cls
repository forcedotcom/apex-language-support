/**
 * Get navigation menu items for an Experience Cloud site.
 */
global class NavigationMenu {

  public static ConnectApi.NavigationMenuItemCollection getCommunityNavigationMenu(String communityId, String navigationLinkSetId, String navigationLinkSetDeveloperName, ConnectApi.PublishStatus publishStatus, Boolean includeImageUrl, Boolean addHomeMenuItem, List<ConnectApi.NavigationMenuItemType> menuItemTypesToSkip) {}

  public static ConnectApi.NavigationMenuItemCollection getCommunityNavigationMenu(String communityId, String navigationLinkSetId, String navigationLinkSetDeveloperName, ConnectApi.PublishStatus publishStatus, Boolean includeImageUrl, Boolean addHomeMenuItem, List<ConnectApi.NavigationMenuItemType> menuItemTypesToSkip, String effectiveAccountId) {}

}