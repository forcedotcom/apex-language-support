/**
 * The Support.MilestoneTriggerTimeCalculator interface calculates the time trigger for a milestone.
 * <p>Implement the Support.MilestoneTriggerTimeCalculator interface to calculate a dynamic time trigger for a milestone based on the milestone type, the properties of the case, and case-related objects. To implement the Support.MilestoneTriggerTimeCalculator interface, you must first declare a class with the implements keyword as follows:
 * global class Employee implements Support.MilestoneTriggerTimeCalculator {
 * Next, your class must provide an implementation for the following method:
 * global Integer calculateMilestoneTriggerTime(String caseId, String milestoneTypeId)
 * The implemented method must be declared as global or public.
 */
global interface MilestoneTriggerTimeCalculator {
    /**
     * Calculates the milestone trigger time based on the specified case and milestone type and returns the time in minutes.
     * @return Integer The calculated trigger time in minutes.
     */
    abstract Integer calculateMilestoneTriggerTime(String caseId, String milestoneTypeId);

    virtual Boolean equals(Object arg0);

    virtual Integer hashCode();

    virtual String toString();
}