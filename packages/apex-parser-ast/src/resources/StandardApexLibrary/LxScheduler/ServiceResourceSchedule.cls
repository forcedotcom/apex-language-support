/**
 * Use this class to pass results from your implemented Apex class to the ServiceResourceScheduleHandler interface methods.
 */
global class ServiceResourceSchedule {

  public ServiceResourceSchedule(String serviceResourceId, Set<lxscheduler.UnavailableTimeslot> unavailableTimeslots) {}

  public String serviceResourceId;

  public Set<lxscheduler.UnavailableTimeslot> unavailableTimeslots;

  global Object clone() {}

}