/**
 * Contains methods to build an instance of the lxscheduler.WorkType class.
 * A Builder object is obtained by invoking one of the WorkTypeBuilder methods defined by the WorkType class.
 */
global without sharing class WorkTypeBuilder {
    global WorkTypeBuilder() { }

    /**
     * Returns an instance of the lxscheduler.WorkType object.
     */
    global lxscheduler.WorkType build() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    /**
     * Sets the time period, in minutes.
     */
    global lxscheduler.WorkTypeBuilder setBlockTimeAfterAppointmentInMinutes(Integer blockTimeAfterAppointmentInMinutes) { return null; }

    /**
     * Sets the time period, in minutes.
     */
    global lxscheduler.WorkTypeBuilder setBlockTimeBeforeAppointmentInMinutes(Integer blockTimeBeforeAppointmentInMinutes) { return null; }

    /**
     * Sets the event length.
     */
    global lxscheduler.WorkTypeBuilder setDurationInMinutes(Integer durationInMinutes) { return null; }

    /**
     * Sets the ID of the work type to the specified ID.
     */
    global lxscheduler.WorkTypeBuilder setId(String id) { return null; }

    /**
     * Sets the overlap of operating hours.
     */
    global lxscheduler.WorkTypeBuilder setOperatingHoursId(String operatingHoursId) { return null; }

    /**
     * Sets the skills that are required to complete a particular task for a work type.
     */
    global lxscheduler.WorkTypeBuilder setSkillRequirements(List skillRequirements) { return null; }

    /**
     * Sets the end of the timeframe.
     */
    global lxscheduler.WorkTypeBuilder setTimeFrameEndInMinutes(Integer timeFrameEndInMinutes) { return null; }

    /**
     * Sets the beginning of the timeframe.
     */
    global lxscheduler.WorkTypeBuilder setTimeFrameStartInMinutes(Integer timeFrameStartInMinutes) { return null; }

    global override virtual String toString() { return null; }
}