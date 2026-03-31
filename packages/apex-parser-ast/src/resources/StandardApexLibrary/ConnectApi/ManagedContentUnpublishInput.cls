/**
 * Input for unpublishing content.
 */
global class ManagedContentUnpublishInput {

  /**
   * IDs of content to unpublish. All variants of the content are unpublished.
   */
  global List < String > contentIds;

  /**
   * ID of the context workspace. If specified, content from other workspaces is unpublished if it is shared to the specified workspace. If unspecified, the context workspace is derived from the content’s origin workspace. All content in the request should belong to the same origin workspace.
   */
  global String contextContentSpaceId;

  /**
   * Description for unpublish action.
   */
  global String description;

  /**
   * IDs of variants to unpublish. All variants must be from the same content space.
   */
  global List < String > variantIds;

}