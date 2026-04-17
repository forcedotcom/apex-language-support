/**
 * Use the BusinessHours methods to set the business hours at which your customer support team operates.
 */
global class BusinessHours {

  /**
   * Adds an interval of time from a start Datetime traversing business hours only. Returns the result Datetime in the local time zone.
   * @param businessHoursId 
   * @param startDate 
   * @param intervalMilliseconds Interval value should be provided in milliseconds, however time precision smaller than one minute is ignored.
   * @return Datetime
   */
  public static Datetime add(String businessHoursId, Datetime startDate, Long intervalMilliseconds) {}

  /**
   * Adds an interval of milliseconds from a start Datetime traversing business hours only. Returns the result Datetime in GMT.
   * @param businessHoursId 
   * @param startDate 
   * @param intervalMilliseconds 
   * @return Datetime
   */
  public static Datetime addGmt(String businessHoursId, Datetime startDate, Long intervalMilliseconds) {}

  /**
   * Returns the difference in milliseconds between a start and end Datetime based on a specific set of business hours.
   * @param businessHoursId 
   * @param startDate 
   * @param endDate 
   * @return Long
   */
  public static Long diff(String businessHoursId, Datetime startDate, Datetime endDate) {}

  /**
   * Returns true if the specified target date occurs within business hours. Holidays are included in the calculation.
   * @param businessHoursId The business hours ID.
   * @param targetDate The date to verify.
   * @return Boolean
   */
  public static Boolean isWithin(String businessHoursId, Datetime targetDate) {}

  /**
   * Starting from the specified target date, returns the next date when business hours are open. If the specified target date falls within business hours, this target date is returned.
   * @param businessHoursId The business hours ID.
   * @param targetDate The date used as a start date to obtain the next date.
   * @return Datetime
   */
  public static Datetime nextStartDate(String businessHoursId, Datetime targetDate) {}

}