/**
 * Input for publishing content.
 */
global class ManagedContentPublishInput {

  /**
   * IDs of content to publish. All variants of the content are published.
   */
  global List < String > contentIds;

  /**
   * ID of the context workspace. If specified, content from other workspaces is published if it is shared to the specified workspace. If unspecified, the context workspace is derived from the content’s origin workspace. All content in the request should belong to the same origin workspace.
   */
  global String contextContentSpaceId;

  /**
   * Description for publish action.
   */
  global String description;

  /**
   * Specifies whether to include content references ( true ) or not ( false ).
   */
  global Boolean includeContentReferences;

  /**
   * IDs of variants to publish. All variants must be from the same content space.
   */
  global List < String > variantIds;

}