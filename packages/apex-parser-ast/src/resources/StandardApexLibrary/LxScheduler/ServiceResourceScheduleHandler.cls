/**
 * Allows an implementing class to check external calendar events to find already booked time slots for the requested service resources. This interface is part of Salesforce Scheduler.
 */
public interface ServiceResourceScheduleHandler {

  /**
   * Passes the required information to get unavailable time slots from an external system. The implementation of this method returns the lxscheduler.ServiceResourceSchedule class.
   * @param var1 Represents the list of parameters that are passed to the ServiceResourceScheduleHandler interface.
   * @return List<lxscheduler.ServiceResourceSchedule>
   */
  List<lxscheduler.ServiceResourceSchedule> getUnavailableTimeslots(lxscheduler.ServiceAppointmentRequestInfo var1);

}