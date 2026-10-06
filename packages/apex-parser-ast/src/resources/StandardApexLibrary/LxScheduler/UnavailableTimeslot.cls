/**
 * Use this class to pass the unavailable time slots to the lxscheduler.ServiceResourceSchedule class. Timezones that differ across operating hours are handled and results are always returned in UTC.
 */
global with sharing class UnavailableTimeslot {
    /**
     * End time of an unavailable time slot.
     * Datetime
     */
    global Datetime timeMax { get; set; }
    /**
     * Start time of an unavailable time slot.
     * Datetime
     */
    global Datetime timeMin { get; set; }

    /**
     * Creates an instance of lxscheduler.UnavailableTimeslot class.
     */
    global UnavailableTimeslot(Datetime timeMin, Datetime timeMax) { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}