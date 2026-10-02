/**
 * Allows an implementing class to check external calendar events to find already booked time slots for the requested service resources. This interface is part of Salesforce Scheduler.
 * <p>Usage
 * The lxscheduler.ServiceResourceScheduleHandler interface is called by Salesforce Scheduler APIs.
 * To implement this interface, you must first declare a class with the implements keyword as follows:
 * public class ServiceResourceScheduleHandlerImpl implements LxScheduler.ServiceResourceScheduleHandler{}
 * Next, your class must provide an implementation for the following method:
 * public static List<LxScheduler.ServiceResourceSchedule> getUnavailableTimeslots(LxScheduler.ServiceAppointmentRequestInfo requestInfo){
 *       //Your code here
 * }
 * The implemented method must be declared as global or public.
 */
global interface ServiceResourceScheduleHandler {
    virtual Boolean equals(Object arg0);

    /**
     * Passes the required information to get unavailable time slots from an external system. The implementation of this method returns the lxscheduler.ServiceResourceSchedule class.
     */
    abstract List getUnavailableTimeslots(lxscheduler.ServiceAppointmentRequestInfo info);

    virtual Integer hashCode();

    virtual String toString();
}