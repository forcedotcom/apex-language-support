/**
 * Use this class to pass the unavailable time slots to the lxscheduler.ServiceResourceSchedule class. Timezones that differ across operating hours are handled and results are always returned in UTC.
 */
global class UnavailableTimeslot {

  public UnavailableTimeslot(Datetime timeMin, Datetime timeMax) {}

}