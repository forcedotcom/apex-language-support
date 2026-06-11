/**
 * Contains icon metadata information for a tab.
 */
global class DescribeIconResult {

  global DescribeIconResult() {}

  /**
   * Returns the tab icon’s content type, such as image/png .
   * @return String
   */
  global String getContentType() {}

  /**
   * Returns the tab icon’s height in pixels.
   * @return Integer
   */
  global Integer getHeight() {}

  /**
   * Returns the tab’s icon theme.
   * @return String
   */
  global String getTheme() {}

  /**
   * Returns the tab’s icon fully qualified URL.
   * @return String
   */
  global String getUrl() {}

  /**
   * Returns the tab’s icon width in pixels.
   * @return Integer
   */
  global Integer getWidth() {}

  global Object clone() {}

}