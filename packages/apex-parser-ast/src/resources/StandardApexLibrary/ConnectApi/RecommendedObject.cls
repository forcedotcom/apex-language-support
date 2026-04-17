/**
 * A recommended object, such as a custom or static recommendation.
 */
global class RecommendedObject extends ConnectApi.Actor {

  /**
   * ID of a recommendation definition for a custom recommendation or the enum value Today for static recommendations that don’t have an ID (version 35.0 and later).
   */
  global String idOrEnum;

  /**
   * Motif of the recommended object.
   */
  global ConnectApi.Motif motif;

}