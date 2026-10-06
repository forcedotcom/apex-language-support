/**
 * Contains methods for accessing the component fields of address compound fields.
 * Usage
 * Each of these methods is also equivalent to a read-only property. For each getter method, you can access the property using dot notation. For example, myAddress.getCity() is equivalent to myAddress.city.
 * You can’t use dot notation to access compound fields’ subfields directly on the parent field. Instead, assign the parent field to a variable of type Address, and then access its components. For example, to access the City field in myAccount.BillingAddress, do the following:
 * Address addr = myAccount.BillingAddress;
 * String acctCity = addr.City;
 * Important
 * “Address” in Salesforce can also refer to the Address standard object. When referencing the Address object in your Apex code, always use Schema.Address instead of Address to prevent confusion with the standard Address compound field. If referencing both the Address object and the Address standard field in the same snippet, you can differentiate between the two by using System.Address for the field and Schema.Address for the object.
 * Example
 * // Select and access Address fields.
 * // Call the getDistance() method in different ways.
 * Account[] records = [SELECT Id, BillingAddress FROM Account WITH USER_MODE LIMIT 10];
 * for(Account acct : records) {
 *    Address addr = acct.BillingAddress;
 *    Double lat = addr.latitude;
 *    Double lon = addr.longitude;
 *    Location loc1 = Location.newInstance(30.1944,-97.6682);
 *    Double apexDist1 = addr.getDistance(loc1, 'mi');
 *    Double apexDist2 = loc1.getDistance(addr, 'mi');
 *    Assert.areEqual(apexDist1, apexDist2);
 *    Double apexDist3 = Location.getDistance(addr, loc1, 'mi');
 *    Assert.areEqual(apexDist2, apexDist3);
 * }
 */
global class Address extends System.Location {
    global String city { get; }
    global String country { get; }
    global String countrycode { get; }
    global String geocodeaccuracy { get; }
    global String postalcode { get; }
    global String state { get; }
    global String statecode { get; }
    global String street { get; }

    global Address() { }

    global Boolean equals(Object obj) { return false; }

    /**
     * Returns the city field of this address.
     */
    global String getCity() { return null; }

    /**
     * Returns the text-only country/territory name component of this address.
     */
    global String getCountry() { return null; }

    /**
     * Returns the country/territory code of this address if state and country/territory picklists are enabled in your organization. Otherwise, returns null.
     */
    global String getCountryCode() { return null; }

    global Double getDistance(System.Location other, String unit) { return 0.0; }

    /**
     * When using geolocation data for a given address, this method gives you relative location information based on latitude and longitude values. For example, you can find out if the latitude and longitude values point to the middle of the street, instead of the exact address.
     * @return The getGeocodeAccuracy() return value tells you more about the location at a latitude and longitude for a given address. For example, Zip means the latitude and longitude point to the center of the zip code area, in case a match for an exact street address can’t be found.
     * Accuracy Value Description
     * Address In the same building
     * NearAddress Near the address
     * Block Midway point of the block
     * Street Midway point of the street
     * ExtendedZip Center of the extended zip code area
     * Zip Center of the zip code area
     * Neighborhood Center of the neighborhood
     * City Center of the city
     * County Center of the county
     * State Center of the state
     * Unknown No match for the address was found
     * Geocodes are added only for some standard addresses.
     * Billing Address on accounts
     * Shipping Address on accounts
     * Mailing Address on contacts
     * Address on leads
     * Person accounts are not supported.
     * Note
     * For getGeocodeAccuracy() to work, set up and activate the geocode data integration rules for the related address fields.
     */
    global String getGeocodeAccuracy() { return null; }

    /**
     * Returns the latitude field of this address.
     */
    global Double getLatitude() { return 0.0; }

    /**
     * Returns the longitude field of this address.
     */
    global Double getLongitude() { return 0.0; }

    /**
     * Returns the postal code of this address.
     */
    global String getPostalCode() { return null; }

    /**
     * Returns the text-only state name component of this address.
     */
    global String getState() { return null; }

    /**
     * Returns the state code of this address if state and country/territory picklists are enabled in your organization. Otherwise, returns null.
     */
    global String getStateCode() { return null; }

    /**
     * Returns the street field of this address.
     */
    global String getStreet() { return null; }

    global Integer hashCode() { return 0; }

    global String toString() { return null; }
}