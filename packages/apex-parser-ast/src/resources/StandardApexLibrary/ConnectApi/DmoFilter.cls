/**
 * Represents a DMO filter output.
 */
global class DmoFilter {

  /**
   * Filter for the entity.
   */
  global ConnectApi.BaseComparison entityFilter;

  /**
   * Type of DMO filter.
   */
  global String entityFilterType;

  /**
   * Entity name of the DMO filter.
   */
  global String entityName;

  /**
   * Limit for the DMO filter.
   */
  global ConnectApi.DmoFilterLimit filterLimit;

  /**
   * Inherited filter.
   */
  global ConnectApi.BaseComparison inheritedFilter;

  /**
   * Type of inherited filter.
   */
  global String inheritedFilterType;

  /**
   * Path from the activation to the container.
   */
  global List < ConnectApi.QueryPathConfigList > pathFromActivateOnToContainer;

  /**
   * Path from the container to the entity.
   */
  global List < ConnectApi.QueryPathConfigList > pathFromContainerToEntity;

}