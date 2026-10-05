/**
 * Use this class to pass results from your implemented Apex class to the ServiceResourceScheduleHandler interface methods.
 */
global with sharing class ServiceResourceSchedule {
    /**
     * Record ID of the service resource.
     * <p>String
     */
    global String serviceResourceId { get; set; }
    /**
     * An instance of lxscheduler.UnavailableTimeslot class.
     * <p>Set<lxscheduler.UnavailableTimeslot>
     */
    global Set unavailableTimeslots { get; set; }

    /**
     * Creates a new instance of lxscheduler.ServiceResourceSchedule class.
     */
    global ServiceResourceSchedule(String serviceResourceId, Set unavailableTimeslots) { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}