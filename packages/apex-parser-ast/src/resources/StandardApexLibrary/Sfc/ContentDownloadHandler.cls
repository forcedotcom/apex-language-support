/**
 * Use ContentDownloadHandler to define a custom download handler that controls how content is downloaded.
 */
global class ContentDownloadHandler {

  global ContentDownloadHandler() {}

  public String downloadErrorMessage;

  public Boolean isDownloadAllowed;

  public String redirectUrl;

  global Object clone() {}

}