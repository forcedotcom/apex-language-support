/**
 * Information about a Data.com contact.
 */
global class DatacloudContact {

  /**
   * The contact’s business address.
   */
  global ConnectApi.Address address;

  /**
   * A unique numerical identifier for the company where the contact works. This is the Data.com identifier for a company.
   */
  global String companyId;

  /**
   * The company name where the contact works.
   */
  global String companyName;

  /**
   * A unique numerical identifier for the contact. This is the Data.com identifier for a contact.
   */
  global String contactId;

  /**
   * The department in the company where the contact works. Here are some possible departments. Engineering IT Marketing Sales
   */
  global String department;

  /**
   * The most current business email address for the contact.
   */
  global String email;

  /**
   * The first name of the contact.
   */
  global String firstName;

  /**
   * Whether this contact is active (true) or not (false). Inactive contacts have out-of-date information in Data.com.
   */
  global Boolean isInactive;

  /**
   * Whether this contact is owned (true) or not (false).
   */
  global Boolean isOwned;

  /**
   * The last name of the contact.
   */
  global String lastName;

  /**
   * A human resource label that designates a person’s level in the company. Here are some possible levels. C-Level Director Manager Staff
   */
  global String level;

  /**
   * Telephone numbers for the contact, which can include direct-dial business telephone numbers, mobile telephone numbers, and business headquarters telephone numbers. The type of telephone number is also indicated.
   */
  global ConnectApi.PhoneNumber phoneNumbers;

  /**
   * The title of the contact, such as CEO or Vice President.
   */
  global String title;

  /**
   * The date of the most recent change to this contact’s information.
   */
  global Datetime updatedDate;

}