/**
 * Contains tab metadata information for a tab in a standard or custom app available in the Salesforce user interface.
 */
global class DescribeTabResult {

  global DescribeTabResult() {}

  /**
   * Returns a list of color metadata information for all colors associated with this tab. Each color is associated with a theme and context.
   * @return List<Schema.DescribeColorResult>
   */
  global List<Schema.DescribeColorResult> getColors() {}

  /**
   * Returns the URL for the main 32 x 32-pixel icon for a tab. This icon corresponds to the current theme (theme3) and appears next to the heading at the top of most pages.
   * @return String
   */
  global String getIconUrl() {}

  /**
   * Returns a list of icon metadata information for all icons associated with this tab. Each icon is associated with a theme and context.
   * @return List<Schema.DescribeIconResult>
   */
  global List<Schema.DescribeIconResult> getIcons() {}

  /**
   * Returns the display label of this tab.
   * @return String
   */
  global String getLabel() {}

  /**
   * Returns the URL for the 16 x 16-pixel icon that represents a tab. This icon corresponds to the current theme (theme3) and appears in related lists and other locations.
   * @return String
   */
  global String getMiniIconUrl() {}

  /**
   * Returns the name of the sObject that is primarily displayed on this tab (for tabs that display a particular SObject).
   * @return String
   */
  global String getSobjectName() {}

  /**
   * Returns a fully qualified URL for viewing this tab.
   * @return String
   */
  global String getUrl() {}

  /**
   * Returns true if this is a custom tab, or false if this is a standard tab.
   * @return Boolean
   */
  global Boolean isCustom() {}

  global String getMobileUrl() {}

  global String getName() {}

  global String getTabEnumOrId() {}

  global Object clone() {}

}