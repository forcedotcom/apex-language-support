/**
 * Represents the DMO filter input.
 */
global class DMOFilterInput {

  /**
   * Entity filter.
   */
  global BaseComparisonInputRepresentation entityFilter;

  /**
   * Type of the entity filter.
   */
  global String entityFilterType;

  /**
   * Name of the entity.
   */
  global String entityName;

  /**
   * Filter limit.
   */
  global DmoFilterLimitInputRepresentation filterLimit;

  /**
   * Inherited filter.
   */
  global BaseComparisonInputRepresentation inheritedFilter;

  /**
   * Type of the inherited filter.
   */
  global String inheritedFilterType;

  /**
   * Path from the activation to the container.
   */
  global List < ConnectApi.QueryPathInputConfig > queryPathConfigForActivateOnToContainer;

  /**
   * Path from the container to the entity.
   */
  global List < ConnectApi.QueryPathInputConfig > queryPathConfigFromContainerToEntity;

}