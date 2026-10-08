/**
 * Contains methods for the Time primitive data type.
 * Usage
 * For more information on time, see <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.apexcode.meta/apexcode/langCon_apex_primitives.htm" target="_blank">Time Data Type</a>.
 */
global class Time {
    /**
     * Adds the specified number of hours to a Time.
     * Example
     * Time myTime = Time.newInstance(1, 2, 3, 4);
     * Time expected = Time.newInstance(4, 2, 3, 4);
     * System.assertEquals(expected, myTime.addHours(3));
     */
    global Time addHours(Integer hours) { return null; }

    /**
     * Adds the specified number of milliseconds to a Time.
     * Example
     * Time myTime = Time.newInstance(1, 2, 3, 0);
     * Time expected = Time.newInstance(1, 2, 4, 400);
     * System.assertEquals(expected, myTime.addMilliseconds(1400));
     */
    global Time addMilliseconds(Integer milliseconds) { return null; }

    /**
     * Adds the specified number of minutes to a Time.
     * Example
     * Time myTime = Time.newInstance(18, 30, 2, 20);
     * Integer myMinutes = myTime.minute();
     * myMinutes = myMinutes + 5;
     * System.assertEquals(myMinutes, 35);
     */
    global Time addMinutes(Integer minutes) { return null; }

    /**
     * Adds the specified number of seconds to a Time.
     * Example
     * Time myTime = Time.newInstance(1, 2, 55, 0);
     * Time expected = Time.newInstance(1, 3, 5, 0);
     * System.assertEquals(expected, myTime.addSeconds(10));
     */
    global Time addSeconds(Integer seconds) { return null; }

    global Boolean equals(Object obj) { return false; }

    global Integer hashCode() { return 0; }

    /**
     * Returns the hour component of a Time.
     * Example
     * Time myTime = Time.newInstance(18, 30, 2, 20);
     * myTime = myTime.addHours(2);
     * Integer myHour = myTime.hour();
     * System.assertEquals(myHour, 20);
     */
    global Integer hour() { return 0; }

    /**
     * Returns the millisecond component of a Time.
     * Example
     * Time myTime = Time.newInstance(3, 14, 15, 926);
     * System.assertEquals(926, myTime.millisecond());
     */
    global Integer millisecond() { return 0; }

    /**
     * Returns the minute component of a Time.
     * Example
     * Time myTime = Time.newInstance(3, 14, 15, 926);
     * System.assertEquals(14, myTime.minute());
     */
    global Integer minute() { return 0; }

    /**
     * Constructs a Time from Integer representations of the specified hour, minutes, seconds, and milliseconds. (UTC is assumed.)
     * Example
     * The following example creates a time of 18:30:2:20 (UTC).
     * Time myTime =
     * Time.newInstance(18, 30, 2, 20);
     */
    global static Time newInstance(Integer hour, Integer minute, Integer second, Integer millisecond) { return null; }

    /**
     * Returns the second component of a Time.
     * Example
     * Time myTime = Time.newInstance(3, 14, 15, 926);
     * System.assertEquals(15, myTime.second());
     */
    global Integer second() { return 0; }

    global String toString() { return null; }
}