/**
 * Entity link segment.
 */
global class EntityLinkSegment extends ConnectApi.MessageSegment {

  /**
   * A set of small, medium, and large icons that indicate whether the entity is a file, group, record, or user. The motif can also contain the object’s base color.
   */
  global ConnectApi.Motif Class motif;

  /**
   * A reference to the link object if applicable, otherwise, null .
   */
  global ConnectApi.Reference reference;

}