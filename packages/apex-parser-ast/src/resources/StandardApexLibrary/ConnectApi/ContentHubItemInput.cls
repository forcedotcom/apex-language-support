/**
 * Item type ID and fields of the item type.
 */
global class ContentHubItemInput {

  /**
   * List of fields for the item.
   */
  global List < ConnectApi.ContentHubFieldValueInput > fields;

  /**
   * ID of the item type, such as L3NpdGVzL0FDRVRfRklMRUNPTk5FQ1RfSU5U:5f33e0f4-b33c-4127-b9e4-dd5a73dd2f1b:0c847e7c-d4a2-4136-bfda-c468fae2d087:0x0101 . To get the itemTypeId , use one of the getAllowedItemTypes() methods.
   */
  global String itemTypeId;

}