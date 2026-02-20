/**
 * Tests the specific GeocodingService pattern that was causing false positives.
 * Reproduces the exact scenario: List<Coordinates>.add(coords) where coords is Coordinates.
 */
public class GeocodingServiceListAdd {
    public class Coordinates {
        public Decimal lat;
        public Decimal lon;
    }

    public void geocodeAddresses() {
        List<Coordinates> computedCoordinates = new List<Coordinates>();
        
        Coordinates coords = new Coordinates();
        coords.lat = 37.7749;
        coords.lon = -122.4194;
        
        // This should NOT produce method.does.not.support.parameter.type error
        // The generic type parameter T should be resolved to Coordinates
        computedCoordinates.add(coords);
    }
}
