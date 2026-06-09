/**
 * Contains color metadata information for a tab.
 */
global class DescribeColorResult {

  global DescribeColorResult() {}

  /**
   * Returns the Web RGB color code, such as 00FF00 .
   * @return String
   */
  global String getColor() {}

  /**
   * Returns the color context. The context determines whether the color is the main color for the tab or not.
   * @return String
   */
  global String getContext() {}

  /**
   * Returns the color theme.
   * @return String
   */
  global String getTheme() {}

  global Object clone() {}

}