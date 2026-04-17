/**
 * Contains methods to build an instance of the lxscheduler.WorkType class.
 */
global class WorkTypeBuilder {

  public lxscheduler.WorkType build() {}

  public lxscheduler.WorkTypeBuilder setBlockTimeAfterAppointmentInMinutes(Integer blockTimeAfterAppointmentInMinutes) {}

  public lxscheduler.WorkTypeBuilder setBlockTimeBeforeAppointmentInMinutes(Integer blockTimeBeforeAppointmentInMinutes) {}

  public lxscheduler.WorkTypeBuilder setDurationInMinutes(Integer durationInMinutes) {}

  public lxscheduler.WorkTypeBuilder setId(String id) {}

  public lxscheduler.WorkTypeBuilder setOperatingHoursId(String operatingHoursId) {}

  public lxscheduler.WorkTypeBuilder setSkillRequirements(List<lxscheduler.SkillRequirement> skillRequirements) {}

  public lxscheduler.WorkTypeBuilder setTimeFrameEndInMinutes(Integer timeFrameEndInMinutes) {}

  public lxscheduler.WorkTypeBuilder setTimeFrameStartInMinutes(Integer timeFrameStartInMinutes) {}

}