/**
 * Enables you to set options related to DML operations.
 */
global class DMLOptions {

  global DMLOptions() {}

  global Boolean allowFieldTruncation;

  global AssignmentRuleHeader assignmentRuleHeader;

  global EmailHeader emailHeader;

  global LocaleOptions localeOptions;

  global Boolean optAllOrNone;

  global Object clone() {}

  /**
   * Enables setting assignment rule options.
   */
  global class AssignmentRuleHeader {

    global AssignmentRuleHeader() {}

    global Id assignmentRuleID;

    global Boolean useDefaultRule;

    global Object clone() {}

  }

  /**
   * Determines options for using duplicate rules to detect duplicate records. Duplicate rules are part of the Duplicate Management feature.
   */
  global class DuplicateRuleHeader {

    global DuplicateRuleHeader() {}

    global Boolean allowSave;

    global Boolean runAsCurrentUser;

    global Object clone() {}

  }

  /**
   * Enables setting email options.
   */
  global class EmailHeader {

    global EmailHeader() {}

    global Boolean triggerAutoResponseEmail;

    global Boolean triggerOtherEmail;

    global Boolean triggerUserEmail;

    global Object clone() {}

  }

}