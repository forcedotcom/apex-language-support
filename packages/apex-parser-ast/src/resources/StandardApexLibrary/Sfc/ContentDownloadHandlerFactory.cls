/**
 * Use this interface to provide a class factory that Salesforce can call to create instances of your custom ContentDownloadHandler.
 */
global interface ContentDownloadHandlerFactory {

  /**
   * Returns a ContentDownloadHandler for a given list of content IDs and a download context.
   * @param var1 
   * @param var2 
   * @return Sfc.ContentDownloadHandler
   */
  Sfc.ContentDownloadHandler getContentDownloadHandler(List<Id> var1, Sfc.ContentDownloadContext var2);

}