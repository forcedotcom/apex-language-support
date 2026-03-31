/**
 * Site search result item.
 */
global class SiteSearchItem {

  /**
   * Content reference field, which is the route developer name for a site page or a content key for a content detail page.
   */
  global String contentReference;

  /**
   * Developer name of the content type of the site search result item.
   */
  global String contentTypeDeveloperName;

  /**
   * Text snippet that contains the query term.
   */
  global String highlightedSnippet;

  /**
   * ID of the site search result item.
   */
  global String id;

  /**
   * Type of site search result item. Values are: ContentPage SitePage
   */
  global ConnectApi.SitesPageType pageType;

  /**
   * Title of the site search result item.
   */
  global String title;

}