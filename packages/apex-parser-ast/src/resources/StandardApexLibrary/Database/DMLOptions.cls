/**
 * Enables you to set options related to DML operations.
 */
global class DMLOptions {

  global DMLOptions() {}

  public Boolean allowFieldTruncation;

  public AssignmentRuleHeader assignmentRuleHeader;

  public EmailHeader emailHeader;

  public LocaleOptions localeOptions;

  public Boolean optAllOrNone;

  global Object clone() {}

  /**
   * Enables setting assignment rule options.
   */
  global class AssignmentRuleHeader {

    global AssignmentRuleHeader() {}

    public Id assignmentRuleID;

    public Boolean useDefaultRule;

    global Object clone() {}

  }

  /**
   * Determines options for using duplicate rules to detect duplicate records. Duplicate rules are part of the Duplicate Management feature.
   */
  global class DuplicateRuleHeader {

    global DuplicateRuleHeader() {}

    public Boolean allowSave;

    public Boolean runAsCurrentUser;

    global Object clone() {}

  }

  /**
   * Enables setting email options.
   */
  global class EmailHeader {

    global EmailHeader() {}

    public Boolean triggerAutoResponseEmail;

    public Boolean triggerOtherEmail;

    public Boolean triggerUserEmail;

    global Object clone() {}

  }

}