/**
 * An entity link segment.
 */
global class EntityLinkSegmentInput extends ConnectApi.MessageSegmentInput {

  /**
   * ID of the entity to link to. Only users with access to the entity see it. It’s hidden for users without access.
   */
  global String entityId;

}