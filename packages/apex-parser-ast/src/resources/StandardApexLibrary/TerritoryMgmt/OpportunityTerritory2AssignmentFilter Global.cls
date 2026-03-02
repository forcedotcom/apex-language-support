/**
 * Apex interface that allows an implementing class to assign a single territory to an opportunity.
 */
public interface OpportunityTerritory2AssignmentFilter Global {

  /**
   * Returns the mapping of opportunities to territory IDs. When Salesforce invokes this method, it supplies the list of opportunity IDs, except for opportunities that have been excluded from territory assignment (IsExcludedFromTerritory2Filter=false).
   * @param opportunityIds Opportunity IDs.
   * @return Map<Id,Id>
   */
  Map<Id,Id> getOpportunityTerritory2Assignments(List<Id> opportunityIds);

}