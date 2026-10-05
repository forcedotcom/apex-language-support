/**
 * Use the BusinessHours methods to set the business hours at which your customer support team operates.
 */
global class BusinessHours {
    global BusinessHours() { }

    global static Datetime add(Id businessHoursId, Datetime startDate, Long interval) { return null; }

    global static Datetime addGmt(Id businessHoursId, Datetime startDate, Long interval) { return null; }

    /**
     * Returns the difference in milliseconds between a start and end Datetime based on a specific set of business hours.
     */
    global static Long diff(String businessHoursId, Datetime startDate, Datetime endDate) { return 0L; }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    /**
     * Returns true if the specified target date occurs within business hours. Holidays are included in the calculation.
     * <p>Example
     * The following example finds whether a given time is within the default business hours.
     * // Get the default business hours
     * BusinessHours bh = [SELECT Id FROM BusinessHours WHERE IsDefault=true];
     *
     * // Create Datetime on May 28, 2013 at 1:06:08 AM in the local timezone.
     * Datetime targetTime = Datetime.newInstance(2013, 5, 28, 1, 6, 8);
     *
     * // Find whether the time is within the default business hours
     * Boolean isWithin= BusinessHours.isWithin(bh.id, targetTime);
     */
    global static Boolean isWithin(String businessHoursId, Datetime targetDate) { return false; }

    global static Datetime nextStartDate(Id businessHoursId, Datetime targetDate) { return null; }

    global override virtual String toString() { return null; }
}