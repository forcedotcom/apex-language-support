/**
 * Information about a profile tab.
 */
global class UserProfileTab {

  global UserProfileTab() {}

  global String id;

  global Boolean isDefault;

  global ConnectApi.UserProfileTabType Enum tabType;

  global String tabUrl;

  global Object clone() {}

}