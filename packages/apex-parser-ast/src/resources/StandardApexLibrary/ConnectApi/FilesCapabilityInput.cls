/**
 * Attach up to 10 files that have already been uploaded or remove one or more files from a feed element.
 */
global class FilesCapabilityInput {

  /**
   * List of file IDs and operations to be carried out on those files.
   */
  global List < ConnectApi.FileIdInput > items;

}