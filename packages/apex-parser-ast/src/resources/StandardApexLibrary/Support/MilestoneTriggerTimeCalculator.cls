/**
 * The Support.MilestoneTriggerTimeCalculator interface calculates the time trigger for a milestone.
 */
global interface MilestoneTriggerTimeCalculator {

  /**
   * Calculates the milestone trigger time based on the specified case and milestone type and returns the time in minutes.
   * @param caseId ID of the case the milestone is applied to.
   * @param milestoneTypeId ID of the milestone type.
   * @return Integer
   */
  Integer calculateMilestoneTriggerTime(String caseId, String milestoneTypeId);

}