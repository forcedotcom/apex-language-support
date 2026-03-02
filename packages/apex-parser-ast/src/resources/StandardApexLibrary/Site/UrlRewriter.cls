/**
 * Enables rewriting Sites URLs.
 */
public interface UrlRewriter {

  /**
   * Maps a list of Salesforce URLs to a list of user-friendly URLs.
   * @param salesforceUrls 
   * @return System.PageReference[]
   */
  System.PageReference[] generateUrlFor(System.PageReference[] salesforceUrls);

  /**
   * Maps a user-friendly URL to a Salesforce URL.
   * @param userFriendlyUrl 
   * @return System.PageReference
   */
  System.PageReference mapRequestUrl(System.PageReference userFriendlyUrl);

}