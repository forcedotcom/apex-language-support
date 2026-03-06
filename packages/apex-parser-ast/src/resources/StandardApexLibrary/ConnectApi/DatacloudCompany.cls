/**
 * Information about a Data.com company.
 */
global class DatacloudCompany {

  /**
   * The number of active Data.com contacts who work in the company.
   */
  global Integer activeContacts;

  /**
   * The postal address for the company. This is typically a physical address that can include the city, state, street, and postal code.
   */
  global ConnectApi.Address address;

  /**
   * The amount of money that the company makes in one year. Annual revenue is measured in US dollars.
   */
  global Double annualRevenue;

  /**
   * A unique numerical identifier for the company. This is the Data.com identifier for a company.
   */
  global String companyId;

  /**
   * A brief synopsis of the company that provides a general overview of the company and what it does.
   */
  global String description;

  /**
   * A randomly generated nine-digit number that’s assigned by Dun & Bradstreet (D&B) to identify unique business establishments.
   */
  global String dunsNumber;

  /**
   * A description of the type of industry such as “Telecommunications,” “Agriculture,” or “Electronics.”
   */
  global String industry;

  /**
   * Indicates whether this company is active (true) or not (false). Inactive companies have out-of-date information in Data.com.
   */
  global Boolean isInactive;

  /**
   * True: You or your organization owns this company. False: Neither you nor your organization owns this company.
   */
  global Boolean isOwned;

  /**
   * North American Industry Classification System (NAICS) codes were created to provide more details about a business’s service orientation. The code descriptions are focused on what a business does.
   */
  global String naicsCode;

  /**
   * A description of the NAICS classification.
   */
  global String naicsDescription;

  /**
   * The name of the company.
   */
  global String name;

  /**
   * The number of employees who are working for the company.
   */
  global Integer numberOfEmployees;

  /**
   * The type of ownership of the company: Public Private Government Other
   */
  global String ownership;

  /**
   * The list of telephone numbers for the company, including the type. Here are some possible types of telephone numbers. Mobile Work Fax
   */
  global ConnectApi.PhoneNumber phoneNumbers;

  /**
   * Standard Industrial Codes (SIC) is a numbering convention that indicates what type of service a business provides. It’s a four-digit value.
   */
  global String sic;

  /**
   * A description of the SIC classification.
   */
  global String sicDescription;

  /**
   * Company’s site. For example, HQ, Single Location, or Branch. An organization status of the company. Branch: a secondary location to a headquarter location. Headquarter: the parent company has branches or subsidiaries. Single Location: a single business with no subsidiaries or branches.
   */
  global String site;

  /**
   * The symbol that uniquely identifies companies that are traded on public stock exchanges.
   */
  global String tickerSymbol;

  /**
   * A legal name under which a company conducts business.
   */
  global String tradeStyle;

  /**
   * The date of the most recent change to this company’s information.
   */
  global Datetime updatedDate;

  /**
   * The standard URL for the company’s home page.
   */
  global String website;

  /**
   * The year when the company was founded.
   */
  global String yearStarted;

}