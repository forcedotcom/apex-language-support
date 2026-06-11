/**
 * If a feed element has this capability, it has one or more file attachments.
 */
global class FilesCapability extends ConnectApi.FeedElementCapability {

  global FilesCapability() {}

  /**
   * Collection of files.
   */
  global List < ConnectApi.Content > items;

  global Object clone() {}

}