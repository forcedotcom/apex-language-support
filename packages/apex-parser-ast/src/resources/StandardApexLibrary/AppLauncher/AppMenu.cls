/**
 * Contains methods to set the appearance of apps in the App Launcher.
 */
global class AppMenu {

  /**
   * Shows or hides specific apps in the App Launcher.
   * @param appMenuItemId The 15-character application ID value for an app. For more information, see the ApplicationId field for AppMenuItem or the AppMenuItemId field for UserAppMenuItem in the Salesforce Object Reference
   * @param isVisible If true , the app is visible.
   */
  public static void setAppVisibility(Id appMenuItemId, Boolean isVisible) {}

  /**
   * Sets the organization-wide default sort order for the App Launcher based on a List of app menu item IDs in the desired order.
   * @param appIds A list of application ID values. For more information, see the ApplicationId field for AppMenuItem in the Salesforce Object Reference .
   */
  public static void setOrgSortOrder(List<Id> appIds) {}

  /**
   * Sets an individual user’s default sort order for the App Launcher based on a List of app menu item IDs in the desired order.
   * @param appIds A list of application ID values. For more information, see the AppMenuItemId field for UserAppMenuItem in the Salesforce Object Reference .
   */
  public static void setUserSortOrder(List<Id> appIds) {}

}