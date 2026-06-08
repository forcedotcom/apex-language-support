/**
 * Represents a payment that occurs on a regular basis.
 */
global class RecurringTiming {

  public RecurringTiming(Date startDate, Date endDate, Integer intervalCount, RichMessaging.TimingIntervalUnit intervalUnit) {}

  public Date endDate;

  public Date endDateValue;

  public Integer intervalCount;

  public Integer intervalCountValue;

  public String intervalUnit;

  public RichMessaging.TimingIntervalUnit intervalUnitValue;

  public Date startDate;

  public Date startDateValue;

  public String timingType;

  global Object clone() {}

}