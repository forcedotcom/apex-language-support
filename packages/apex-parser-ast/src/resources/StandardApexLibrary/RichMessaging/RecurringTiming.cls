/**
 * Represents a payment that occurs on a regular basis.
 */
global class RecurringTiming {

  global RecurringTiming(Date startDate, Date endDate, Integer intervalCount, RichMessaging.TimingIntervalUnit intervalUnit) {}

  global Date endDate;

  global Date endDateValue;

  global Integer intervalCount;

  global Integer intervalCountValue;

  global String intervalUnit;

  global RichMessaging.TimingIntervalUnit intervalUnitValue;

  global Date startDate;

  global Date startDateValue;

  global String timingType;

  global Object clone() {}

}