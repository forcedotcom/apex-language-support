/**
 * Contains methods to securely implement Apex applications.
 * <p>Usage
 * In the context of the current user’s create, read, update, or upsert access permission, use the Security class methods to:
 * Strip fields that aren’t visible from query and subquery results
 * Remove inaccessible fields before a DML operation without causing an exception
 * Sanitize SObjects that have been deserialized from an untrusted source
 */
global class Security {
    global Security() { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    /**
     * Creates a list of sObjects from the source records, which are stripped of fields that fail the field-level security checks for the current user.
     * <p>Example
     * In this example, the user doesn’t have permission to read the ActualCost field of a Campaign.
     * List<Campaign> campaigns = new List<Campaign>{
     *     new Campaign(Name='Campaign1', BudgetedCost=1000, ActualCost=2000),
     *     new Campaign(Name='Campaign2', BudgetedCost=4000, ActualCost=1500)
     * };
     * insert campaigns;
     *
     * // Strip fields that are not readable
     * SObjectAccessDecision decision = Security.stripInaccessible(
     *     AccessType.READABLE,
     *     [SELECT Name, BudgetedCost, ActualCost from Campaign]);
     *
     * // Print stripped records
     * for (SObject strippedCampaign : decision.getRecords()) {
     *     System.debug(strippedCampaign); // Does not display ActualCost
     * }
     *
     * // Print modified indexes
     * System.debug(decision.getModifiedIndexes());
     *
     * // Print removed fields
     * System.debug(decision.getRemovedFields());
     *
     * //Lines from output log
     * //|DEBUG|Campaign:{Name=Campaign1, BudgetedCost=1000, Id=701xx00000011nhAAA}
     * //|DEBUG|Campaign:{Name=Campaign2, BudgetedCost=4000, Id=701xx00000011niAAA}
     * //|DEBUG|{0, 1}
     * //|DEBUG|{Campaign={ActualCost}}
     */
    global static System.SObjectAccessDecision stripInaccessible(System.AccessType accessCheckType, List sourceRecords) { return null; }

    /**
     * Creates a list of sObjects from the source records, which are stripped of fields that fail the field-level security checks for the current user. The method also provides an option to enforce an object-level access check.
     * <p>Example
     * In this example, the user doesn’t have permission to create the Probability field of an Opportunity.
     * List<Opportunity> opportunities = new List<Opportunity>{
     *     new Opportunity(Name='Opportunity1'),
     *     new Opportunity(Name='Opportunity2', Probability=95)
     * };
     *
     * // Strip fields that are not creatable
     * SObjectAccessDecision decision = Security.stripInaccessible(
     *     AccessType.CREATABLE,
     *     opportunities);
     *
     * // Print stripped records
     * for (SObject strippedOpportunity : decision.getRecords()) {
     *     System.debug(strippedOpportunity);
     * }
     *
     * // Print modified indexes
     * System.debug(decision.getModifiedIndexes());
     *
     * // Print removed fields
     * System.debug(decision.getRemovedFields());
     *
     * //Lines from output log
     * //|DEBUG|Opportunity:{Name=Opportunity1}
     * //|DEBUG|Opportunity:{Name=Opportunity2}
     * //|DEBUG|{1}
     * //|DEBUG|{Opportunity={Probability}}
     */
    global static System.SObjectAccessDecision stripInaccessible(System.AccessType accessCheckType, List sourceRecords, Boolean enforceRootObjectCRUD) { return null; }

    /**
     * Creates a list of sObjects from the source records, which are stripped of fields that fail field-level and object-level access checks. Apex enforces field-level security (FLS) and object permissions as per the specified permission set, in addition to the running user’s permissions.
     */
    global static System.SObjectAccessDecision stripInaccessible(System.AccessType accessCheckType, List sourceRecords, Boolean enforceRootObjectCRUD, Id permissionSetId) { return null; }

    global override virtual String toString() { return null; }
}