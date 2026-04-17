/**
 * Attach a file that has already been uploaded or remove a file from a feed element.
 */
global class FileIdInput {

  /**
   * ID of a file that has already been uploaded.
   */
  global String id;

  /**
   * Operation to carry out on the file. Values are: Add —Adds the file to the feed element. Remove —Removes the file from the feed element. Remove operations are processed before Add operations. Adding content that is already added and removing content that is already removed result in no operation.
   */
  global ConnectApi.OperationType operationType;

}