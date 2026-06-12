/**
 * Contains methods that holds the business logic to get resources availability.
 */
global class SchedulerResources {

  global SchedulerResources() {}

  global static String getAppointmentCandidates(lxscheduler.GetAppointmentCandidatesInput getAppointmentCandidatesInput) {}

  global static String getAppointmentSlots(lxscheduler.GetAppointmentSlotsInput getAppointmentSlotsInput) {}

  global static void setAppointmentCandidatesMock(String expectedResponse) {}

  global static void setAppointmentSlotsMock(String expectedResponse) {}

  global Object clone() {}

}