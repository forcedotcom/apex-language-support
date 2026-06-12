/**
 * The map for objects and their merge fields.
 */
global class EmailMergeFieldInfo {

  global EmailMergeFieldInfo() {}

  /**
   * Map for multiple objects and their merge field collections.
   */
  global Map < String , ConnectApi.EmailMergeFieldCollectionInfo > entityToMergeFieldsMap;

  global Object clone() {}

}