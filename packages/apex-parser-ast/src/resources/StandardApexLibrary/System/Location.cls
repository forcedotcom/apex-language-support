/**
 * Contains methods for accessing the component fields of geolocation compound fields.
 * <p>Usage
 * Each of these methods is also equivalent to a read-only property. For each getter method you can access the property using dot notation. For example, myLocation.getLatitude() is equivalent to myLocation.latitude.
 * You can’t use dot notation to access compound fields’ subfields directly on the parent field. Instead, assign the parent field to a variable of type Location, and then access its components.
 * Location loc = myAccount.MyLocation__c;
 * Double lat = loc.latitude;
 * Important
 * “Location” in Salesforce can also refer to the Location standard object. When referencing the Location object in your Apex code, always use Schema.Location instead of Location to prevent confusion with the standard Location compound field. If referencing both the location object and the Location field in the same snippet, you can differentiate between the two by using System.Location for the field and Schema.Location for the object.
 * <p>Example
 * // Select and access the Location field. MyLocation__c is the name of a geolocation field on Account.
 * Account[] records = [SELECT id, MyLocation__c FROM Account WITH USER_MODE LIMIT 10];
 * for(Account acct : records) {
 *    Location loc = acct.MyLocation__c;
 *    Double lat = loc.latitude;
 *    Double lon = loc.longitude;
 * }
 *
 * // Instantiate new Location objects and compute the distance between them in different ways.
 * Location loc1 = Location.newInstance(28.635308,77.22496);
 * Location loc2 = Location.newInstance(37.7749295,-122.4194155);
 * Double dist = Location.getDistance(loc1, loc2, 'mi');
 * Double dist2 = loc1.getDistance(loc2, 'mi');
 */
global class Location {
    global Double latitude { get; }
    global Double longitude { get; }

    global Location() { }

    global Boolean equals(Object obj) { return false; }

    global Double getDistance(System.Location other, String unit) { return 0.0; }

    /**
     * Returns the latitude field of this location.
     */
    global Double getLatitude() { return 0.0; }

    /**
     * Returns the longitude field of this location.
     */
    global Double getLongitude() { return 0.0; }

    global Integer hashCode() { return 0; }

    global String toString() { return null; }
}