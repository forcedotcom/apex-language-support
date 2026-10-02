/**
 * Apex interface that allows an implementing class to assign a single territory to an opportunity.
 * <p>Usage
 * Method called by Opportunity Territory Assignment job to assign territory to opportunity. Input is a list of (up to 1000) opportunityIds that have IsExcludedFromTerritory2Filter=false. Returns a map of OpportunityId to Territory2Id, which is used to update the Territory2Id field on the Opportunity object.
 */
global interface OpportunityTerritory2AssignmentFilter {
    virtual Boolean equals(Object arg0);

    /**
     * Returns the mapping of opportunities to territory IDs. When Salesforce invokes this method, it supplies the list of opportunity IDs, except for opportunities that have been excluded from territory assignment (IsExcludedFromTerritory2Filter=false).
     * @return A key value pair associating each Territory ID to an Opportunity ID.
     */
    abstract Map getOpportunityTerritory2Assignments(List opportunityIds);

    virtual Integer hashCode();

    virtual String toString();
}