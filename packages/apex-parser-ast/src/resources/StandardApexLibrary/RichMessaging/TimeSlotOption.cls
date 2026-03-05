/**
 * Represents a complex time slot option type. This class is used to provide time option payloads that can be translated to structured content payloads in rich content messages.
 */
global class TimeSlotOption {

  public TimeSlotOption(Datetime startTime, Datetime endTime) {}

  public TimeSlotOption(Datetime startTime, Integer duration) {}

}