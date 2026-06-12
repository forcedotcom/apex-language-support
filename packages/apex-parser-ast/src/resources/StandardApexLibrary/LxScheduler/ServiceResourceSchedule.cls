/**
 * Use this class to pass results from your implemented Apex class to the ServiceResourceScheduleHandler interface methods.
 */
global class ServiceResourceSchedule {

  global ServiceResourceSchedule(String serviceResourceId, Set<lxscheduler.UnavailableTimeslot> unavailableTimeslots) {}

  global String serviceResourceId;

  global Set<lxscheduler.UnavailableTimeslot> unavailableTimeslots;

  global Object clone() {}

}